# PRD — Redesign UI/UX Work‑sheet‑UT
**Aplikasi:** Lembar Kerja Belajar Mandiri — Universitas Terbuka
**Versi dokumen:** 1.0 · **Status:** Draft menunggu persetujuan · **Tanggal:** Juli 2025
**Tipe pekerjaan:** Redesign UI/UX menyeluruh (frontend), backend & data model tidak berubah

---

## 1. Ringkasan Eksekutif
Work‑sheet‑UT saat ini fungsional dan rapi bergaya "dokumen resmi minimalis" (biru UT `#404080`, Chivo + IBM Plex Sans, layout sidebar). Namun tampilannya terasa kaku, kurang optimal di HP, dan belum memotivasi mahasiswa untuk konsisten belajar.

Redesign ini bertujuan mengubah aplikasi menjadi **modern, ramah (friendly), mobile‑first, dan memotivasi** — tanpa mengubah alur bisnis, API, maupun struktur data yang sudah berjalan. Fokusnya murni pada lapisan presentasi: sistem desain baru, tata letak baru, komponen baru, ilustrasi, mikro‑interaksi, dan elemen gamifikasi ringan.

**Prinsip pagar pengaman:** semua endpoint `/api`, data model MongoDB, dan logika autentikasi TETAP. Redesign hanya menyentuh `frontend/src` (komponen, halaman, styling, Tailwind/theme). Semua `data-testid` yang ada dipertahankan agar test tetap lolos.

---

## 2. Latar Belakang & Masalah (dari jawaban stakeholder)
Motivasi redesign (semua dipilih):
- **Tampilan kuno/kaku** — nuansa terlalu formal, kurang menarik secara visual.
- **Usability** — beberapa alur (terutama editor lembar kerja yang panjang) membingungkan.
- **Mobile buruk** — layout sidebar + tabel matriks sulit dipakai di layar kecil.
- **Kurang memotivasi** — tidak ada umpan balik progres yang membuat mahasiswa semangat & konsisten.

Arahan gaya: **Modern & friendly** (warna lebih hangat, ilustrasi, sudut membulat). **Bebas** mengeksplorasi palet baru. Redesign mencakup **semua halaman**.

---

## 3. Tujuan & Non‑Tujuan

### 3.1 Tujuan (Goals)
1. Menghadirkan **design system baru** yang modern, hangat, konsisten, dan reusable.
2. Membuat pengalaman **mobile‑first** yang nyaman (bottom navigation, tabel yang adaptif, form bertahap).
3. Menyederhanakan **Worksheet Editor** menjadi alur bertahap (stepper) yang tidak melelahkan.
4. Menambahkan **lapisan motivasi/gamifikasi ringan** (progress ring, streak, badge, pesan dorongan) yang memakai data yang sudah ada.
5. Meningkatkan **estetika & keramahan** dengan ilustrasi, empty state yang hidup, dan mikro‑interaksi halus.
6. Menjaga **aksesibilitas** (WCAG AA) dan **tidak merusak** fungsionalitas/test yang ada.

### 3.2 Non‑Tujuan (Non‑Goals)
- Tidak mengubah skema database, kontrak API, atau logika auth.
- Tidak menambah fitur produk baru yang butuh backend baru (mis. notifikasi email, kolaborasi real‑time).
- Tidak mengubah format resmi isi Lembar Kerja (Identitas, Tujuan/Target, Mata Kuliah, Jadwal per Semester, SQ3R, Peta Konsep) — hanya penyajiannya.
- Dark mode = **opsional (P2)**, dikerjakan hanya jika waktu memungkinkan.

---

## 4. Metrik Keberhasilan
- **Kualitatif:** UI terasa modern/friendly (validasi via review stakeholder & testing agent).
- **Konsistensi:** 100% halaman memakai token design system baru (warna, radius, shadow, tipografi).
- **Mobile:** Semua halaman utama bebas horizontal‑scroll yang tidak disengaja pada viewport 375px; navigasi bawah tersedia.
- **Regression:** 0 kegagalan pada test frontend E2E yang sudah ada (semua `data-testid` tetap ada).
- **Aksesibilitas:** kontras teks lolos AA; fokus keyboard terlihat jelas.

---

## 5. Persona (tetap)
- **Mahasiswa UT** — login NIM, mengisi profil sekali, membuat/mengelola banyak lembar kerja, ingin terdorong untuk konsisten belajar. Sering akses lewat HP.
- **Admin** — memantau statistik & melihat semua lembar kerja mahasiswa. Akses lewat desktop.

