from flask import Blueprint, current_app, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from auth_utils import create_auth_token, get_authenticated_user, require_auth, serialize_user


account_bp = Blueprint("account_bp", __name__)


def _validate_signup_payload(payload):
    if not isinstance(payload, dict):
        return None, "Request body must be a JSON object"

    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not name:
        return None, "name is required"

    if not email or "@" not in email:
        return None, "A valid email is required"

    if len(password) < 8:
        return None, "password must be at least 8 characters"

    return {
        "name": name,
        "email": email,
        "password": password,
    }, None


@account_bp.route("/login", methods=["POST"])
def login():
    repo = current_app.config["repo"]
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400

    user = repo.get_user_by_email(email)
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    repo.add_audit_log("USER_LOGIN", user.email, f"user_id={user.user_id}, role={user.role}")

    return jsonify(
        {
            "success": True,
            "message": "Login successful",
            "token": create_auth_token(user),
            "user": serialize_user(user),
        }
    )


@account_bp.route("/signup", methods=["POST"])
def signup():
    repo = current_app.config["repo"]
    payload = request.get_json(silent=True)

    data, error = _validate_signup_payload(payload)
    if error:
        return jsonify({"success": False, "message": error}), 400

    if repo.get_user_by_email(data["email"]):
        return jsonify({"success": False, "message": "An account with that email already exists"}), 409

    user = repo.create_user(
        name=data["name"],
        email=data["email"],
        password_hash=generate_password_hash(data["password"]),
        role="operator",
    )
    repo.add_audit_log("USER_SIGNUP", user.email, f"user_id={user.user_id}, role={user.role}")

    return jsonify(
        {
            "success": True,
            "message": "Signup successful",
            "token": create_auth_token(user),
            "user": serialize_user(user),
        }
    ), 201


@account_bp.route("/me", methods=["GET"])
@require_auth
def current_user():
    user = get_authenticated_user()
    return jsonify({"user": serialize_user(user)})
