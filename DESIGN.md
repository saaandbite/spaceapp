# DESIGN.md — "Is It a Meteor Shower?" (Halaman 1, The Documentary)

Keputusan desain hasil riset parallax/scrollytelling (Apple canvas scrub,
NYT Snow Fall, The Pudding sticky-graphic, Firewatch layered depth,
Scrollama). Ditulis 2026-11-15, sebelum pembangunan ulang Halaman 1.

## Arah visual yang dipilih: A — gelap-dokumenter, foto-penuh
- Bukan template ungu-biru + kartu kaca. Suasana dibawa foto/video asli
  Chelyabinsk (3 webp + mp4 yang sudah ada di `assets/`), bukan gradasi.
- Satu aksen fungsional: **amber api meteor** — warna yang berasal dari
  subjek, bukan dari template.

## Token (hanya berlaku di Halaman 1, lewat `body.doc`)
- `--bg: #0c0c11` — tinta pekat, datar, tanpa gradasi
- `--ink: #ece8df` — putih kertas hangat
- `--muted: #9a978c`
- `--accent: #ff9e3d` — amber api meteor
- `--danger: #ff5a3c`
- `--line: rgba(236,232,223,.14)` — garis tipis, bukan kartu kaca

## Tipografi
- Display/judul: **Fraunces** (serif editorial, opsional italic untuk kutipan),
  fallback Georgia, serif.
- Tubuh: **Inter**, fallback system sans.
- Angka/data: **IBM Plex Mono** (mis. `66,6×`, `31.911`, `54–88`),
  fallback ui-monospace.
- Kicker/dateline: caps kecil + letter-spacing (konvensi jurnalisme).
- Selain kicker, teks memakai sentence case. Tidak ada badge di mana-mana.

## Gerak (fondasi: Lenis + GSAP ScrollTrigger via CDN)
- Lenis: smooth scroll (input scroll stabil). GSAP ScrollTrigger: pin + scrub.
- Mekanik inti: (a) reveal saat masuk viewport, (b) pinned/sticky scene —
  grafik menempel sementara langkah teks bergulir, (c) scrub — animasi
  terikat posisi scroll dan bisa mundur.
- Hero: 3 lapis kecepatan berbeda (video lambat → jejak meteor sedang →
  teks cepat) + zoom-out panorama saat scroll.
- Bab 2 & 5: grafik sticky di satu kolom, langkah teks di kolom lain;
  tiap langkah mengubah state grafik (bukan satu grafik per bab).
- Bab 3: teks berlangkah di atas adegan full-bleed.
- Bab 4: satu kelas material per langkah (bukan grid 4 kartu seragam).
- Fallback: tanpa GSAP pun halaman harus tetap terbaca — layout sticky
  murni CSS, langkah digerakkan IntersectionObserver, grafik dijaga
  `safeChart` (CDN Chart.js boleh gagal, cerita tetap tampil).
- `prefers-reduced-motion`: semua gerakan dimatikan.
- `ScrollTrigger.refresh()` setelah Chart.js render / gambar termuat.

## v4.2 — grafik di-styling ulang, bukan default Chart.js (2026-11-15)
Haris: grafik masih sangat AI slop. Penyebabnya: Chart.js default —
batang pelangi (merah/kuning/hijau/biru), grid abu-abu, 2 sumbu
berjudul, legenda, nilai tersembunyi di tooltip. Dirombak ke sistem
editorial halaman (IBM Plex Mono, satu aksen amber): tanpa legenda,
tanpa grid, tanpa sumbu kedua; batang slate tenang + amber hanya
untuk yang sedang dibahas langkah itu; nilai dilabel langsung di
grafik lewat plugin directLabels (tanpa dependensi baru) — total di
atas tiap kolom dekade (terbesar 9,061 amber), jumlah di ujung tiap
batang material, % di ujung tiap batang fitur; label bersih
("Komposisi …"/"|lintang|" diganti Inggris rapi); tooltip gelap
berbingkai amber; copy disesuaikan ("red line" → "amber line",
caption Bab 2 ditulis ulang). Catatan implementasi: fungsi format
tidak boleh disimpan di options.plugins (proxy Chart.js akan
MEMANGGIL fungsi apa pun di sana — sempat membuat grafik Bab 4
kosong + pageerror; diperbaiki pakai kunci string + peta
LABEL_FORMATS). Terverifikasi: 3 grafik render, 0 page error,
label 823 di Bab 2 diberi halo gelap supaya terbaca di atas garis.
Preview v4.2 dikirim 15 Nov ~09:45 WIB (berlaku s.d. 17 Nov 09:45 WIB), belum di-push.
Haris: di Bab 1 & 4 angka HASIL (bukan angka bab) lari ke atas saat
scroll. Penyebabnya tween v4 di dalam panel: angka y: −80, grafik
y: +40 — panelnya menempel, isinya kabur ke atas. Terukur sebelum
perbaikan: Bab 1 drift 49px, Bab 4 drift 29px selama panel menempel.
Prinsip yang benar: panel yang menempel ADALAH lapis latar (kecepatan
0) dan langkah teks adalah foreground (1:1) — beda kecepatan itulah
parallax-nya. Angka hasil dan grafik di dalam panel harus menempel
ke panelnya: drift DIHAPUS, drift terukur 0px sesudahnya. Yang
bergerak di dalam panel hanya glow dekoratif di belakang konten
(y: +30, pelan, seperti latar) dan angka berdenyut skala 1,05 saat
nilainya berganti (pulseNum, transform-origin kiri — tanpa translasi).
Riset: github.com/greensock/GSAP + demo ScrollTrigger (data-speed,
section scrub, pin). Haris benar: v3 masih terasa sticky dan ada narasi
yang hilang (dissolve HP) serta nav HP terpotong.
- Parallax mengikuti kanon GSAP: tiap lapis beda kecepatan, scrub: 1
  (lag halus), ease: 'none' (gerak murni ikut scroll). Latar bergerak
  sedikit, foreground lebih jauh. Hero: video +120px, jejak −90px,
  teks −170px. Judul bab: −40px. Pita & finale: background pan 20→80%.
  Isi panel scrolly: angka −80px, grafik +40px. Pin hanya dipakai untuk
  panel grafik (pola pin ScrollTrigger sendiri) — gerak di dalamnya
  kontinu dan multi-kecepatan.