---

## 6. Design System Baru ("UT Modern")

### 6.1 Arah Visual
Modern‑friendly‑academic: bersih dan lapang, sudut membulat, bayangan lembut, sentuhan ilustrasi & warna hangat sebagai aksen, namun tetap terpercaya untuk konteks institusi pendidikan.

### 6.2 Palet Warna (baru, tetap berjangkar biru UT)
Kita evolusikan biru UT menjadi indigo yang lebih hidup, lalu tambahkan aksen hangat & warna semantik.

| Token | Hex | Penggunaan |
|---|---|---|
| `--brand-700` (primary deep) | `#312E81` | teks brand, hover tombol utama |
| `--brand-600` (primary) | `#4F46E5` | tombol utama, state aktif, link |
| `--brand-500` | `#6366F1` | aksen, ikon aktif |
| `--brand-100` (soft) | `#E0E7FF` | background chip/aktif, ring lembut |
| `--brand-50` | `#EEF2FF` | background section lembut |
| `--accent-amber` | `#F59E0B` | streak/energi, highlight motivasi |
| `--accent-coral` | `#FB7185` | badge/reward, aksen hangat |
| `--accent-teal` | `#14B8A6` | sukses sekunder, progres |
| `--success` | `#16A34A` | status "Ya"/tercapai |
| `--warning` | `#F59E0B` | peringatan profil belum lengkap |
| `--danger` | `#EF4444` | hapus/error |
| `--bg-app` | `#F7F7FB` | latar aplikasi (indigo‑tinted off‑white) |
| `--surface` | `#FFFFFF` | kartu/permukaan |
| `--text-main` | `#1E1B2E` | teks utama |
| `--text-muted` | `#6B7280` | teks sekunder |
| `--border` | `#E7E7F0` | garis/pembatas |

> Catatan: `#404080` lama boleh dipertahankan sebagai "UT heritage blue" khusus untuk header dokumen PDF agar cetakan tetap resmi; UI aplikasi memakai indigo baru.

### 6.3 Tipografi
- **Heading:** `Sora` atau tetap `Chivo` (friendly‑geometric) — usulan pindah ke **Sora** untuk kesan lebih modern & hangat.
- **Body/data:** `Plus Jakarta Sans` (ramah, lokal‑Indonesia, sangat terbaca) menggantikan IBM Plex Sans. Fallback tetap tersedia.
- Skala: `h1 text-3xl md:text-4xl font-bold`, `h2 text-2xl font-semibold`, `h3 text-lg font-semibold`, `body text-sm/base leading-relaxed`, `label text-xs font-semibold uppercase tracking-wide text-muted`.

### 6.4 Bentuk, Bayangan, Gerak
- **Radius:** `rounded-2xl` (16px) untuk kartu/kontainer, `rounded-xl` untuk tombol/input, `rounded-full` untuk chip/avatar/badge. (Lebih membulat dari sebelumnya sesuai arah "friendly".)
- **Shadow:** bayangan lembut berlapis (`shadow-sm` default, `shadow-md` saat hover) dengan tint indigo tipis — bukan shadow keras.
- **Motion:** transisi spesifik (`transition-colors`, `transition-transform` 150–250ms), `active:scale-[0.98]`, hover lift halus pada kartu. Hindari `transition-all`. Hormati `prefers-reduced-motion`.
- **Ikon:** tetap `lucide-react`, ukuran konsisten, warna mengikuti token.
- **Ilustrasi/emoji:** ilustrasi ringan pada empty state, onboarding, dan reward. Boleh pakai emoji hemat untuk kehangatan (mis. 🎯🔥✨) — konsisten & tidak berlebihan.

### 6.5 Komponen Inti (di atas shadcn/ui)
Perbarui/standardkan: `Button` (varian primary/soft/ghost/danger), `Card` (radius+shadow baru), `Input/Select/Textarea` (fokus ring indigo lembut), `Badge/Chip`, `StatCard` (varian warna + ikon berlatar lembut), `ProgressRing` (dipakai lebih luas), `Tabs/Stepper`, `EmptyState`, `Skeleton loader`, `Sticky action bar`, `BottomNav` (mobile), `Sheet` menu.

---

## 7. Spesifikasi Redesign per Halaman

### 7.1 Kerangka Aplikasi (Shell)
- **Desktop:** sidebar dipertahankan namun disegarkan (item nav rounded‑full saat aktif, avatar & greeting lebih hangat, brand mark baru).
- **Mobile:** ganti drawer‑only dengan **Bottom Navigation** tetap (Beranda, Buat, Profil) + top bar tipis. Tombol "Buat" jadi tombol tengah menonjol (FAB‑style).
- Header sticky dengan blur lembut dipertahankan.

