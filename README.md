# Smart Reimbursement Management System

A professional, SaaS-grade platform for managing company expenses with an intelligent, dynamic approval engine and AI-powered receipt processing.

---

## 🚀 Key Features

### 1. **Dynamic Approval Workflow**
The system uses a **Sequential & Conditional** approval engine that adapts to your organizational structure:
- **Manager Review**: All expenses first go to the employee's direct manager.
- **Conditional Finance Step**: If a manager is linked to a Finance approver (via the Many-to-One mapping), the expense automatically moves to the Finance queue after manager approval.
- **Auto-Skip Logic**: If no Finance approver is assigned to a manager, the expense is finalized immediately after manager approval, streamlining the process for smaller teams.
- **Real-Time Tracking**: Employees can see a visual timeline of exactly where their claim is (Pending Manager → Pending Finance → Approved).

### 2. **AI-Powered OCR Scanning**
Powered by **Gemini 1.5/2.5 Flash**, our OCR engine handles the heavy lifting:
- **Automatic Extraction**: Instantly pulls Amount, Date, Vendor, and Description from receipt images.
- **Currency Intelligence**: Detects the currency on the receipt and suggests the correct conversion.
- **Smart Categorization**: Automatically suggests the most likely expense category (Travel, Food, Supplies, etc.).

### 3. **Interactive Org Hierarchy (Tree View)**
Visualize your entire company structure in real-time:
- **SVG Canvas**: A high-performance, pannable and zoomable canvas showing all reporting lines.
- **Reporting Traces**: Click any employee to highlight their direct management chain up to the CEO.
- **Admin Management**: Easily manage roles (Employee, Manager, Finance, Admin) and assign Finance approvers to Managers.

### 4. **Employee Self-Service (SPA Dashboard)**
A modern, high-performance interface designed for end-to-end transparency:
- **Three-Section Layout**: Seamlessly switch between **Overview** (Stats & Quick Actions), **My Expenses** (Full History), and **Tracking** (Live Status).
- **Collapsible Sidebar**: A SaaS-grade sidebar that maximizes and minimizes to optimize screen real estate.
- **Unified Tracking**: A dedicated section to monitor active claims with progress bars and detailed approval timelines.

### 5. **Unified Approver Dashboard**
A single, powerful interface for both Managers and Finance users:
- **Role-Aware Queues**: The dashboard automatically filters expenses based on the current user's role and assigned subordinates.
- **One-Click Actions**: Approve or reject expenses with optional feedback for the employee.

---

## 🛡️ Security & Access Control
- **First-Visit Admin Setup**: The first user to register on a new installation automatically becomes the Super Admin.
- **Locked Registration**: Once an Admin exists, public registration is disabled, and new users can only be invited by the Admin.
- **Role-Based Protection**: Strict server-side decorators ensure users can only access data relevant to their specific role.

---

## 🛠️ Technical Stack
- **Backend**: Python (Flask)
- **Database**: Google Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth (Session-based)
- **AI Intelligence**: Google Gemini Flash API
- **Frontend**: Vanilla JavaScript (ES6+), CSS3 (Custom Design System), Bootstrap 5

---

## 🏁 Getting Started

### Prerequisites
- Python 3.9+
- Firebase Project (with Firestore enabled)
- Gemini API Key

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up your environment variables (Firebase config, Gemini API Key).
4. Run the development server:
   ```bash
   python Backend/src/run.py
   ```
5. Navigate to `http://localhost:5000/register` to create the initial Admin account.

---

## 📊 Data Model
- **Users**: Extended with `managerId`, `assignedFinanceId`, and `companyId`.
- **Expenses**: Tracked via status states: `submitted`, `pending_manager`, `pending_finance`, `approved`, `rejected`.
- **Workflows**: Fully customizable per-company approval steps.

---

## 📈 Project Status vs. Requirements

Based on the initial `Reimbursement management.pdf` specifications, here is the current completion status:

### ✅ Fully Implemented
- **Authentication & User Management**: First login auto-creates the Company and Admin. Admins can create users, assign roles (Employee, Manager, Admin, Finance), and build manager relationships via the visual Org Hierarchy.
- **Expense Submission**: Employees can submit claims, upload receipts, and view their history. Multi-currency submission is supported.
- **OCR Receipt Scanning**: Gemini Flash AI automatically extracts Amount, Date, Vendor, and Category from uploaded receipts.
- **Role Permissions & Dashboards**: Strict separation of capabilities. Managers see their team's expenses with amounts converted to the base currency. Admins can view all data and override rules.
- **Sequential Approval Routing**: Expenses automatically route to the direct manager first, and then to a secondary step (like Finance) if configured.

### 🟡 Partially Implemented / Simplified for Demo
- **Live Currency Integrations**: The system supports multi-currency conversion to a base currency. However, it currently uses a fixed-rate local helper instead of the live `exchangerate-api.com` or `restcountries.com` to prevent external dependency failures during demo/testing.
- **Manager Approval Field Check**: The system automatically routes to the direct manager, rather than requiring a specific "IS MANAGER APPROVER" checkbox.

### ⏳ Future Roadmap (Pending)
- **Advanced Conditional Workflows**: The system supports sequential steps, but the highly advanced rules engine (e.g., *Percentage rules where 60% of 5 approvers must approve*, or *Specific role auto-approves like CFO*) is planned for a future update.
- **Dynamic Multi-step Builder UI**: Allowing Admins to freely construct arbitrary N-step chains (e.g., Manager -> Finance -> Director) via a drag-and-drop interface.
