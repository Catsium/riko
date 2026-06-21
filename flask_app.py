#main app type shit
import hmac
import json
import os
import tempfile

from flask import Flask, request, jsonify, send_from_directory

try:
    import config  # local, git-ignored; optional
except Exception:  # pragma: no cover - config.py is optional
    config = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_FILE = os.path.join(BASE_DIR, "finance_data.json")
INDEX_FILE = "OMORI Finance Tracker.html"

app = Flask(__name__, static_folder="static", static_url_path="")


def edit_password():
    """The shared edit password. Env var wins; config.py is the fallback."""
    pw = os.environ.get("EDIT_PASSWORD")
    if pw:
        return pw
    if config is not None:
        return getattr(config, "EDIT_PASSWORD", "") or ""
    return ""


def password_ok(supplied):
    """Constant-time compare so we don't leak length/timing."""
    expected = edit_password()
    if not expected:
        # No password configured on the server -> editing is disabled.
        return False
    if supplied is None:
        return False
    return hmac.compare_digest(str(supplied), str(expected))


@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, INDEX_FILE)


@app.route("/api/finance", methods=["GET"])
def load_finance():
    """Open read. Returns saved data, or 204 when nothing saved yet so the
    client can fall back to its built-in sample data."""
    if not os.path.exists(DATA_FILE):
        return ("", 204)
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return app.response_class(f.read(), mimetype="application/json")
    except (OSError, ValueError):
        return ("", 204)


@app.route("/api/finance", methods=["PUT"])
def save_finance():
    """Password-gated write."""
    supplied = request.headers.get("X-Edit-Password")
    if supplied is None:
        body = request.get_json(silent=True) or {}
        supplied = body.get("password")

    if not password_ok(supplied):
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "bad request"}), 400

    # Keep only the known top-level keys we care about: finance data plus the
    # roaming UI prefs (board layout, text scaling, theme, images, categories).
    state = {
        "entries": data.get("entries", []),
        "debts": data.get("debts", []),
        "savings": data.get("savings", []),
        "layout": data.get("layout", {}),
        "fontScale": data.get("fontScale", 1),
        "theme": data.get("theme", "light"),
        "stickers": data.get("stickers", []),
        "cats": data.get("cats", []),
        "customTheme": data.get("customTheme"),
        "hidden": data.get("hidden", []),
    }

    # Atomic write: temp file in the same dir, then os.replace.
    fd, tmp_path = tempfile.mkstemp(dir=BASE_DIR, prefix=".finance-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, DATA_FILE)
    except Exception:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        raise

    return jsonify({"ok": True})


if __name__ == "__main__":
    # Local dev only. PythonAnywhere runs the app through its own WSGI server.
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="127.0.0.1", port=port, debug=True)