### 7.2 Login & Register
- Layout **split‑screen** di desktop: kiri form, kanan panel brand bergradasi indigo dengan ilustrasi belajar + tagline motivasi. Di mobile: brand ringkas di atas, form di bawah.
- Input lebih besar & ramah, tombol utama penuh‑lebar, state loading jelas, pesan error ramah.
- Sentuhan: kartu form melayang di atas latar bergradasi lembut.

### 7.3 Dashboard Mahasiswa (prioritas utama)
- **Hero sapaan** personal: "Halo, {nama} 👋" + kalimat motivasi dinamis + ilustrasi kecil.
- **Stat cards** disegarkan: tiap kartu punya warna aksen + ikon berlatar lembut (Total Lembar Kerja, Mata Kuliah, Jam Belajar, Ketercapaian). Ketercapaian pakai **ProgressRing**.
- **Kartu Motivasi/Gamifikasi** (lihat §8): streak belajar, badge terbaru, dorongan.
- **Pengingat Belajar**: disegarkan jadi timeline/hari‑ini yang lebih visual (chip mata kuliah, penanda "hari ini").
- **Grid Lembar Kerja**: kartu lebih hidup — ikon dokumen berwarna, mini progress bar ketercapaian per lembar, hover lift, aksi (Isi/Lihat/Hapus). Empty state ilustratif.
- Peringatan profil belum lengkap: banner ramah dengan CTA jelas.

### 7.4 Worksheet Editor (perbaikan usability terbesar)
- Ubah dari satu halaman panjang menjadi **stepper bertahap** dengan progres di atas: 
  1) Ringkasan/Identitas (read‑only dari profil) → 2) Tujuan & Target → 3) Jadwal per Semester → 4) SQ3R → 5) Peta Konsep.
- **Sticky action bar** bawah: status autosave ("Tersimpan ✓"), tombol Simpan, tombol Lihat/PDF, navigasi Sebelumnya/Berikutnya.
- **Tabel matriks Jadwal & Target Mingguan** dibuat responsif: di mobile berubah jadi kartu per baris (bukan tabel yang meluber). Di desktop tetap tabel rapi dengan header berlatar lembut.
- **SQ3R** disajikan sebagai kartu bertahap bernomor dengan warna aksen berbeda tiap tahap (Survey/Question/Read/Recite/Review) agar memandu.
- Autosave dipertahankan; tambahkan indikator visual yang jelas.

### 7.5 Worksheet View / PDF
- Tampilan layar: dokumen bergaya "kertas" modern, lapang, hierarki jelas, tombol **Export PDF** menonjol (sticky).
- **Print styles**: pertahankan format resmi & keterbacaan; header cetak boleh memakai "UT heritage blue" `#404080` dan teks "UNIVERSITAS TERBUKA". Pastикan tabel & section pecah halaman rapi.

### 7.6 Profil
- Form dikelompokkan dalam kartu bagian: Identitas, Tujuan & Target Belajar, Daftar Mata Kuliah (tabel/daftar yang bisa ditambah‑hapus). 
- **Indikator kelengkapan profil** (progress) di atas untuk mendorong pengisian. Validasi ramah.

### 7.7 Admin Panel
- Tetap padat‑data namun disegarkan: stat cards baru, area chart recharts dengan warna brand baru, tabel lembar kerja **searchable** (NIM/Nama) dengan baris yang lebih terbaca, dan tampilan detail lembar kerja mana pun.
- Di mobile: tabel jadi daftar kartu ringkas.

---

## 8. Modul Motivasi & Gamifikasi (ringan, tanpa backend baru)
Menggunakan data yang sudah ada (jumlah lembar kerja, tabel monitoring Ya/Tidak, jam belajar, jadwal). Semua dihitung di frontend.
- **Progress Ring Ketercapaian** — ringkasan dari tabel monitoring mingguan.
- **Streak belajar** — hitung "hari aktif" berdasarkan jadwal & aktivitas (heuristik frontend); tampilkan 🔥 dengan angka.
- **Badge/Milestone** — mis. "Lembar Kerja Pertama", "5 Mata Kuliah Terjadwal", "80% Target Tercapai". Murni tampilan berbasis data yang ada.
- **Pesan dorongan dinamis** — kalimat berbeda sesuai progres (rendah → menyemangati, tinggi → apresiasi).
- **Confetti/mikro‑reward** halus saat menyelesaikan lembar kerja atau mencapai milestone (hormati reduced‑motion).

