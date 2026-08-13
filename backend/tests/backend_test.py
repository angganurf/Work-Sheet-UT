"""Backend API tests for Lembar Kerja UT app (auth, worksheets CRUD, admin)."""
import os
import re
import time
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"


def creds():
    p = Path("/app/memory/test_credentials.md")
    content = p.read_text(encoding="utf-8")
    nim = re.search(r'(?im)^\s*[-*]?\s*NIM:\s*`([^`]+)`', content)
    pw = re.search(r'(?im)^\s*[-*]?\s*Password:\s*`([^`]+)`', content)
    return {"nim": nim.group(1), "password": pw.group(1)}


ADMIN = creds()


@pytest.fixture(scope="module")
def sess():
    """Session that does NOT persist cookies, so Bearer-token auth is what is tested."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    from http.cookiejar import DefaultCookiePolicy
    s.cookies.set_policy(DefaultCookiePolicy(allowed_domains=[]))
    return s


def register_student(sess, suffix=""):
    nim = f"TEST{uuid.uuid4().hex[:8]}{suffix}"
    r = sess.post(f"{API}/auth/register", json={"nim": nim, "nama": f"TEST_{nim}", "password": "student123"})
    assert r.status_code == 200, r.text
    body = r.json()
    return nim, body["token"], body["user"]


def h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- Health ----------------
class TestHealth:
    def test_root(self, sess):
        r = sess.get(f"{API}/")
        assert r.status_code == 200
        assert "message" in r.json()


# ---------------- Auth ----------------
class TestAuth:
    def test_admin_login(self, sess):
        r = sess.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["role"] == "admin"
        assert d["user"]["nim"] == ADMIN["nim"]
        assert isinstance(d["token"], str) and len(d["token"]) > 20
        # httpOnly cookie set on login
        cookie = r.headers.get("set-cookie", "")
        assert "access_token" in cookie, f"no auth cookie: {cookie}"
        assert "HttpOnly" in cookie, f"cookie not httpOnly: {cookie}"

    def test_register_and_me(self, sess):
        nim, token, user = register_student(sess)
        assert user["role"] == "student"
        r = sess.get(f"{API}/auth/me", headers=h(token))
        assert r.status_code == 200
        assert r.json()["user"]["nim"] == nim
        assert "password_hash" not in r.json()["user"]

    def test_duplicate_nim(self, sess):
        nim, _, _ = register_student(sess)
        r = sess.post(f"{API}/auth/register", json={"nim": nim, "nama": "TEST_dup", "password": "student123"})
        assert r.status_code == 400
        assert r.json()["detail"] == "NIM sudah terdaftar"

    def test_short_password(self, sess):
        r = sess.post(f"{API}/auth/register", json={"nim": f"TEST{uuid.uuid4().hex[:6]}", "nama": "TEST_x", "password": "123"})
        assert r.status_code == 400
        assert "minimal 6" in r.json()["detail"]

    def test_login_wrong_password(self, sess):
        nim, _, _ = register_student(sess)
        r = sess.post(f"{API}/auth/login", json={"nim": nim, "password": "wrongpass"})
        assert r.status_code == 401
        assert r.json()["detail"] == "NIM atau password salah"

    def test_login_unknown_nim(self, sess):
        r = sess.post(f"{API}/auth/login", json={"nim": "TEST_nonexistent_zzz", "password": "whatever"})
        assert r.status_code == 401

    def test_me_without_token(self, sess):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, sess):
        r = requests.get(f"{API}/auth/me", headers=h("garbage.token.value"))
        assert r.status_code == 401

    def test_logout(self, sess):
        nim, token, _ = register_student(sess)
        r = sess.post(f"{API}/auth/logout", headers=h(token))
        assert r.status_code == 200

    def test_bcrypt_hash_format(self):
        # bcrypt hash must start with $2b$ (playbook requirement)
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        env = dotenv_values("/app/backend/.env")

        async def check():
            c = AsyncIOMotorClient(env["MONGO_URL"])
            u = await c[env["DB_NAME"]].users.find_one({"nim": ADMIN["nim"]})
            c.close()
            return u

        u = asyncio.get_event_loop().run_until_complete(check()) if False else asyncio.run(check())
        assert u is not None, "admin user not seeded"
        assert u["password_hash"].startswith("$2b$"), f"bad hash prefix: {u['password_hash'][:6]}"

    def test_brute_force_lockout(self, sess):
        """REGRESSION #3: 5 failed attempts -> 6th attempt returns 429."""
        nim, _, _ = register_student(sess)
        codes = []
        for _ in range(5):
            r = sess.post(f"{API}/auth/login", json={"nim": nim, "password": "badpass"})
            codes.append(r.status_code)
        assert codes == [401] * 5, f"expected 5x401 before lockout, got {codes}"
        r6 = sess.post(f"{API}/auth/login", json={"nim": nim, "password": "badpass"})
        assert r6.status_code == 429, f"6th failed attempt should be 429, got {r6.status_code}: {r6.text[:200]}"
        assert "15 menit" in r6.json().get("detail", "")
        # even the CORRECT password is rejected while locked
        r7 = sess.post(f"{API}/auth/login", json={"nim": nim, "password": "student123"})
        assert r7.status_code == 429, f"locked account accepted correct password: {r7.status_code}"

    def test_successful_login_resets_attempt_counter(self, sess):
        nim, _, _ = register_student(sess)
        for _ in range(3):
            assert sess.post(f"{API}/auth/login", json={"nim": nim, "password": "badpass"}).status_code == 401
        assert sess.post(f"{API}/auth/login", json={"nim": nim, "password": "student123"}).status_code == 200
        # counter reset -> next 3 bad attempts still 401, not locked
        for _ in range(3):
            assert sess.post(f"{API}/auth/login", json={"nim": nim, "password": "badpass"}).status_code == 401


