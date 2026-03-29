from flask import Blueprint, render_template, session, redirect, url_for, jsonify, request
from functools import wraps
from ..services.firebase_service import firebase_service
from ..services.ai_service import ai_service

dashboard_bp = Blueprint('dashboard', __name__)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function


def role_required(allowed_roles):
    """Specific role requirement decorator. allowed_roles can be a string or list."""
    if isinstance(allowed_roles, str):
        allowed_roles = [allowed_roles]
    def get_dashboard_url(role):
        if role in ['manager', 'finance']:
            return url_for('dashboard.approver_dashboard')
        return url_for(f'dashboard.{role}_dashboard')

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_role = session.get('role', 'employee')
            if user_role not in allowed_roles:
                return redirect(get_dashboard_url(user_role))
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ══════════════════════════════════════════════════════════════
# DASHBOARD PAGES
# ══════════════════════════════════════════════════════════════
@dashboard_bp.route('/admin/dashboard')
@login_required
@role_required('admin')
def admin_dashboard():
    return render_template('admin_dashboard.html')


@dashboard_bp.route('/manager/dashboard')
@dashboard_bp.route('/finance/dashboard')
@login_required
def approver_dashboard():
    """Unified dashboard for Manager and Finance roles."""
    role = session.get('role')
    if role not in ['manager', 'finance']:
        return redirect(url_for('dashboard.employee_dashboard'))
    return render_template('approver_dashboard.html', role=role)


@dashboard_bp.route('/employee/dashboard')
@login_required
@role_required('employee')
def employee_dashboard():
    return render_template('employee_dashboard.html')


@dashboard_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.login'))


# ══════════════════════════════════════════════════════════════
# USER PROFILE API
# ══════════════════════════════════════════════════════════════
@dashboard_bp.route('/api/user/profile', methods=['GET'])
@login_required
def get_user_profile():
    uid = session.get('user')
    try:
        user_data = firebase_service.get_user_data(uid)
        company_data = firebase_service.get_company_data(user_data.get('companyId'))
        return jsonify({'status': 'success', 'user': user_data, 'company': company_data})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ══════════════════════════════════════════════════════════════
# EMPLOYEE MANAGEMENT APIs (Admin)
# ══════════════════════════════════════════════════════════════
@dashboard_bp.route('/api/company/employees', methods=['GET'])
@login_required
def get_company_employees():
    uid = session.get('user')
    try:
        user_data = firebase_service.get_user_data(uid)
        employees = firebase_service.get_company_employees(user_data.get('companyId'))
        return jsonify({'status': 'success', 'employees': employees})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/workflows', methods=['GET'])
@login_required
def get_company_workflow():
    uid = session.get('user')
    try:
        user_data = firebase_service.get_user_data(uid)
        company_id = user_data.get('companyId')
        workflow = firebase_service.get_approval_workflow(company_id)
        return jsonify({'status': 'success', 'workflow': workflow})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/employee/role', methods=['POST'])