> Catatan: gamifikasi bersifat **presentational**. Jika ke depan ingin persistensi streak/badge sungguhan, itu masuk backlog terpisah (butuh field baru — di luar scope redesign ini).

---

## 9. Aksesibilitas & Kualitas
- Kontras teks memenuhi WCAG AA (khususnya teks di atas warna brand).
- Semua field punya label + aria yang sesuai; fokus keyboard terlihat (ring indigo 2px).
- Target sentuh mobile ≥ 44px.
- Hormati `prefers-reduced-motion` untuk semua animasi/confetti.
- Pertahankan seluruh atribut `data-testid` yang ada + tambahkan untuk elemen baru.

---

## 10. Pendekatan Teknis
- Perubahan hanya di `frontend/src` + konfigurasi Tailwind/`index.css` (token warna, font, radius, shadow).
- Tambahkan CSS variables/theme tokens agar konsisten & mudah dirawat (siapkan struktur yang memudahkan dark mode P2).
- Ganti import font (Google Fonts: Sora + Plus Jakarta Sans) di `index.html`/`index.css`.
- Reuse shadcn/ui + Tailwind murni untuk section kompleks; hindari over‑engineering.
- Gunakan `vision_expert_agent` untuk ilustrasi/gambar (hero login, banner dashboard, empty state) — maksimal sesuai kebutuhan.
- Tidak mengubah `.env`, port, atau prefix `/api`.

---

## 11. Rencana Implementasi Bertahap (setelah PRD disetujui)
**Fase 0 — Fondasi Design System**
- Setup token warna/font/radius/shadow di Tailwind + `index.css`; ganti font; buat/segarkan komponen inti (Button, Card, StatCard, ProgressRing, EmptyState, BottomNav, Stepper). *Uji: halaman contoh render benar, tak ada regresi build.*

**Fase 1 — Shell + Auth**
- Redesign DashboardLayout (sidebar + bottom nav mobile), Login, Register. *Uji: navigasi & login flow (kredensial di §13).*

**Fase 2 — Dashboard + Gamifikasi**
- Hero sapaan, stat cards baru, kartu motivasi/streak/badge, pengingat, grid lembar kerja, empty state. *Uji: data render, aksi CRUD kartu jalan.*

**Fase 3 — Worksheet Editor (stepper + responsif)**
- Stepper, sticky action bar, tabel adaptif, SQ3R berkartu, autosave indicator. *Uji: isi & simpan lembar kerja, autosave, mobile.*

**Fase 4 — Worksheet View/PDF + Profil**
- View modern + print styles, Profil berkartu + indikator kelengkapan. *Uji: export PDF, simpan profil.*

**Fase 5 — Admin Panel**
- Stat cards, chart, tabel searchable, detail. *Uji: login admin, cari & lihat lembar kerja.*

**Fase 6 — QA menyeluruh**
- Jalankan testing agent E2E, cek mobile 375px, aksesibilitas, pastikan semua `data-testid` ada. (Dark mode P2 opsional.)

Setiap fase diakhiri verifikasi; backend testing hanya jika ada perubahan backend (tidak ada di scope ini).

---

## 12. Risiko & Mitigasi
- **Regresi test E2E** → pertahankan semua `data-testid`, uji tiap fase.
- **Perubahan font/warna merusak keterbacaan/PDF** → jaga PDF pakai heritage blue & uji cetak.
- **Tabel matriks di mobile** → pola "tabel → kartu" pada breakpoint kecil.
- **Gamifikasi menyesatkan** → jelaskan bahwa metrik berbasis data yang ada; hindari klaim yang butuh backend.
- **Scope besar (semua halaman)** → dikerjakan bertahap per fase dengan checkpoint persetujuan bila perlu.

---

## 13. Kredensial Uji (tetap)
- Admin: NIM `admin` / `admin123`
- Mahasiswa: NIM `0666652216` / `student123`

---

## 14. Pertanyaan Terbuka (bisa diputuskan saat implementasi)
1. Setuju pindah font ke **Sora + Plus Jakarta Sans**, atau pertahankan Chivo?
2. Setuju palet **indigo** baru (dengan heritage blue khusus PDF)?
3. Dark mode dikerjakan sekarang (P2) atau ditunda?

> Default bila tak ada arahan: pakai Sora + Plus Jakarta Sans, palet indigo, dark mode ditunda.
