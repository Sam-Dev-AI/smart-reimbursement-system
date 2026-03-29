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

@auth_bp.route('/api/check-setup', methods=['GET'])
def check_setup():
    """Checks if the system has been initialized with the first admin."""
    is_initialized = firebase_service.is_system_initialized()
    return jsonify({'initialized': is_initialized})

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
        
        def get_dashboard_role_url(role):
            if role in ['manager', 'finance']:
                return url_for('dashboard.approver_dashboard')
            return url_for(f'dashboard.{role}_dashboard')
            
        return jsonify({
            'status': 'success',
            'role': role,
            'redirect': get_dashboard_role_url(role)
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 401

@auth_bp.route('/api/signup', methods=['POST'])
def api_signup():
    """API endpoint to handle initial user signup and company creation."""
    # Strict rule: Only the first user can use this route publicly
    if firebase_service.is_system_initialized():
        return jsonify({'status': 'error', 'message': 'Registration is closed. Please contact your administrator.'}), 403

    data = request.json
    id_token = data.get('idToken')
    
    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        
        role = firebase_service.create_user_with_role(uid, data)
        
        session['user'] = uid
        session['role'] = role
        
        def get_dashboard_role_url(role):
            if role in ['manager', 'finance']:
                return url_for('dashboard.approver_dashboard')
            return url_for(f'dashboard.{role}_dashboard')

        return jsonify({
            'status': 'success', 
            'role': role,
            'redirect': get_dashboard_role_url(role)
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400
