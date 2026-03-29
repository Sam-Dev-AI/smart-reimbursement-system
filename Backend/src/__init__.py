import os
from flask import Flask, redirect, url_for, session
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
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_secret_key_here')
    CORS(app)

    # Register Blueprints
    from .routes.auth import auth_bp
    from .routes.dashboard import dashboard_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)

    # Base route for initial redirection
    @app.route('/')
    def index():
        if 'user' in session:
            role = session.get('role', 'employee')
            # Manager and Finance share the same dashboard endpoint
            if role in ['manager', 'finance']:
                return redirect(url_for('dashboard.approver_dashboard'))
            return redirect(url_for(f'dashboard.{role}_dashboard'))
        return redirect(url_for('auth.login'))

    return app
