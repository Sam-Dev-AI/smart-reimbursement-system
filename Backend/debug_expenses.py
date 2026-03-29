import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path
import os

def debug_expenses():
    try:
        current_dir = Path(r"c:\ME\My Projects\Reimbursement System\Backend\src")
        cred_path = current_dir / "config" / "serviceAccountKey.json"
        
        if not firebase_admin._apps:
            cred = credentials.Certificate(str(cred_path))
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        
        print("--- All Expenses ---")
        docs = db.collection('expenses').limit(10).get()
        for doc in docs:
            data = doc.to_dict()
            print(f"ID: {doc.id}")
            print(f"  Status: {data.get('status')}")
            print(f"  CompanyId: {data.get('companyId')}")
            print(f"  SubmittedBy: {data.get('submittedBy')}")
            print(f"  Amount: {data.get('amount')}")
            print(f"  Approvals keys: {list(data.get('approvals', {}).keys())}")
            print("---")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_expenses()
