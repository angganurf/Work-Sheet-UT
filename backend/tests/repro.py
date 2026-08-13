import os, uuid, json
import requests
from dotenv import dotenv_values

BASE = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"
LOCAL = "http://localhost:8001/api"


def h(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


def reg(api):
    nim = f"TEST{uuid.uuid4().hex[:8]}"
    r = requests.post(f"{api}/auth/register", json={"nim": nim, "nama": "TEST_r", "password": "student123"})
    return nim, r.json()["token"]


for api, label in [(LOCAL, "LOCAL"), (API, "PUBLIC")]:
    print(f"=== {label} lockout ===")
    nim, tok = reg(api)
    for i in range(8):
        r = requests.post(f"{api}/auth/login", json={"nim": nim, "password": "badpass"})
        print(i + 1, r.status_code, r.text[:60])
    print(f"=== {label} admin 403 check ===")
    nim2, tok2 = reg(api)
    for ep in ["/admin/stats", "/admin/worksheets", "/admin/worksheets?search=x"]:
        r = requests.get(f"{api}{ep}", headers=h(tok2))
        print(ep, r.status_code, r.text[:80])
