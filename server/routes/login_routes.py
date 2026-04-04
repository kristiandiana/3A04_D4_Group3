from flask import Blueprint, jsonify, current_app

login_bp = Blueprint('login', __name__)

@login_bp.route('/login', methods=['POST'])
def login():
    return jsonify({"success": True, "message": "Login successful", "token": "dummy-token"})