# PRD — Lembar Kerja Belajar Mandiri (Universitas Terbuka)

## Original Problem Statement
Aplikasi web untuk mahasiswa Universitas Terbuka membuat "Lembar Kerja Rencana Belajar & SQ3R" secara online (menggantikan pengisian di kertas). Mahasiswa login dengan NIM, dari dashboard membuat lembar kerja sesuai format dokumen resmi UT.

## User Choices
- Auth: NIM + password, dengan akun admin yang bisa melihat semua lembar kerja.
- Mata kuliah: input manual (kini di Profil, dipakai sebagai dropdown di lembar kerja).
- Banyak lembar kerja per mahasiswa.
- Simpan online + export PDF.
- Desain: biru resmi UT, modern minimalis, tidak terlihat "AI slop".
- Template: mengikuti shadcn dashboard template (sidebar + stat cards + chart + table).

## Architecture
- Frontend: React (CRA), Tailwind, shadcn/ui, recharts, react-router. Fonts: Chivo (heading) + IBM Plex Sans.
- Backend: FastAPI, JWT auth (bcrypt, brute-force lockout), Motor/MongoDB.
- Auth: Bearer token in localStorage ('ut_token'); cookie also set. All routes under /api.

## Data Model
- users: { nim (unique), nama, password_hash, role (student/admin), profile }
  - profile: { identitas{nama,nim,alamat_rumah,nomor_hp,nomor_kontak,email,awal_tahun_kuliah}, tujuan_belajar, target_belajar[], mata_kuliah[{kode,nama,sks}] }
- worksheets: { user_id, nim, nama, title, data{ semester, weeks, jadwal_semester[], target_mingguan[], sq3r{}, peta_konsep }, created_at, updated_at }
- login_attempts: brute-force tracking.

## Personas
- Mahasiswa: isi profil sekali, buat/kelola banyak lembar kerja, cetak PDF.
- Admin: pantau statistik + lihat semua lembar kerja mahasiswa.

## Implemented (as of Jun 2026)
- JWT auth (register/login/logout/me) with NIM, admin seeding, brute-force lockout, malformed-id 404 guard, header-over-cookie precedence.
- Profile GET/PUT (one-time identitas/tujuan/target/mata-kuliah); embedded into worksheet GET for owner & admin.
- Worksheet CRUD with ownership isolation.
- Admin list + stats endpoints.
- Student dashboard: sidebar layout, stat cards, profile-completeness warning, worksheet grid (create/edit/view/delete).
- Profile page.
- Worksheet editor: sections 3–6 (Jadwal per semester with course dropdown + dynamic week columns "Minggu ke- (Jumlah Jam)"; Target Mingguan monitoring with Ya/Tidak; SQ3R; Peta Konsep); autosave + manual save.
- Worksheet view/PDF: full document (profile + worksheet), browser print export.
- Admin panel: sidebar, stat cards, recharts area chart (6-month), searchable worksheet table, view any worksheet.
- Tested: backend 35/35 pytest pass; frontend full E2E pass (iteration_3).

## Backlog / Remaining (optional hardening)
- P2: typed Pydantic sub-models for profile payload.
- P2: explicit CORS origin list (currently '*').
- P2: one-off migration to drop legacy identitas/tujuan from old worksheet docs.

## Test Credentials
- Admin: NIM `admin` / `admin123`
- Student: NIM `0666652216` / `student123`

## UI/UX Redesign (Jul 2025) — Increment 1 IMPLEMENTED
- New design system "UT Modern": fonts Sora (heading) + Plus Jakarta Sans (body); indigo palette (#4F46E5 primary, brand-gradient), soft indigo-tinted shadows, larger radius (--radius 0.85rem, rounded-2xl cards). Files: index.css, tailwind.config.js, public/index.html.
- Global color/font reskin applied to ALL pages (Login, Register, Dashboard, Profile, WorksheetEditor, WorksheetView, AdminPanel, TopNav, DashboardLayout) — old hex (#404080/#29166F/#EAEAF2/etc.) replaced with indigo tokens.
- StatCard: color variants (indigo/teal/amber/coral) + soft shadow. ProgressRing: indigo/teal colors.
- Login/Register: modern split-screen hero (brand-gradient + warm study image + feature bullets), rounded-xl inputs.
- DashboardLayout: refreshed sidebar (gradient logo, rounded-xl active) + NEW mobile bottom navigation (Beranda / Buat FAB / Profil).
- Dashboard: hero greeting ("Halo, {nama}"), dynamic motivation message, gamification (streak, achievement badges 6, ketercapaian). New lib/gamification.js (presentational, uses existing data — no backend change).
- Env restore: /app/backend/.env and /app/frontend/.env were MISSING (env reset) causing backend crash (KeyError MONGO_URL) + frontend API failures. Recreated: backend MONGO_URL(local)/DB_NAME(test_database)/JWT_SECRET/CORS_ORIGINS; frontend REACT_APP_BACKEND_URL=preview endpoint. Seeded sample student data via /tmp/seed.py.
- Verified visually: Login, Dashboard (desktop+mobile), Profile, Editor all render correctly.

### Redesign Backlog (Increment 2 — not yet done, deeper structural)
- Worksheet Editor: convert long form -> stepper + sticky action bar; responsive matrix (table->cards on mobile); SQ3R color-coded stepped cards.
- Admin Panel: refreshed stat cards + chart colors + searchable table -> card list on mobile.
- Worksheet View/PDF: modern paper layout; verify print styles.
- Optional: Dark mode (P2).

