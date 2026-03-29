import os
from datetime import datetime, timedelta
import collections
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

    def _serialize_expense_timestamps(self, data):
        """Standardized conversion of all Firestore timestamps to strings for JSON responses."""
        if not data: return data
        ts_fields = ['createdAt', 'updatedAt', 'finalizedAt', 'overriddenAt', 'lastUpdatedAt']
        for field in ts_fields:
            if field in data and data[field]:
                data[field] = str(data[field])
        
        # Handle the nested approvals map timestamps if they exist
        if 'approvals' in data and isinstance(data['approvals'], dict):
            for uid, approval in data['approvals'].items():
                if isinstance(approval, dict) and 'timestamp' in approval and approval['timestamp']:
                    approval['timestamp'] = str(approval['timestamp'])
        
        return data

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

    def get_company_workflow(self, company_id):
        """Retrieves the approval workflow for a specific company."""
        try:
            workflow_ref = self.db.collection('workflows').document(company_id)
            doc = workflow_ref.get()
            if doc.exists:
                return doc.to_dict()
            return {'steps': []}
        except Exception as e:
            print(f"Error fetching company workflow: {e}")
            return {'steps': []}

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
            
            # Memory sort
            employees.sort(key=lambda x: str(x.get('createdAt', '')), reverse=True)
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

    def assign_finance_to_manager(self, manager_uid, finance_uid):
        """Maps a Finance user to a Manager (Many-to-One)."""
        try:
            self.db.collection('users').document(manager_uid).update({
                'assignedFinanceId': finance_uid
            })
        except Exception as e:
            print(f"Error assigning finance to manager: {e}")
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
            # Removed order_by to avoid composite index requirement
            docs = self.db.collection('expenses').where('companyId', '==', company_id).stream()
            expenses = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                data = self._serialize_expense_timestamps(data)
                expenses.append(data)
            
            # Sort in memory
            expenses.sort(key=lambda x: str(x.get('createdAt', '')), reverse=True)
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

    def submit_approval(self, expense_id, approver_uid, action, company_id, comment=None):
        """Processes a standard approval action and triggers the hybrid evaluation engine."""
        try:
            expense_ref = self.db.collection('expenses').document(expense_id)
            
            # Record the approval action with optional comment
            update_data = {
                f"approvals.{approver_uid}": {
                    'action': action,
                    'comment': comment,
                    'timestamp': firestore.SERVER_TIMESTAMP
                },
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            
            # If it's a rejection, we might want to store the rejection comment specifically
            if action == 'rejected':
                update_data['rejectionComment'] = comment
                update_data['status'] = 'rejected'
            elif action == 'escalated':
                update_data['status'] = 'pending_finance' # Default escalation to Finance
                update_data['escalatedBy'] = approver_uid
            
            expense_ref.update(update_data)
            
            return self.evaluate_expense_status(expense_id, company_id)
            
        except Exception as e:
            print(f"Error submitting approval: {e}")
            raise e

    def evaluate_expense_status(self, expense_id, company_id):
        """
        Evaluates the current status based on Threshold Logic:
        1. Manager Approval
        2. Finance Approval (ONLY if expense amount > threshold AND Finance is assigned)
        """
        try:
            expense_ref = self.db.collection('expenses').document(expense_id)
            expense = expense_ref.get().to_dict()
            if not expense: return
            
            submitter_uid = expense.get('submittedBy')
            submitter_data = self.get_user_data(submitter_uid)
            manager_uid = submitter_data.get('managerId')
            
            # Get the manager's assigned finance person
            manager_data = self.get_user_data(manager_uid) if manager_uid else {}
            assigned_finance_uid = manager_data.get('assignedFinanceId')

            # Fetch workflow config (now expects a financeThreshold property)
            workflow = self.get_approval_workflow(company_id)
            finance_threshold = float(workflow.get('financeThreshold', 0))
            
            # Fallback: Check if there's a global auto-approver/finance head in the workflow settings
            global_finance_uid = workflow.get('advancedRules', {}).get('autoApprover')
            final_finance_uid = assigned_finance_uid or global_finance_uid
            
            # Extract plain action strings for easy checking
            # Handle both string values (legacy) and dict values (new format)
            actions = {}
            approvals_data = expense.get('approvals', {})
            for uid, val in approvals_data.items():
                if isinstance(val, dict):
                    actions[uid] = val.get('action')
                else:
                    actions[uid] = val
                    
            # Check rejection first
            if 'rejected' in actions.values():
                expense_ref.update({'status': 'rejected'})
                return 'rejected'

            # 1. Check Manager Approval
            manager_approved = manager_uid and actions.get(manager_uid) == 'approved'
            
            if manager_approved:
                amount = float(expense.get('amount', 0))
                
                # Rule: Only route to finance if amount > threshold AND a finance authority exists
                if amount > finance_threshold and final_finance_uid:
                    # Waiting for Finance
                    if actions.get(final_finance_uid) == 'approved':
                        expense_ref.update({'status': 'approved', 'finalizedAt': firestore.SERVER_TIMESTAMP})
                        return 'approved'
                    else:
                        expense_ref.update({'status': 'pending_finance'})
                        return 'pending_finance'
                else:
                    # Under threshold (or no finance assigned by admin) - instantly approve!
                    expense_ref.update({'status': 'approved', 'finalizedAt': firestore.SERVER_TIMESTAMP})
                    return 'approved'
            
            return 'pending'
        except Exception as e:
            print(f"Error evaluating expense status: {e}")
            return 'error'

    def get_pending_approvals(self, uid, role):
        """Gets expenses waiting for action from a specific user based on their role."""
        try:
            user_data = self.get_user_data(uid)
            company_id = user_data.get('companyId')
            
            if role == 'manager':
                # Direct reports' pending expenses specifically waiting for Manager approval
                docs = self.db.collection('expenses') \
                    .where('companyId', '==', company_id) \
                    .where('status', '==', 'pending_manager') \
                    .stream()
                
                # Filter locally for managerId match
                results = []
                for doc in docs:
                    exp = doc.to_dict()
                    # Skip if manager already acted (safety check)
                    if uid in exp.get('approvals', {}): continue
                    
                    submitter = self.get_user_data(exp.get('submittedBy'))
                    if submitter.get('managerId') == uid:
                        exp['id'] = doc.id
                        exp = self._serialize_expense_timestamps(exp)
                        results.append(exp)
                return results

            elif role == 'finance':
                # Expenses approved by manager but waiting for this finance user
                docs = self.db.collection('expenses') \
                    .where('companyId', '==', company_id) \
                    .where('status', '==', 'pending_finance') \
                    .stream()
                
                # Get the global workflow to check for secondary authority
                workflow = self.get_approval_workflow(company_id)
                global_finance_uid = workflow.get('advancedRules', {}).get('autoApprover')
                
                results = []
                for doc in docs:
                    exp = doc.to_dict()
                    submitter = self.get_user_data(exp.get('submittedBy'))
                    mgr_id = submitter.get('managerId')
                    mgr_data = self.get_user_data(mgr_id) if mgr_id else {}
                    
                    # Direct assignment OR Global Finance assignment
                    mgr_assigned_id = mgr_data.get('assignedFinanceId')
                    
                    if (mgr_assigned_id == uid) or (not mgr_assigned_id and global_finance_uid == uid):
                        exp['id'] = doc.id
                        exp = self._serialize_expense_timestamps(exp)
                        results.append(exp)
                return results
                
            return []
        except Exception as e:
            print(f"Error fetching pending approvals: {e}")
            return []

    def get_employee_expenses(self, uid):
        """Gets all expenses submitted by a specific user."""
        try:
            # Removed order_by to avoid composite index requirement
            docs = self.db.collection('expenses').where('submittedBy', '==', uid).stream()
            expenses = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                data = self._serialize_expense_timestamps(data)
                expenses.append(data)
            
            # Sort in memory instead
            expenses.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
            return expenses
        except Exception as e:
            print(f"Error fetching employee expenses: {e}")
            return []

    def get_employee_stats(self, uid):
        """Calculates summary stats for a specific user."""
        try:
            docs = self.db.collection('expenses').where('submittedBy', '==', uid).stream()
            total_reimbursed = 0
            pending_amount = 0
            total_claims = 0
            
            for doc in docs:
                data = doc.to_dict()
                total_claims += 1
                amount = float(data.get('amount', 0))
                status = data.get('status', 'pending_manager')
                
                if status == 'approved':
                    total_reimbursed += amount
                elif status in ['pending', 'pending_manager', 'pending_finance']:
                    pending_amount += amount
                    
            return {
                'totalReimbursed': total_reimbursed,
                'pendingAmount': pending_amount,
                'totalClaims': total_claims
            }
        except Exception as e:
            print(f"Error calculating employee stats: {e}")
            return {'totalReimbursed': 0, 'pendingAmount': 0, 'totalClaims': 0}

    def create_expense(self, expense_data):
        """Creates a new expense record with currency normalization."""
        from .currency_service import currency_service
        try:
            expense_data['createdAt'] = firestore.SERVER_TIMESTAMP
            expense_data['status'] = 'pending_manager'
            expense_data['approvals'] = {}
            
            if 'originalCurrency' in expense_data and 'originalAmount' in expense_data:
                # Dynamic Threshold Evaluation
                company_id = expense_data.get('companyId')
                base_currency = 'INR'
                
                if company_id:
                    company_data = self.get_company_data(company_id)
                    base_currency = company_data.get('baseCurrency', 'INR')

                expense_currency = expense_data['originalCurrency']
                original_amount = float(expense_data['originalAmount'])

                if expense_currency == base_currency:
                    converted_amount = original_amount
                else:
                    # Get rates relative to the base currency
                    rates = currency_service.get_exchange_rates(base_currency)
                    # Ex: rates.get('USD') gives us how many USD = 1 BaseCurrency
                    # So to convert USD to BaseCurrency, we DIVIDE by the rate.
                    rate_to_currency = rates.get(expense_currency)
                    
                    if rate_to_currency and rate_to_currency > 0:
                        converted_amount = original_amount / rate_to_currency
                    else:
                        # Fallback if service fails or currency unsupported
                        converted_amount = original_amount
                
                expense_data['convertedAmount'] = round(converted_amount, 2)
                expense_data['convertedCurrency'] = base_currency
                expense_data['amount'] = round(converted_amount, 2)

            doc_ref = self.db.collection('expenses').add(expense_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Error creating expense: {e}")
            raise e

    def get_manager_team(self, manager_uid):
        """Fetches all users where managerId matches the given manager_uid."""
        try:
            docs = self.db.collection('users').where('managerId', '==', manager_uid).stream()
            team = []
            for doc in docs:
                data = doc.to_dict()
                data['uid'] = doc.id
                team.append(data)
            return team
        except Exception as e:
            print(f"Error fetching manager team: {e}")
            return []

    def get_team_expenses(self, manager_uid):
        """Fetches all expenses submitted by the manager's direct reports."""
        try:
            # 1. Get team UIDs
            team = self.get_manager_team(manager_uid)
            uids = [member['uid'] for member in team]
            
            if not uids:
                return []

            # 2. Get expenses for these UIDs
            expenses = []
            # Firestore 'in' is limited to 30 values.
            docs = self.db.collection('expenses').where('submittedBy', 'in', uids[:30]).stream()
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                data = self._serialize_expense_timestamps(data)
                expenses.append(data)
            
            expenses.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
            return expenses
        except Exception as e:
            print(f"Error fetching team expenses: {e}")
            return []
    def get_team_analytics(self, manager_uid):
        """Aggregates expenses for the manager's team for charts."""
        try:
            expenses = self.get_team_expenses(manager_uid)
            
            # 1. Spending Trends (Last 6 Months)
            monthly_data = collections.defaultdict(float)
            # Initialize last 6 months with 0
            now = datetime.now()
            months_labels = []
            for i in range(5, -1, -1):
                m_date = now - timedelta(days=i*30)
                m_label = m_date.strftime('%b')
                months_labels.append(m_label)
                monthly_data[m_label] = 0.0

            # 2. Category Distribution
            category_data = collections.defaultdict(float)

            for exp in expenses:
                # Use convertedAmount for statistics
                amount = float(exp.get('convertedAmount', exp.get('amount', 0)))
                status = exp.get('status', '')
                cat = exp.get('category', 'Other')
                
                # Distribution (Always show current categories)
                category_data[cat] += amount
                
                # Trends (Exclude rejected for trends)
                if status != 'rejected':
                    try:
                        # createdAt is a string ISO date from get_team_expenses mapping
                        dt = datetime.fromisoformat(exp['createdAt'].replace('Z', '+00:00'))
                        m_label = dt.strftime('%b')
                        if m_label in monthly_data:
                            monthly_data[m_label] += amount
                    except:
                        continue

            return {
                'trends': {
                    'labels': months_labels,
                    'data': [round(monthly_data[m], 2) for m in months_labels]
                },
                'distribution': {
                    'labels': list(category_data.keys()),
                    'data': [round(v, 2) for v in category_data.values()]
                }
            }
        except Exception as e:
            print(f"Error generating team analytics: {e}")
            return {'trends': {'labels': [], 'data': []}, 'distribution': {'labels': [], 'data': []}}

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