- Narasi tidak pernah di-fade: dissolve HP DIHAPUS. Sebagai gantinya,
  scene di HP jadi LINEAR: visual menempel hilang → pita gradasi 30vh,
  tiap langkah membawa angka besarnya sendiri (::before dari
  data-lat/data-big) di atas teksnya. Tidak bisa tumpang tindih, teks
  selalu terbaca.
- Responsif: nav HP jadi hamburger (tombol + dropdown, nav.js),
  .btn-group wrap, jejak hero HP pindah ke bawah layar.
- Ikon: tetap SVG stroke, nol emoji di Halaman 1.
Haris (UI/UX designer) membedakan sticky vs parallax: sticky = panel
menempel, parallax = lapisan bergerak dengan KECEPATAN BERBEDA. Maka:
- Pita foto: gambar menggeser di dalam bingkainya (scrub
  background-position 20% → 80%, attachment scroll — satu mekanisme).
- Panel scrolly: isi panel bergerak beda kecepatan saat langkah bergulir —
  angka besar naik pelan (yPercent −14), grafik turun sedikit (+5),
  sementara teks langkah bergerak 1:1.
- Hero tetap 3 lapis kecepatan berbeda.
- Adegan overlay (Bab 3, Tunguska) memakai layout SPLIT di desktop:
  angka raksasa di kiri, kartu narasi di kanan — keduanya tidak pernah
  berbagi zona, jadi tidak bisa tumpang tindih di posisi scroll mana pun.
  Di HP tetap susun vertikal (angka atas, kartu bawah).
- Ikon: TIDAK ADA emoji di Halaman 1 — semua ikon inline SVG stroke
  (meteor, petir, orbit, film, peta, ledakan). Logo nav juga SVG.
  (Halaman 2–3 masih memakai emoji Syuu; di luar cakupan rework ini,
  kecuali logo nav yang sudah disamakan.)
- Teks tidak pernah diredupkan sampai sulit dibaca: reveal global dimatikan
  di Halaman 1, langkah non-aktif 85% (bukan 32%), hero tidak di-fade,
  langkah aktif ditandai garis amber.

## Anti "AI slop" (cek sebelum push)
- [ ] Tidak ada gradasi ungu-biru, glow cyan, atau starfield generik.
- [ ] Tidak ada grid kartu identik; satu bab = satu visual besar + langkah.
- [ ] Tidak ada emoji sebagai ikon — semua ikon inline SVG stroke.
- [ ] Hero rata kiri dengan klaim spesifik, bukan headline generik di tengah.
- [ ] Setiap gerakan membawa informasi (angka nyata, foto peristiwa nyata
      dengan caption + kredit).
- [ ] Byline tim, dateline per bab, sumber data, dan satu kalimat metode.

## Referensi
- https://pudding.cool/process/scrollytelling-sticky/
- https://github.com/russellsamora/scrollama (sticky-side / sticky-overlay)
- https://webdevpuneet.com/ui-snippets/scroll-pin-story/
- https://ui.wensity.com/blog/how-to-recreate-apples-scroll-driven-product-pages-in-react
- https://motionkit.io/blog/parallax-effect-website-examples

## Asset repo yang dipakai (2026-11-15, atas izin Haris)
- Foto: 3 webp Chelyabinsk (panorama_02, trail_01, trail_03) — hero, pita foto.
- Video: flash 1080p + orbit 1080p (switcher hero) + kompilasi 4 klip 2160p
  (tombol switcher ketiga; file 40 MB hanya dimuat bila diklik).
- Still dari kompilasi 2160p (diambil dengan ffmpeg, 1920w webp):
  `chelyabinsk_dashcam_fireball.webp` (09:20:35) → pita foto baru;
  `chelyabinsk_dashcam_flash.webp` (09:26:32) → latar finale.
- Artikel riset `assets/articles/` (Space.com, Big Think, Planetary Society,
  EarthSky): sumber interlude Tunguska 1908 (2.150 km², 80 juta pohon,
  5–10 km, 10–15 megaton, 0 kawah) dan detail Chelyabinsk (lebih terang dari
  Matahari, 7.200+ bangunan). Angka-angka itu dikutip dari artikel tim,
  bukan dari dataset — dan diberi atribusi di halaman.