# ---------------- Worksheets CRUD ----------------
class TestWorksheets:
    def test_crud_flow(self, sess):
        nim, token, _ = register_student(sess)
        # list empty
        r = sess.get(f"{API}/worksheets", headers=h(token))
        assert r.status_code == 200 and r.json() == []
        # create
        r = sess.post(f"{API}/worksheets", headers=h(token), json={"title": "TEST_ws", "data": {"identitas": {"nim": nim}}})
        assert r.status_code == 200, r.text
        w = r.json()
        assert w["title"] == "TEST_ws"
        assert w["nim"] == nim
        assert "_id" not in w
        wid = w["id"]
        # get
        r = sess.get(f"{API}/worksheets/{wid}", headers=h(token))
        assert r.status_code == 200
        assert r.json()["data"]["identitas"]["nim"] == nim
        # update
        payload = {"title": "TEST_ws_upd", "data": {"tujuan_belajar": "lulus", "peta_konsep": "abc"}}
        r = sess.put(f"{API}/worksheets/{wid}", headers=h(token), json=payload)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_ws_upd"
        # persistence
        r = sess.get(f"{API}/worksheets/{wid}", headers=h(token))
        assert r.json()["data"]["tujuan_belajar"] == "lulus"
        assert r.json()["title"] == "TEST_ws_upd"
        # list has 1
        r = sess.get(f"{API}/worksheets", headers=h(token))
        assert len(r.json()) == 1
        # delete
        r = sess.delete(f"{API}/worksheets/{wid}", headers=h(token))
        assert r.status_code == 200
        r = sess.get(f"{API}/worksheets/{wid}", headers=h(token))
        assert r.status_code == 404

    def test_data_isolation(self, sess):
        _, t1, _ = register_student(sess, "a")
        _, t2, _ = register_student(sess, "b")
        wid = sess.post(f"{API}/worksheets", headers=h(t1), json={"title": "TEST_iso"}).json()["id"]
        # other student cannot read
        r = sess.get(f"{API}/worksheets/{wid}", headers=h(t2))
        assert r.status_code == 403
        # other student cannot update/delete
        assert sess.put(f"{API}/worksheets/{wid}", headers=h(t2), json={"title": "hack"}).status_code == 403
        assert sess.delete(f"{API}/worksheets/{wid}", headers=h(t2)).status_code == 403
        # not in their list
        assert sess.get(f"{API}/worksheets", headers=h(t2)).json() == []
        sess.delete(f"{API}/worksheets/{wid}", headers=h(t1))

    def test_worksheets_require_auth(self, sess):
        assert requests.get(f"{API}/worksheets").status_code == 401
        assert requests.post(f"{API}/worksheets", json={"title": "x"}).status_code == 401

    @pytest.mark.parametrize("bad_id", ["not-an-objectid", "123", "%20", "zzzzzzzzzzzzzzzzzzzzzzzz"])
    def test_malformed_worksheet_id_returns_404(self, sess, bad_id):
        """REGRESSION #1: malformed ObjectId must be 404, never 500, on GET/PUT/DELETE."""
        _, token, _ = register_student(sess)
        rg = sess.get(f"{API}/worksheets/{bad_id}", headers=h(token))
        assert rg.status_code == 404, f"GET {bad_id} -> {rg.status_code}: {rg.text[:200]}"
        rp = sess.put(f"{API}/worksheets/{bad_id}", headers=h(token), json={"title": "x"})
        assert rp.status_code == 404, f"PUT {bad_id} -> {rp.status_code}: {rp.text[:200]}"
        rd = sess.delete(f"{API}/worksheets/{bad_id}", headers=h(token))
        assert rd.status_code == 404, f"DELETE {bad_id} -> {rd.status_code}: {rd.text[:200]}"

    def test_stale_cookie_does_not_shadow_bearer(self, sess):
        """A stale/other-user access_token cookie must not override the Authorization header."""
        _, t1, u1 = register_student(sess, "c")
        nim2, t2, u2 = register_student(sess, "d")
        # send user2's Bearer token while carrying user1's cookie
        r = requests.get(f"{API}/auth/me", headers=h(t2), cookies={"access_token": t1})
        assert r.status_code == 200
        assert r.json()["user"]["nim"] == nim2, (
            f"cookie took precedence over Authorization header: got {r.json()['user']['nim']}, expected {nim2}"
        )

    def test_admin_cookie_cannot_elevate_student_bearer(self, sess):
        """REGRESSION #2b: admin cookie must not elevate a student's Bearer token."""
        r = sess.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200, r.text
        admin_token = r.json()["token"]
        _, st, _ = register_student(sess, "e")
        r = requests.get(f"{API}/admin/stats", headers=h(st), cookies={"access_token": admin_token})
        assert r.status_code == 403, f"student bearer + admin cookie got {r.status_code} (privilege escalation)"

    def test_nonexistent_worksheet(self, sess):
        _, token, _ = register_student(sess)
        r = sess.get(f"{API}/worksheets/507f1f77bcf86cd799439011", headers=h(token))
        assert r.status_code == 404


