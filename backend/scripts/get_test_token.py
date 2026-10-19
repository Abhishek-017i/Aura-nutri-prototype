import os
from pathlib import Path
import requests
from app.services.firebase_auth import _initialize
from firebase_admin import auth

def get_demo_id_token(email: str = "test_token@auranutri.demo", password: str = "test123password") -> str:
    env_local = Path(__file__).resolve().parent.parent.parent / "frontend" / ".env.local"
    key = ""
    if env_local.exists():
        with open(env_local, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("VITE_FIREBASE_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")

    if not key:
        key = os.getenv("VITE_FIREBASE_API_KEY", "")

    app = _initialize()
    try:
        user = auth.get_user_by_email(email)
    except Exception:
        user = auth.create_user(email=email, password=password)

    custom_token = auth.create_custom_token(user.uid).decode("utf-8")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={key}"
    res = requests.post(url, json={"token": custom_token, "returnSecureToken": True})
    data = res.json()
    if "idToken" in data:
        return str(data["idToken"])
    
    # Fallback to signInWithPassword
    url_pwd = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={key}"
    res_pwd = requests.post(url_pwd, json={"email": email, "password": password, "returnSecureToken": True})
    data_pwd = res_pwd.json()
    if "idToken" in data_pwd:
        return str(data_pwd["idToken"])

    raise RuntimeError(f"Could not get ID token: {data} / {data_pwd}")

if __name__ == "__main__":
    token = get_demo_id_token()
    print("SUCCESS_TOKEN_OBTAINED_LENGTH:", len(token))
