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

    def get_user_role(self, uid):
        """Fetches the role of a user from Firestore based on their UID."""
        try:
            user_ref = self.db.collection('users').document(uid)
            doc = user_ref.get()
            if doc.exists:
                return doc.to_dict().get('role', 'employee')
            return 'employee'
        except Exception as e:
            print(f"Error fetching user role for {uid}: {e}")
            return 'employee'

    def create_user_with_role(self, uid, user_data):
        """
        Registers a new user in Firestore and initializes their company if needed.
        The first user for a company ID becomes the Admin.
        """
        try:
            # Generate companyId from companyName
            company_name = user_data.get('companyName')
            if not company_name:
                raise ValueError("Company Name is required for signup.")
                
            company_id = company_name.strip().lower().replace(" ", "-")
            company_ref = self.db.collection('companies').document(company_id)
            company_doc = company_ref.get()

            # Role assignment logic
            if not company_doc.exists:
                # First user for this company is the Admin
                role = "admin"
                # Initialize company
                company_ref.set({
                    'name': user_data.get('companyName'),
                    'country': user_data.get('country'),
                    'baseCurrency': user_data.get('currency'),
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'adminUid': uid
                })
            else:
                # Subsequent users default to Employee (must be approved by Admin/Manager)
                role = "employee"

            # Create user document
            user_ref = self.db.collection('users').document(uid)
            user_ref.set({
                'fullName': user_data.get('fullName'),
                'email': user_data.get('email'),
                'companyId': company_id,
                'role': role,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'status': 'active' if role == 'admin' else 'pending'
            })
            
            return role

        except Exception as e:
            print(f"Error creating user/company: {e}")
            raise e

# Global instance
firebase_service = FirebaseService()