# ---------------- Admin ----------------
class TestAdmin:
    @pytest.fixture(scope="class")
    def admin_token(self, sess):
        r = sess.post(f"{API}/auth/login", json=ADMIN)
        if r.status_code != 200:
            pytest.fail(f"admin login failed: {r.status_code} {r.text}")
        return r.json()["token"]

    def test_stats(self, sess, admin_token):
        r = sess.get(f"{API}/admin/stats", headers=h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["total_students"], int) and d["total_students"] >= 0
        assert isinstance(d["total_worksheets"], int)

    def test_list_all_and_search(self, sess, admin_token):
        nim, token, _ = register_student(sess)
        wid = sess.post(f"{API}/worksheets", headers=h(token), json={"title": "TEST_adminsearch"}).json()["id"]
        r = sess.get(f"{API}/admin/worksheets", headers=h(admin_token))
        assert r.status_code == 200
        assert any(w["id"] == wid for w in r.json())
        # search by nim
        r = sess.get(f"{API}/admin/worksheets", headers=h(admin_token), params={"search": nim})
        assert r.status_code == 200 and len(r.json()) >= 1
        assert all(nim.lower() in (w["nim"] or "").lower() or nim.lower() in (w["nama"] or "").lower() for w in r.json())
        # search by title
        r = sess.get(f"{API}/admin/worksheets", headers=h(admin_token), params={"search": "TEST_adminsearch"})
        assert any(w["id"] == wid for w in r.json())
        # admin can view a student's worksheet
        r = sess.get(f"{API}/worksheets/{wid}", headers=h(admin_token))
        assert r.status_code == 200
        sess.delete(f"{API}/worksheets/{wid}", headers=h(token))

    def test_student_cannot_access_admin(self, sess):
        _, token, _ = register_student(sess)
        assert sess.get(f"{API}/admin/stats", headers=h(token)).status_code == 403
        assert sess.get(f"{API}/admin/worksheets", headers=h(token)).status_code == 403

    def test_admin_endpoints_require_auth(self):
        assert requests.get(f"{API}/admin/stats").status_code == 401


