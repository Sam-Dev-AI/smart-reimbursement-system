import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
from pathlib import Path

class FirebaseService:
    def __init__(self):
        self.db = None
        self._initialize_sdk()

    def _initialize_sdk(self):
        """Initializes the Firebase Admin SDK using the service account key."""
        try:
            current_dir = Path(__file__).parent.parent
            cred_path = current_dir / "config" / "serviceAccountKey.json"
            if not firebase_admin._apps:
                cred = credentials.Certificate(str(cred_path))
                firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            print("Successfully initialized Firebase Admin SDK.")
        except Exception as e:
            print(f"Error initializing Firebase Admin SDK: {e}")
            raise e

    # ══════════════════════════════════════════════════════════════
    # SYSTEM INITIALIZATION
    # ══════════════════════════════════════════════════════════════
    def is_system_initialized(self):
        """Checks if there's at least one user in the database."""
        try:
            docs = self.db.collection('users').limit(1).get()
            return len(docs) > 0
        except Exception as e:
            print(f"Error checking system initialization: {e}")
            return False

    # ══════════════════════════════════════════════════════════════
    def get_user_role(self, uid):
        try:
            doc = self.db.collection('users').document(uid).get()
            if doc.exists:
                return doc.to_dict().get('role', 'employee')
            return 'employee'
        except Exception as e:
            print(f"Error fetching user role: {e}")
            return 'employee'

    def get_user_data(self, uid):
        try:
            doc = self.db.collection('users').document(uid).get()
            if doc.exists:
                data = doc.to_dict()
                data['uid'] = uid
                return data
            return {}
        except Exception as e:
            print(f"Error fetching user data: {e}")
            return {}

    def update_user_role(self, uid, new_role):
        try:
            self.db.collection('users').document(uid).update({
                'role': new_role,
                'status': 'active'
            })
        except Exception as e:
            print(f"Error updating role: {e}")
            raise e

    def create_user_by_admin(self, user_data, company_id):
        """Admin creates a new user via Firebase Auth + Firestore."""
        try:
            # Create Firebase Auth user
            user_record = auth.create_user(
                email=user_data['email'],
                password=user_data.get('password', 'Welcome@123'),
                display_name=user_data.get('fullName', '')
            )
            uid = user_record.uid

            # Create Firestore doc
            self.db.collection('users').document(uid).set({
                'fullName': user_data.get('fullName', ''),
                'email': user_data['email'],
                'companyId': company_id,
                'role': user_data.get('role', 'employee'),
                'managerId': user_data.get('managerId', ''),
                'status': 'active',
                'createdAt': firestore.SERVER_TIMESTAMP
            })
            return uid
        except Exception as e:
            print(f"Error creating user by admin: {e}")
            raise e

    def assign_manager(self, employee_uid, manager_uid):
        """Assigns a manager to an employee."""
        try:
            self.db.collection('users').document(employee_uid).update({
                'managerId': manager_uid
            })
        except Exception as e:
            print(f"Error assigning manager: {e}")
            raise e

    # ══════════════════════════════════════════════════════════════
    # COMPANY OPERATIONS
    # ══════════════════════════════════════════════════════════════
    def get_company_data(self, company_id):
        try:
            if not company_id:
                return {}
            doc = self.db.collection('companies').document(company_id).get()
            if doc.exists:
                data = doc.to_dict()
                data['id'] = company_id
                return data
            return {}
        except Exception as e:
            print(f"Error fetching company: {e}")
            return {}

    def update_company(self, company_id, update_data):
        """Updates company profile fields."""
        try:
            self.db.collection('companies').document(company_id).update(update_data)
        except Exception as e:
            print(f"Error updating company: {e}")
            raise e

    def get_company_employees(self, company_id):
        try:
            if not company_id:
                return []
            docs = self.db.collection('users').where('companyId', '==', company_id).stream()
            employees = []
            for doc in docs:
                data = doc.to_dict()
                data['uid'] = doc.id
                if 'createdAt' in data and data['createdAt']:
                    data['createdAt'] = str(data['createdAt'])
                employees.append(data)
            return employees
        except Exception as e:
            print(f"Error fetching employees: {e}")
            return []

    # ══════════════════════════════════════════════════════════════
    # APPROVAL WORKFLOW OPERATIONS
    # ══════════════════════════════════════════════════════════════
    def save_approval_workflow(self, company_id, workflow_data):
        """Saves or updates the approval workflow configuration."""
        try:
            ref = self.db.collection('companies').document(company_id).collection('settings').document('approval_workflow')
            ref.set(workflow_data, merge=True)
        except Exception as e:
            print(f"Error saving workflow: {e}")
            raise e

    def get_approval_workflow(self, company_id):
        """Gets the approval workflow configuration."""
        try:
            ref = self.db.collection('companies').document(company_id).collection('settings').document('approval_workflow')
            doc = ref.get()
            if doc.exists:
                return doc.to_dict()
            return {
                'steps': [
                    {'role': 'manager', 'label': 'Direct Manager', 'description': 'First level approval'},
                ],
                'isManagerFirst': True,
                'thresholdRules': [],
                'advancedRules': {
                    'percentageRequired': 100,
                    'autoApprover': '',
                    'autoApproveLimit': 0
                }
            }
        except Exception as e:
            print(f"Error fetching workflow: {e}")
            return {}

    # ══════════════════════════════════════════════════════════════
    # EXPENSE OPERATIONS
    # ══════════════════════════════════════════════════════════════
    def get_all_expenses(self, company_id):
        """Gets all expenses for a company (Admin oversight)."""
        try:
            if not company_id:
                return []
            docs = self.db.collection('expenses').where('companyId', '==', company_id).order_by('createdAt', direction=firestore.Query.DESCENDING).stream()
            expenses = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                if 'createdAt' in data and data['createdAt']:
                    data['createdAt'] = str(data['createdAt'])
                expenses.append(data)
            return expenses
        except Exception as e:
            print(f"Error fetching expenses: {e}")
            return []

    def override_expense(self, expense_id, action, admin_uid):
        """Admin force approve/reject an expense."""
        try:
            self.db.collection('expenses').document(expense_id).update({
                'status': action,
                'overriddenBy': admin_uid,
                'overriddenAt': firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            print(f"Error overriding expense: {e}")
            raise e

    # ══════════════════════════════════════════════════════════════
    # SIGNUP / REGISTRATION
    # ══════════════════════════════════════════════════════════════
    def create_user_with_role(self, uid, user_data):
        """First user for a company becomes Admin."""
        try:
            company_name = user_data.get('companyName')
            if not company_name:
                raise ValueError("Company Name is required for signup.")
            company_id = company_name.strip().lower().replace(" ", "-")
            company_ref = self.db.collection('companies').document(company_id)
            company_doc = company_ref.get()

            if not company_doc.exists:
                role = "admin"
                company_ref.set({
                    'name': user_data.get('companyName'),
                    'country': user_data.get('country'),
                    'baseCurrency': user_data.get('currency'),
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'adminUid': uid
                })
            else:
                role = "employee"

            self.db.collection('users').document(uid).set({
                'fullName': user_data.get('fullName'),
                'email': user_data.get('email'),
                'companyId': company_id,
                'role': role,
                'managerId': '',
                'createdAt': firestore.SERVER_TIMESTAMP,
                'status': 'active' if role == 'admin' else 'pending'
            })
            return role
        except Exception as e:
            print(f"Error creating user/company: {e}")
            raise e

# Global instance
firebase_service = FirebaseService()
