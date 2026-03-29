import firebase_admin
from firebase_admin import credentials, firestore, auth
from pathlib import Path
import os

def debug_db():
    try:
        current_dir = Path(r"c:\ME\My Projects\Reimbursement System\Backend\src")
        cred_path = current_dir / "config" / "serviceAccountKey.json"
        
        if not firebase_admin._apps:
            cred = credentials.Certificate(str(cred_path))
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        
        print("--- Users ---")
        docs = db.collection('users').get()
        for doc in docs:
            data = doc.to_dict()
            print(f"UID: {doc.id} | Email: {data.get('email')} | Role: {data.get('role')} | Company: {data.get('companyId')}")
            
        print("\n--- All Expenses ---")
        docs = db.collection('expenses').get()
        for doc in docs:
            data = doc.to_dict()
            print(f"ID: {doc.id} | Status: {data.get('status')} | Company: {data.get('companyId')} | Desc: {data.get('description')}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_db()
