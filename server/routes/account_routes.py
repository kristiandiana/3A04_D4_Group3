from flask import Blueprint, jsonify, current_app

account_bp = Blueprint('account_bp', __name__)

@account_bp.route('/login', methods=['POST'])
def login():
    return jsonify({"success": True, "message": "Login successful", "token": "dummy-token"})

@account_bp.route('/signup', methods=['POST'])
def signup():
    return jsonify({"success": True, "message": "Signup successful"})