@login_required
@role_required('admin')
def update_employee_role():
    data = request.json
    target_uid = data.get('uid')
    new_role = data.get('role')
    allowed_roles = ['employee', 'manager', 'finance', 'admin']
    if new_role not in allowed_roles:
        return jsonify({'status': 'error', 'message': 'Invalid role'}), 400
    try:
        firebase_service.update_user_role(target_uid, new_role)
        return jsonify({'status': 'success', 'message': f'Role updated to {new_role}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/user/create', methods=['POST'])
@login_required
@role_required('admin')
def create_user():
    data = request.json
    uid = session.get('user')
    try:
        admin_data = firebase_service.get_user_data(uid)
        company_id = admin_data.get('companyId')
        new_uid = firebase_service.create_user_by_admin(data, company_id)
        return jsonify({'status': 'success', 'uid': new_uid, 'message': 'User created successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/user/assign-manager', methods=['POST'])
@login_required
@role_required('admin')
def assign_manager():
    data = request.json
    employee_uid = data.get('employeeUid')
    manager_uid = data.get('managerUid')
    try:
        firebase_service.assign_manager(employee_uid, manager_uid)
        return jsonify({'status': 'success', 'message': 'Manager assigned'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/user/assign-finance', methods=['POST'])
@login_required
@role_required('admin')
def assign_finance():
    data = request.json
    manager_uid = data.get('managerUid')
    finance_uid = data.get('financeUid')
    try:
        firebase_service.assign_finance_to_manager(manager_uid, finance_uid)
        return jsonify({'status': 'success', 'message': 'Finance approver assigned to manager'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ══════════════════════════════════════════════════════════════
# COMPANY PROFILE APIs
# ══════════════════════════════════════════════════════════════
@dashboard_bp.route('/api/company/update', methods=['POST'])
@login_required
@role_required('admin')
def update_company():
    data = request.json
    uid = session.get('user')
    try:
        admin_data = firebase_service.get_user_data(uid)
        company_id = admin_data.get('companyId')
        firebase_service.update_company(company_id, data)
        return jsonify({'status': 'success', 'message': 'Company updated'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ══════════════════════════════════════════════════════════════
# APPROVAL WORKFLOW APIs
# ══════════════════════════════════════════════════════════════


@dashboard_bp.route('/api/workflows', methods=['POST'])
@login_required
@role_required('admin')
def save_workflows():
    data = request.json
    uid = session.get('user')
    try:
        user_data = firebase_service.get_user_data(uid)
        firebase_service.save_approval_workflow(user_data.get('companyId'), data)
        return jsonify({'status': 'success', 'message': 'Workflow saved'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ══════════════════════════════════════════════════════════════
# EMPLOYEE EXPENSE APIs
# ══════════════════════════════════════════════════════════════
@dashboard_bp.route('/api/expenses/my', methods=['GET'])
@login_required
def get_my_expenses():
    uid = session.get('user')
    try:
        expenses = firebase_service.get_employee_expenses(uid)
        return jsonify({'status': 'success', 'expenses': expenses})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/expenses/my/stats', methods=['GET'])
@login_required
def get_my_stats():
    uid = session.get('user')
    try:
        stats = firebase_service.get_employee_stats(uid)
        return jsonify({'status': 'success', 'stats': stats})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/expenses/submit', methods=['POST'])
@login_required
def submit_new_expense():
    uid = session.get('user')
    data = request.json
    try:
        user_data = firebase_service.get_user_data(uid)
        data['submittedBy'] = uid
        data['employeeName'] = user_data.get('fullName')
        data['companyId'] = user_data.get('companyId')
        
        expense_id = firebase_service.create_expense(data)
        return jsonify({'status': 'success', 'expenseId': expense_id, 'message': 'Expense submitted successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/ocr/scan', methods=['POST'])
@login_required
def scan_receipt():
    if 'receipt' not in request.files:
        return jsonify({'status': 'error', 'message': 'No receipt file provided'}), 400
    
    file = request.files['receipt']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No selected file'}), 400
    
    try:
        image_data = file.read()
        extracted_data = ai_service.extract_expense_details(image_data)
        
        if not extracted_data:
            return jsonify({'status': 'error', 'message': 'AI failed to extract data from receipt'}), 500
            
        return jsonify({'status': 'success', 'data': extracted_data})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ══════════════════════════════════════════════════════════════
# EXPENSE OVERSIGHT APIs (Admin / Approver)
# ══════════════════════════════════════════════════════════════
@dashboard_bp.route('/api/expenses/all', methods=['GET'])
@login_required
@role_required('admin')
def get_all_expenses():
    uid = session.get('user')
    try:
        user_data = firebase_service.get_user_data(uid)
        expenses = firebase_service.get_all_expenses(user_data.get('companyId'))
        return jsonify({'status': 'success', 'expenses': expenses})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/expenses/override', methods=['POST'])
@login_required
def process_expense_action():
    """Combined endpoint for approvals (Approvers) and overrides (Admin)."""
    data = request.json
    uid = session.get('user')
    role = session.get('role')
    expense_id = data.get('expenseId')
    action = data.get('action') # 'approved' or 'rejected'

    if action not in ['approved', 'rejected']:
        return jsonify({'status': 'error', 'message': 'Invalid action'}), 400

    try:
        user_data = firebase_service.get_user_data(uid)
        company_id = user_data.get('companyId')
        comment = data.get('comment')

        if role == 'admin' and action != 'escalated':
            # Force override
            firebase_service.override_expense(expense_id, action, uid)
            return jsonify({'status': 'success', 'message': f'Expense overriden to {action}'})
        elif role in ['manager', 'finance', 'director'] or action == 'escalated':
            # Standard sequential/hybrid approval
            new_status = firebase_service.submit_approval(expense_id, uid, action, company_id, comment=comment)
            return jsonify({'status': 'success', 'message': f'Recorded: {action}. New status: {new_status}'})
        else:
            return jsonify({'status': 'error', 'message': 'Permission denied'}), 403

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/approvals/pending', methods=['GET'])
@login_required
def get_pending_approvals():
    uid = session.get('user')
    role = session.get('role')
    try:
        expenses = firebase_service.get_pending_approvals(uid, role)
        return jsonify({'status': 'success', 'expenses': expenses})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/manager/team', methods=['GET'])
@login_required
@role_required(['manager', 'admin'])
def get_manager_team():
    uid = session.get('user')
    try:
        team = firebase_service.get_manager_team(uid)
        return jsonify({'status': 'success', 'team': team})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/manager/team/expenses', methods=['GET'])
@login_required
@role_required(['manager', 'admin', 'finance'])
def get_team_expenses():
    uid = session.get('user')
    try:
        # If it's a manager, we check their specific team
        # In a real app, an admin might pass an employeeUid as a parameter
        expenses = firebase_service.get_team_expenses(uid)
        return jsonify({'status': 'success', 'expenses': expenses})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@dashboard_bp.route('/api/manager/analytics', methods=['GET'])
@login_required
@role_required(['manager', 'admin'])
def get_manager_stats():
    uid = session.get('user')
    try:
        stats = firebase_service.get_team_analytics(uid)
        return jsonify({'status': 'success', 'data': stats})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
