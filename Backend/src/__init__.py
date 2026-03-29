import os
from flask import Flask, render_template, redirect, url_for, session
from flask_cors import CORS
from pathlib import Path

def create_app():
    """Application factory for the Reimbursement Management System."""
    
    # Path calculation for Frontend separation
    root_path = Path(__file__).resolve().parent.parent.parent
    template_dir = root_path / "Frontend" / "templates"
    static_dir = root_path / "Frontend" / "static"

    app = Flask(__name__,
                template_folder=str(template_dir),
                static_folder=str(static_dir))
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_secret_key_reimbursement')
    CORS(app)

    # Register Blueprints
    from .routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    # Base route for initial redirection
    @app.route('/')
    def index():
        if 'user' in session:
            role = session.get('role', 'employee')
            return redirect(url_for(f'auth.{role}_dashboard'))
        return redirect(url_for('auth.login'))

    # Root Dashboard Routes for redirection demonstration
    @app.route('/admin/dashboard')
    def admin_dashboard():
        return render_template('dashboard.html', role='Admin')

    @app.route('/manager/dashboard')
    def manager_dashboard():
        return render_template('dashboard.html', role='Manager')

    @app.route('/employee/dashboard')
    def employee_dashboard():
        return render_template('dashboard.html', role='Employee')

    return app
