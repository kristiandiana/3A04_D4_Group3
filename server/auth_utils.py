from functools import wraps

from flask import current_app, g, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


TOKEN_MAX_AGE_SECONDS = 60 * 60 * 8


def serialize_user(user):
    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat(),
    }


def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="scemas-auth")


def create_auth_token(user):
    return _serializer().dumps(
        {
            "user_id": user.user_id,
            "role": user.role,
            "email": user.email,
        }
    )


def get_authenticated_user():
    if getattr(g, "current_user", None) is not None:
        return g.current_user

    header = request.headers.get("Authorization", "").strip()

    if not header.startswith("Bearer "):
        return None

    token = header.removeprefix("Bearer ").strip()
    if not token:
        return None

    try:
        payload = _serializer().loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None

    user = current_app.config["repo"].get_user_by_id(payload["user_id"])
    if not user:
        return None

    g.current_user = user
    return user


def require_auth(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        user = get_authenticated_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        return view_func(*args, **kwargs)

    return wrapper


def require_role(*roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            user = get_authenticated_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            if user.role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return view_func(*args, **kwargs)

        return wrapper

    return decorator
