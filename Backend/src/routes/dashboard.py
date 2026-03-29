from flask import Blueprint, render_template, session, redirect, url_for, jsonify, request
from functools import wraps
from ..services.firebase_service import firebase_service

dashboard_bp = Blueprint('dashboard', __name__)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function


def role_required(role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if session.get('role') != role:
                user_role = session.get('role', 'employee')
                return redirect(url_for(f'dashboard.{user_role}_dashboard'))
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
@login_required
@role_required('manager')
def manager_dashboard():
    return render_template('manager_dashboard.html')


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


@dashboard_bp.route('/api/employee/role', methods=['POST'])
@login_required
@role_required('admin')
def update_employee_role():
    data = request.json
    target_uid = data.get('uid')
    new_role = data.get('role')
    if new_role not in ['employee', 'manager', 'admin']:
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
@dashboard_bp.route('/api/workflows', methods=['GET'])
@login_required
def get_workflows():
    uid = session.get('user')
    try:
        user_data = firebase_service.get_user_data(uid)
        workflow = firebase_service.get_approval_workflow(user_data.get('companyId'))
        return jsonify({'status': 'success', 'workflow': workflow})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


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
# EXPENSE OVERSIGHT APIs (Admin)
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
@role_required('admin')
def override_expense():
    data = request.json
    uid = session.get('user')
    expense_id = data.get('expenseId')
    action = data.get('action')  # 'approved' or 'rejected'
    if action not in ['approved', 'rejected']:
        return jsonify({'status': 'error', 'message': 'Invalid action'}), 400
    try:
        firebase_service.override_expense(expense_id, action, uid)
        return jsonify({'status': 'success', 'message': f'Expense {action}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