# ---------------- Profile (one-time student profile) ----------------
SAMPLE_PROFILE = {
    "identitas": {
        "nama": "TEST_Profile User",
        "nim": "TESTNIMPROF",
        "alamat_rumah": "Jl. Merdeka 10",
        "nomor_hp": "081234567890",
        "nomor_kontak": "0217654321",
        "email": "test_profile@example.test",
        "awal_tahun_kuliah": "2023",
    },
    "tujuan_belajar": "Lulus dengan IPK 3.5",
    "target_belajar": ["Baca 2 modul/minggu", "Ikut tuton"],
    "mata_kuliah": [
        {"kode": "MKDU4107", "nama": "Ilmu Alamiah Dasar", "sks": "3"},
        {"kode": "EKMA4116", "nama": "Manajemen", "sks": "4"},
    ],
}


class TestProfile:
    def test_profile_requires_auth(self):
        assert requests.get(f"{API}/profile").status_code == 401
        assert requests.put(f"{API}/profile", json={"profile": {}}).status_code == 401

    def test_fresh_user_gets_defaults(self, sess):
        nim, token, user = register_student(sess)
        r = sess.get(f"{API}/profile", headers=h(token))
        assert r.status_code == 200, r.text
        p = r.json()["profile"]
        assert p["identitas"]["nama"] == user["nama"]
        assert p["identitas"]["nim"] == nim
        assert p["identitas"]["email"] == ""
        assert p["tujuan_belajar"] == ""
        assert p["target_belajar"] == [""]
        assert p["mata_kuliah"] == [{"kode": "", "nama": "", "sks": ""}]

    def test_put_profile_persists(self, sess):
        nim, token, _ = register_student(sess)
        r = sess.put(f"{API}/profile", headers=h(token), json={"profile": SAMPLE_PROFILE})
        assert r.status_code == 200, r.text
        assert r.json()["profile"]["tujuan_belajar"] == SAMPLE_PROFILE["tujuan_belajar"]
        # GET verifies persistence
        r = sess.get(f"{API}/profile", headers=h(token))
        assert r.status_code == 200
        p = r.json()["profile"]
        assert p["identitas"]["alamat_rumah"] == "Jl. Merdeka 10"
        assert p["identitas"]["awal_tahun_kuliah"] == "2023"
        assert p["target_belajar"] == SAMPLE_PROFILE["target_belajar"]
        assert len(p["mata_kuliah"]) == 2
        assert p["mata_kuliah"][1]["nama"] == "Manajemen"
        assert p["mata_kuliah"][1]["sks"] == "4"
        # update again (overwrite semantics)
        p2 = {**SAMPLE_PROFILE, "tujuan_belajar": "Berubah"}
        assert sess.put(f"{API}/profile", headers=h(token), json={"profile": p2}).status_code == 200
        assert sess.get(f"{API}/profile", headers=h(token)).json()["profile"]["tujuan_belajar"] == "Berubah"

    def test_profile_isolated_per_user(self, sess):
        _, t1, _ = register_student(sess, "p1")
        nim2, t2, _ = register_student(sess, "p2")
        sess.put(f"{API}/profile", headers=h(t1), json={"profile": SAMPLE_PROFILE})
        p2 = sess.get(f"{API}/profile", headers=h(t2)).json()["profile"]
        assert p2["identitas"]["nim"] == nim2
        assert p2["tujuan_belajar"] == ""

    def test_worksheet_get_embeds_owner_profile(self, sess):
        """GET /api/worksheets/{id} must embed the owner's saved profile."""
        nim, token, _ = register_student(sess)
        sess.put(f"{API}/profile", headers=h(token), json={"profile": SAMPLE_PROFILE})
        wid = sess.post(f"{API}/worksheets", headers=h(token),
                        json={"title": "TEST_ws_profile", "data": {"semester": "1", "weeks": 9}}).json()["id"]
        r = sess.get(f"{API}/worksheets/{wid}", headers=h(token))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("profile") is not None, "worksheet response missing embedded profile"
        assert body["profile"]["identitas"]["alamat_rumah"] == "Jl. Merdeka 10"
        assert len(body["profile"]["mata_kuliah"]) == 2
        # worksheet data no longer carries identitas/tujuan/mata_kuliah
        assert "identitas" not in body["data"]
        sess.delete(f"{API}/worksheets/{wid}", headers=h(token))

    def test_admin_sees_student_profile_on_worksheet(self, sess):
        r = sess.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200, r.text
        admin_token = r.json()["token"]
        nim, token, _ = register_student(sess, "adm")
        sess.put(f"{API}/profile", headers=h(token), json={"profile": SAMPLE_PROFILE})
        wid = sess.post(f"{API}/worksheets", headers=h(token), json={"title": "TEST_ws_admin_profile"}).json()["id"]
        r = sess.get(f"{API}/worksheets/{wid}", headers=h(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert body["profile"]["identitas"]["nama"] == SAMPLE_PROFILE["identitas"]["nama"]
        assert body["nim"] == nim
        sess.delete(f"{API}/worksheets/{wid}", headers=h(token))

    def test_worksheet_dynamic_weeks_persist(self, sess):
        """Weeks + jadwal minggu values (incl. added weeks) persist through PUT."""
        _, token, _ = register_student(sess, "wk")
        wid = sess.post(f"{API}/worksheets", headers=h(token), json={"title": "TEST_ws_weeks"}).json()["id"]
        data = {
            "semester": "2",
            "weeks": 11,
            "jadwal_semester": [
                {"mata_kuliah": "Manajemen (4)", "minggu": ["2"] * 11, "catatan": "ok"},
            ],
            "target_mingguan": [{"mata_kuliah": "Manajemen (4)", "rows": [
                {"minggu": "1", "target": "Modul 1", "halaman": "1-20", "waktu": "2 jam",
                 "media": "BMP", "ketercapaian": "Ya", "penyebab": "-", "solusi": "-"}]}],
            "sq3r": {"survey": {"judul_bmp": "BMP A", "jumlah_sks": "4", "judul_kegiatan": ["K1"]},
                     "questions": ["Q1"], "read": "notes", "recite": ["R1"],
                     "review": {"terjawab": ["T1"], "dipahami": ["D1"], "belum_dipahami": ["B1"]}},
            "peta_konsep": "peta",
        }
        r = sess.put(f"{API}/worksheets/{wid}", headers=h(token), json={"data": data})
        assert r.status_code == 200, r.text
        got = sess.get(f"{API}/worksheets/{wid}", headers=h(token)).json()["data"]
        assert got["weeks"] == 11
        assert len(got["jadwal_semester"][0]["minggu"]) == 11
        assert got["jadwal_semester"][0]["mata_kuliah"] == "Manajemen (4)"
        assert got["target_mingguan"][0]["rows"][0]["ketercapaian"] == "Ya"
        assert got["sq3r"]["review"]["belum_dipahami"] == ["B1"]
        assert got["peta_konsep"] == "peta"
        sess.delete(f"{API}/worksheets/{wid}", headers=h(token))

    def test_planning_and_monitoring_mingguan_round_trip(self, sess):
        """Iteration 4: data.target_mingguan (planning) + data.monitoring_mingguan round-trip verbatim."""
        _, token, _ = register_student(sess, "mg")
        wid = sess.post(f"{API}/worksheets", headers=h(token), json={"title": "TEST_ws_mingguan"}).json()["id"]
        data = {
            "semester": "1",
            "weeks": 9,
            "jadwal_semester": [{"mata_kuliah": "Sistem Operasi (3)", "minggu": ["1"] * 9, "catatan": "Senin dan Rabu"}],
            "target_mingguan": [{"mata_kuliah": "Sistem Operasi (3)", "rows": [
                {"minggu": "1", "target": "Modul 1", "halaman": "34 Halaman", "media": "Modul, Google", "jam": "3"},
                {"minggu": "2", "target": "Modul 2", "halaman": "20 Halaman", "media": "BMP", "jam": "2"},
            ]}],
            "monitoring_mingguan": [{"mata_kuliah": "Sistem Operasi (3)", "rows": [
                {"minggu": "1", "target": "Pengenalan", "halaman_target": "34", "halaman_realisasi": "34",
                 "waktu_target": "3", "waktu_realisasi": "3", "media": "Modul", "ketercapaian": "Ya",
                 "penyebab": "-", "solusi": "-"},
                {"minggu": "2", "target": "Proses", "halaman_target": "20", "halaman_realisasi": "10",
                 "waktu_target": "2", "waktu_realisasi": "1", "media": "Google", "ketercapaian": "Tidak",
                 "penyebab": "Sibuk", "solusi": "Tambah jam"},
            ]}],
        }
        r = sess.put(f"{API}/worksheets/{wid}", headers=h(token), json={"data": data})
        assert r.status_code == 200, r.text
        got = sess.get(f"{API}/worksheets/{wid}", headers=h(token)).json()["data"]
        pl = got["target_mingguan"][0]
        assert pl["mata_kuliah"] == "Sistem Operasi (3)"
        assert len(pl["rows"]) == 2
        assert pl["rows"][0] == data["target_mingguan"][0]["rows"][0]
        assert pl["rows"][1]["jam"] == "2"
        mo = got["monitoring_mingguan"][0]
        assert len(mo["rows"]) == 2
        assert mo["rows"][0]["ketercapaian"] == "Ya"
        assert mo["rows"][1]["ketercapaian"] == "Tidak"
        assert mo["rows"][1]["halaman_realisasi"] == "10"
        assert mo["rows"][1]["waktu_realisasi"] == "1"
        assert mo["rows"][1]["penyebab"] == "Sibuk"
        assert got["jadwal_semester"][0]["catatan"] == "Senin dan Rabu"
        sess.delete(f"{API}/worksheets/{wid}", headers=h(token))


# ---------------- CORS ----------------
class TestCors:
    def test_cors_credentials_with_explicit_origin(self, sess):
        r = sess.options(
            f"{API}/auth/login",
            headers={
                "Origin": BASE_URL,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        allow_origin = r.headers.get("access-control-allow-origin")
        allow_creds = r.headers.get("access-control-allow-credentials")
        assert allow_origin is not None, f"no CORS headers: {dict(r.headers)}"
        # wildcard + credentials is invalid per spec
        assert not (allow_origin == "*" and allow_creds == "true"), \
            "CORS returns Access-Control-Allow-Origin: * together with credentials=true (invalid, browser blocks cookies)"


# ---------------- Cleanup ----------------
@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    try:
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        env = dotenv_values("/app/backend/.env")

        async def run():
            c = AsyncIOMotorClient(env["MONGO_URL"])
            db = c[env["DB_NAME"]]
            users = await db.users.find({"nim": {"$regex": "^TEST"}}).to_list(500)
            ids = [str(u["_id"]) for u in users]
            await db.worksheets.delete_many({"user_id": {"$in": ids}})
            await db.worksheets.delete_many({"title": {"$regex": "^TEST_"}})
            await db.users.delete_many({"nim": {"$regex": "^TEST"}})
            c.close()

        asyncio.run(run())
    except Exception as e:
        print(f"cleanup failed: {e}")
