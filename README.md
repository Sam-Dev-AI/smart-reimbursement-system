# Smart Reimbursement Management System 💳

A professional, SaaS-grade platform designed to revolutionize company expense management with an intelligent, dynamic approval engine and AI-powered receipt processing.

## 🌐 Live Demo
Experience the system live here: **[reimbursement.claroz.in](https://reimbursement.claroz.in)**

---

## 🧪 Testing Accounts
Use these pre-configured accounts to explore the different roles:

### 🛠️ Admin Role
*   **Email**: `samir.lade6@gmail.com`
*   **Password**: `samirl123`
*   **Access**: Full system configuration, user management, and organizational hierarchy search.

### 👥 Manager Role
*   **Name**: Manager 2
*   **Email**: `manager2@claroz.com`
*   **Password**: `User@123`
*   **Access**: Real-time team spend analytics, "Recent Decisions" activity feed, and approval queue.

### 🧑‍💻 Employee Role
*   **Name**: Emp 1 (M2) 
*   **Email**: `emp1.m2@claroz.com`
*   **Password**: `User@123`
*   **Access**: AI-powered OCR expense submission, multi-currency processing, and status tracking.

---

## 📸 Quick Test Guide
1.  **Login as Employee**: Submit a new expense using the **OCR feature** (upload a receipt) or enter data manually.
2.  **Login as Manager**: Review the pending claim, check the team stats, and approve/reject it.
3.  **Login as Admin**: Use the **Global Search** to find the employee and view their reporting line in the SVG hierarchy.

---

## 🌟 The "Why": Problems We Solve

### 🧑‍💻 For Employees
*   **The Problem**: Losing receipts and the headache of manual currency conversion for international travel.
*   **The Solution**: An **AI-Powered OCR Engine** that instantly extracts data from photos. If you spend in EUR while your company uses USD, the system handles the conversion automatically base on real-time-like logic.

### 👥 For Managers
*   **The Problem**: Approved expenses "disappearing" from the queue once processed, leading to a lack of oversight on team spend.
*   **The Solution**: A persistent **"Recent Decisions" Activity Feed** and **Real-Time Stat Cards** that show total team expenditure converted to your base currency for easy comparison.

### 🏦 For Finance Teams
*   **The Problem**: Being overwhelmed by hundreds of small breakfast receipts while high-value equipment claims get lost in the noise.
*   **The Solution**: **Intelligent Threshold Escalation**. Finance only sees claims that exceed a specific amount (e.g., $1000). Small claims are auto-approved for the manager, while large ones are routed for deeper audit.

---

## 🚀 Key Features

### 1. **Hybrid Approval Workflow**
The system uses a **Sequential & Conditional** engine:
- **Manager-First Routing**: Every claim starts with the direct manager.
- **Smart Finance Skip**: If an expense is under the "Finance Threshold," it is finalized immediately after manager approval.
- **Authority Fallback**: If no specific Finance user is assigned to a manager, the system defaults to a "Global Finance Head" or auto-approval to prevent workflow deadlocks.

### 2. **AI-Powered OCR Intelligence**
Powered by **Gemini 1.5/2.5 Flash**:
- **Field Extraction**: Recovers Amount, Date, Vendor, and Category instantly.
- **Multi-Currency Sensing**: Detects the currency symbols on the receipt and suggests the correct conversion.

### 3. **Interactive Org Hierarchy**
A high-performance **SVG Canvas** for real-time organizational visualization:
- **Reporting Lines**: Zoom and pan through the entire company tree.
- **Trace Management**: Click any employee to visualize the approval chain up to the Admin.

---

## 🛠️ Technical Stack & Deployment

### **Backend & Storage**
- **Core**: Python (Flask) with Gunicorn for production.
- **Database**: Google Firebase Firestore (Real-time NoSQL).
- **Auth**: Firebase Authentication (Session-based).

### **Frontend Aesthetics**
- **Core**: Vanilla JavaScript (ES6+), Custom CSS3 Design System.
- **Glassmorphism**: Modern, premium UI with smooth gradients and interactive micro-animations.

### **Cloud-Native Deployment**
The system is fully **Dockerized** and optimized for **Google Cloud Run**:
- **Auto-Scaling**: Scales from zero to production load automatically.
- **Stateless Design**: Optimized for high-availability containerized environments.

---

## 🏁 Getting Started (Local Development)

### 1. Requirements
- Python 3.11+
- [Google Cloud Project](https://console.cloud.google.com/) with Firebase enabled.

### 2. Setup
```bash
# Install dependencies
pip install -r Backend/requirements.txt

# Run the app
python Backend/run.py
```

### 3. Environment Variables
Create a `.env` in the `Backend` directory:
- `SECRET_KEY`: Your session secret.
- `GEMINI_API_KEY`: Your Google AI API Key.
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to your `serviceAccountKey.json`.

---

## 🛡️ License
Professional Enterprise Version © 2026. Built with Antigravity AI.
