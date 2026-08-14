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
### Direction PIVOT (per user reference mockup): MONOCHROME (black & white) minimalist
- Palette pivoted from indigo -> monochrome (primary #0A0A0A / neutral grays / white bg #F4F4F5). index.css + tailwind brand scale = grayscale. All hardcoded hex reskinned indigo->mono across all pages.
- Fonts kept: Sora (heading) + Plus Jakarta Sans (body).
- DashboardLayout REBUILT to match mockup: white sidebar (UT square logo, "Worksheet UT / Academic Portal"), nav Dashboard/Worksheets/Target Plan/SQ3R Method/Profile (active = solid black), "New Worksheet" black button, Help Center + Logout footer. Topbar = search input + bell + user(name/NIM/avatar). Props changed: nav, primaryAction, headerRight, searchValue, onSearchChange (title/subtitle removed; mobile BottomNav removed, uses hamburger+sheet).
- Dashboard REBUILT to match mockup: black hero "Halo, {name}!" + grad-cap watermark; 4 stat cards (Total Worksheets/Active Courses/Study Hours + Target Completion black ProgressRing); Streak Belajar day timeline (Mon-Fri check/current/future) + "{streak} Hari Beruntun"; Quick Actions 2x2 (New Entry=create, Schedule/Reports scroll/toast, Settings->profile); Recent Worksheets list w/ per-worksheet progress bar + open/delete; Today's Focus from today's reminders. Search filters the list.
- ProgressRing: monochrome black arc. Profile: nav updated to 5-item mockup style + primaryAction.
- Env restore (still valid): backend/.env + frontend/.env were missing; recreated. Sample student data seeded via /tmp/seed.py.
- Verified via screenshots: Dashboard desktop matches mockup closely. NOT yet run E2E testing agent.

### Redesign Backlog (deeper structural, mono style)
- Worksheet Editor / View / Admin: reskinned to mono but layout not restructured to match new language.
- Optional: dark mode.


