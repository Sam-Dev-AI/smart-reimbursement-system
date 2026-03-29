from flask import Blueprint, request, jsonify, redirect, url_for, session, render_template
from firebase_admin import auth as firebase_auth
from ..services.firebase_service import firebase_service
from ..services.currency_service import currency_service

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET'])
def login():
    """Renders the professional flip-card login/signup page."""
    return render_template('login.html')

@auth_bp.route('/api/countries', methods=['GET'])
def get_countries():
    """Fetches world countries and currencies for the signup dropdown."""
    countries = currency_service.get_countries_and_currencies()
    return jsonify(countries)

@auth_bp.route('/api/login', methods=['POST'])
def api_login():
    """API endpoint to receive the Firebase ID token after frontend login."""
    data = request.json
    id_token = data.get('idToken')

    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        role = firebase_service.get_user_role(uid)
        
        session['user'] = uid
        session['role'] = role
        
        return jsonify({
            'status': 'success',
            'role': role,
            'redirect': url_for(f'auth.{role}_dashboard')
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 401

@auth_bp.route('/api/signup', methods=['POST'])
def api_signup():
    """API endpoint to handle initial user signup and company creation."""
    data = request.json
    id_token = data.get('idToken')
    
    try:
        # Verify the Firebase User
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        
        # Register user with role and company initialization logic
        role = firebase_service.create_user_with_role(uid, data)
        
        session['user'] = uid
        session['role'] = role
        
        return jsonify({
            'status': 'success', 
            'role': role,
            'redirect': url_for(f'auth.{role}_dashboard')
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

# Dashboard routes for redirection
@auth_bp.route('/admin/dashboard')
def admin_dashboard():
    return render_template('dashboard.html', role='Admin')

@auth_bp.route('/manager/dashboard')
def manager_dashboard():
    return render_template('dashboard.html', role='Manager')

@auth_bp.route('/employee/dashboard')
def employee_dashboard():
    return render_template('dashboard.html', role='Employee')
