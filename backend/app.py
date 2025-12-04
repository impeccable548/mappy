# mappy/backend/app.py

from flask import Flask, render_template

class Config:
    """Application configuration settings."""
    # Security/Optimization settings would go here in a production app
    DEBUG = True
    SECRET_KEY = 'your_strong_secret_key_here' # Important for production apps

def create_app():
    """Application factory pattern for better structure."""
    app = Flask(__name__, static_folder='static', template_folder='templates')
    app.config.from_object(Config)

    @app.route('/')
    def index():
        """
        Renders the main mappy application page.
        """
        return render_template('index.html')

    return app

if __name__ == '__main__':
    app = create_app()
    # Host on '0.0.0.0' to be accessible from other devices on the network
    app.run(host='0.0.0.0', port=5000) 
