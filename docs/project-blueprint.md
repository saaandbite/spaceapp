# **Blueprint Proyek NASA Space Apps Challenge 2026: "Is It a Meteor Shower?"**

# **1\. Identitas & Konsep Utama Proyek**

* **Nama Proyek:** Is It a Meteor Shower? (Opsi Subjudul: *Uncovering NASA's Meteorite Trends & Impact Risks*)  
* **Kategori Challenge:** Be An Earth System Trend Detective\!  
* **Jadwal Pelaksanaan (Hack Day):** 14–15 November 2026 (Persiapan riset, data mining, dan perancangan arsitektur dilakukan sebelum Hack Day).  
* **Filosofi UI/UX:** Playful Interactive Explainer & Sandbox (terinspirasi oleh *Neal.fun Asteroid Launcher* dan *Brilliant.org*) menggunakan prinsip *Progressive Disclosure* (satu fokus informasi per layar, analogi sehari-hari yang mudah dicerna, dan simulasi di atas peta jalan/satelit asli).  
* **Alasan Pemilihan Judul:** Mengangkat pertanyaan detektif ketika orang awam melihat lonjakan data penemuan meteorit NASA pasca-1970 ("Apakah Bumi sedang mengalami hujan meteor?"), lalu membantahnya secara ilmiah menggunakan Machine Learning serta membedakan antara fenomena *meteor shower* (debu komet yang habis terbakar di atmosfer) dengan *meteorite landings* (batuan padat yang mencapai permukaan Bumi).

---

# **2\. Rumusan Masalah (Problem Statement)**

Proyek ini menyelesaikan tiga masalah kritis sekaligus (Scientific, Civil Defense, & Spatial Translation):

1. **Ilusi Tren & Anomali Data Mentah (The False Trend & Dirty Data Problem):**  
   * Dataset mentah NASA (*Meteorite Landings*, 45.716 baris) tampak seolah-olah menunjukkan Bumi dihujani meteorit 66,6 kali lebih sering sejak tahun 1970-an (melonjak dari 136 temuan di dekade 1900-an menjadi 9.061 temuan di dekade 1990-an), serta menampilkan 6.214 titik jatuh palsu di Teluk Guinea pada koordinat `(0.0, 0.0)` (*Null Island*).  
   * Tanpa pembersihan dan pemodelan *Data Mining*, data ini menghasilkan kesimpulan tren sistem Bumi yang keliru.  
2. **Titik Buta Mitigasi "Chelyabinsk Blindspot" (Airburst vs. Crater Impact):**  
   * Saat bolide Chelyabinsk meledak di Rusia (2013), lebih dari 1.500 orang terluka karena mendekati jendela kaca setelah melihat kilatan cahaya dan terkena hempasan pecahan kaca dari gelombang kejut udara (*airburst shockwave*).  
   * Masyarakat dan otoritas lokal sering mengira semua meteorit membentuk kawah di darat (*crater*). Padahal, hasil ekstraksi fitur pada 31.911 data bersih NASA membuktikan bahwa **90,84% meteorit adalah Ordinary Chondrite (batu silikat, kekuatan tarik 35 MPa)** yang meledak di atmosfer (ketinggian 15–30 km), sedangkan hanya **3,49% meteorit Iron/Stony-Iron (logam, 350 MPa)** yang sanggup menghantam tanah secara utuh.  
3. **Kesenjangan Angka Fisika Abstrak vs. Konteks Spasial Lokal:**  
   * Satuan energi astronomi (Joule atau Kiloton TNT) sulit dipahami dampaknya terhadap lingkungan sekitar oleh masyarakat maupun perencana kota, termasuk di Indonesia yang tercatat memiliki 19 rekaman jatuhan meteorit resmi di dataset NASA.

---

# **3\. Pipeline Pre-Processing, EDA, & Hasil Data Mining**

## **A. Audit Trail Pembersihan Data (Data Cleaning Funnel)**

* **Data Mentah Awal (Raw Data):** 45.716 baris (10 kolom).  
* **Penghapusan Missing Values (NaN):** 7.434 baris dihapus (menyisakan 38.282 baris).  
* **Penghapusan Anomali Koordinat Null Island (0.0, 0.0):** 6.214 baris dihapus (menyisakan 32.068 baris).  
* **Penghapusan Anomali Tahun (\>2026, misal typo 2101\) & Massa (\<=0 g):** 157 baris dihapus.  
* **Total Data Bersih Siap Mining:** **31.911 baris (69,80% retensi)**.  
* **Deteksi Outlier Massa (Metode IQR pada log10\_mass\_g):** Q1 \= 0,81 (6,50 g), Q3 \= 2,31 (202,10 g), IQR \= 1,49. Batas atas outlier \= log10\_mass \> 4,54 (**\> 35,04 kg**), menghasilkan **576 meteorit kategori masif (1,81%)**.

## **B. Feature Engineering: 4 Kelas Fisik Komposisi Material (dari kolom recclass)**

| Kelas Komposisi | Proporsi Data | Rata-rata Massa | Median Massa | Rasio Fell | Sifat Fisik Utama | Analogi Playful | Rezim Dampak & Mitigasi Utama |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Iron / Stony-Iron** | 1.113 (3,49%) | 478,04 kg | 9.350 g | 5,30% | Densitas 7,8 g/cm³, Tarik 350 MPa | Seberat Grand Piano (\~270x batu biasa) | *Surface Crater Impact* \-\> Evakuasi ground-zero & defleksi kinetik DART (\>20m). |
| **Achondrite** | 985 (3,09%) | 5,62 kg | 65,31 g | 8,22% | Densitas 3,2 g/cm³, Tarik 65 MPa | Seberat Bola Bowling | Disintegrasi atmosfer menengah-bawah (15–25 km) \-\> Peringatan *overpressure*. |
| **Carbonaceous Chondrite** | 825 (2,59%) | 3,90 kg | 28,00 g | 5,33% | Densitas 2,2 g/cm³, Tarik 5 MPa | Seberat Kucing Rumahan | Disintegrasi termal / *High-Altitude Airburst* (\>35 km) \-\> Gelombang infrasonik. |
| **Ordinary Chondrite** | 28.988 (90,84%) | 1,77 kg | 26,20 g | 3,04% | Densitas 3,4 g/cm³, Tarik 35 MPa | Seberat Laptop | Meledak di stratosfer/troposfer (15–30 km) \-\> Gelombang kejut luas & protokol anti-kaca. |

## **C. Pemodelan Machine Learning (Unsupervised & Supervised)**

### **1\. K-Means Spatial-Mass Clustering (k \= 5\)**

| Cluster ID | Nama Region / Karakteristik Spasial | Jumlah Rekaman | Centroid Lat/Long | Median Massa | % Fell | Interpretasi Tren System |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Cluster 0** | Antarktika (lon rata-rata 97°) | 12.791 | (-76,28°S, 96,74°E) | 4,79 g | 0,02% | Akumulasi sistematis hasil ekspedisi es (search bias). |
| **Cluster 1** | Antarktika (lon rata-rata 107°) | 9.969 | (-75,32°S, 106,97°E) | 67,0 g | 0,31% | Akumulasi sistematis hasil ekspedisi es (search bias). |
| **Cluster 2** | Sahara & Arab | 3.769 | (19,94°N, 58,48°E) | 249,4 g | 9,34% | Gurun kering: pencarian di daratan gundul. |
| **Cluster 3** | Benua berpenduduk (global) | 3.025 | (29,17°N, 10,93°E) | 365,0 g | 14,84% | Wilayah pemukiman manusia: dominasi jatuhan yang teramati (Fell). |
| **Cluster 4** | Amerika Utara (dataran & gurun) | 2.357 | (22,48°N, -93,71°W) | 1,30 kg | 9,76% | Dataran/gurun AS bagian barat-tengah: banyak temuan oleh pemburu meteorit. |

*Catatan Kunci:* Dua klaster Antarktika (C0 + C1) berisi **22.760 rekaman (71,32% dari total data bersih)**; total titik dengan lintang < -60° adalah **22.097 (69,25%)**.

### **2\. Random Forest Classifier (Prediksi Bias Observasi Fell vs. Found)**

* **Akurasi Test Set:** **98,61%**  
* **Skor ROC-AUC:** **0,9946**  
* **Balanced Accuracy:** **0,9112**  
* **Skor PR-AUC:** **0,8541**  
* **Feature Importance:**  
  1. Absolute Latitude `|reclat|`: **30,06%**  
  2. Latitude `reclat`: **29,88%** (Total pengaruh garis lintang = **59,95%**)  
  3. Log10 Mass `log10_mass_g`: **21,86%**  
  4. Longitude `reclong`: **16,69%**  
  5. Composition Iron/Stony-Iron: **0,59%**  
  6. Composition Ordinary Chondrite: **0,46%**  
  7. Composition Achondrite: **0,34%**  
  8. Composition Carbonaceous Chondrite: **0,11%**

---

# **4\. Desain Arsitektur 3 Halaman Aplikasi Web & Rumus Fisika Simulator**

> **Perubahan 14 Nov 2026:** aplikasi kini disusun sebagai 3 halaman — Halaman 1 parallax dokumenter, Halaman 2 Treasure Map, Halaman 3 Drop a Meteor! Simulator.

## **Halaman 1: Parallax Dokumenter Sejarah Meteor Jatuh ke Bumi (menggantikan "The Trend Detective")**

Halaman pembuka berupa dokumenter sejarah meteor yang jatuh ke Bumi, diceritakan dengan efek *parallax* ala film dokumenter berdasarkan dataset yang dimiliki — bukan lagi sekadar carousel grafik dan angka. Angka-angka tetap ada di dalam cerita sebagai bagian dari narasi:

* **Clue 1 (The 1970s Mystery Surge):** Grafik 12 dekade lengkap (1900s–2010s) dengan Dual Y-Axis yang memperlihatkan garis merah datar *Observed Falls* (54–88 per dekade) melawan lonjakan bar ekspedisi es Antarktika pasca-1970.  
* **Clue 2 (Heavy Metal vs. Space Pebbles):** Perbandingan 4 kelas batuan lengkap dengan analogi berat benda sehari-hari (Grand Piano vs Laptop).  
* **Clue 3 (AI Spotter & 5 Earth Zones):** Visualisasi Feature Importance Random Forest (AUC 0,9946) dan 5 klaster K-Means.

## **Halaman 2: "Treasure Map" (Global & Indonesia Spatial Explorer)**

* Memetakan **511 pin terkurasi dari seluruh dunia** (150 meteorit terberat global seperti Hoba 60 ton, Cape York 58,2 ton, Campo del Cielo 50 ton, Canyon Diablo 30 ton, Sikhote-Alin 23 ton \+ sampel berstrata 5 klaster) dengan *coordinate jitter* (±0,15°) pada titik Antarktika agar tidak menumpuk di satu piksel.  
* Menyediakan filter khusus **19 Meteorit Indonesia**, antara lain:  
  * **Prambanan** (DI Yogyakarta/Jateng, 1797, Iron, **500 kg**, Found, 17,27 Ton TNT) — *Default Selected Pin*.  
  * **Jepara** (Jawa Tengah, 2008, Pallasite Iron, **499,5 kg**, Found, 17,25 Ton TNT).  
  * **Djati-Pengilon** (Ngawi, 1884, Ordinary Chondrite H6, **166 kg**, Fell, 5,73 Ton TNT).  
  * **Jumapalo** (Karanganyar, 1984, Ordinary Chondrite L6, **32,49 kg**, Fell, 1,12 Ton TNT).  
  * **Meester-Cornelis** (Jatinegara Jakarta, 1915, Ordinary Chondrite H5, **24,75 kg**, Fell, 0,85 Ton TNT).  
  * Disertai Tjabe (20 kg), Tjerebon (16,5 kg), Bandong (11,5 kg), Tambakwatu (10,5 kg), Rembang (10 kg), Lovina Bali (8,2 kg), Kediri (3,3 kg), Kangean (1,63 kg), Cilimus (1,6 kg), Selakopi (1,59 kg), Ngawi (1,39 kg), Glanggang (1,3 kg), Banten (0,63 kg), dan Madiun (0,4 kg).

## **Halaman 3: "Drop a Meteor\! Simulator" (Real Map Impact & Mitigation Sandbox)**

Menggunakan **Peta Interaktif Leaflet Asli** (pilihan mode Jalan Gelap & Citra Satelit) di mana pengguna dapat memilih kota target atau mengklik titik mana pun di peta:

* **Rumus Energi Kinetik Masuk Atmosfer:**  
  * `E_joules = 0.5 * mass_kg * (velocity_ms ^ 2)` (Kecepatan default `v = 17.000 m/s`).  
  * Konversi TNT: `E_tons_TNT = E_joules / 4.184e9` dan `E_kilotons = E_tons_TNT / 1000`.  
* **Tiga Cincin Radius Bahaya (L.circle dalam satuan Meter Asli di Peta):**  
  1. **Cincin Merah (Crater / Fragment Zone):** `R_crater = 15 * (E_kilotons ^ (1/3))` meter (Dikoreksi dengan faktor sudut masuk; jika batu kondrit \<500 kg meledak di udara, dilabeli sebagai *Fragment Strewn Field / No Surface Crater*).  
  2. **Cincin Oranye (Severe Structural Airblast \>20 psi / Radius Evakuasi):** `R_blast = 220 * (E_kilotons ^ (1/3))` meter (Nilai disinkronkan 100% antara label cincin peta dan teks perintah evakuasi).  
  3. **Cincin Kuning (Window Shatter & Acoustic Shockwave \>1 psi):** `R_glass = 650 * (E_kilotons ^ (1/3))` meter.  
* **Simulasi Pembelokan Lintasan NASA DART (Kinetic Impactor):**  
  * Pergeseran titik jatuh: `Trajectory_Shift_km = (Delta_V_ms * Warning_Lead_Time_seconds) / 1000`.  
  * Contoh terverifikasi (Jumapalo 32,49 kg @ 17 km/s): Energi \= 4,69e9 J (1,12 Ton TNT), Breakup Altitude \= 19,9 km, Radius Pecah Kaca \= 68 m, dan dengan Delta-V 1,0 cm/s selama 30 hari menghasilkan pergeseran lintasan **25,92 km (\~26 km)**.

---

# **5\. Rencana Pengembangan Multi-Dataset Fusion (Sebelum vs. Sesudah Upgrade)**

Bagian ini disusun sebagai bahan diskusi tim untuk menentukan apakah akan mempertahankan versi 1 dataset atau melakukan *Data Fusion* dengan 3 dataset NASA tambahan:

## **A. Ringkasan Sebelum Tambahan Dataset Baru (Versi Single Dataset Saat Ini)**

Sistem mengolah satu dataset utama (NASA Meteorite Landings: 45.716 data mentah \-\> 31.911 data bersih) untuk menjawab tantangan Trend Detective dan mitigasi dampak. Pada Halaman 1, model Random Forest (AUC 0,9946) dan K-Means (5 klaster) membuktikan bahwa jatuhan meteorit yang diamati manusia (Fell) selalu stabil 54–88 kejadian per dekade, sedangkan lonjakan pasca-1970 adalah bias ekspedisi es Antarktika. Pada Halaman 2, sistem memetakan sebaran meteorit di seluruh dunia dari 5 klaster K-Means sekaligus menyediakan sorotan khusus untuk 19 meteorit Indonesia. Pada Halaman 3, pengguna dapat menyimulasikan jatuhnya meteorit ke kota target di atas peta untuk melihat ketinggian pecah atmosfer (breakup altitude), tiga cincin radius bahaya dalam satuan meter/kilometer, protokol pertahanan sipil, serta simulasi defleksi DART.

* **Keterbatasan Versi 1 Dataset:** Wilayah samudra di peta terlihat kosong karena tidak ada manusia yang memungut batu di dasar laut; simulator baru menghitung jarak fisik (meter/km) tanpa estimasi jumlah penduduk terdampak; dan simulasi roket DART memakai sampel batu historis berukuran kecil.

## **B. Ringkasan Sesudah Tambahan Dataset Baru (Versi Multi-Dataset NASA Fusion)**

| Sumber Data Tambahan | Integrasi Fitur di Aplikasi | Nilai Tambah Scientific & UX |
| :---- | :---- | :---- |
| **NASA CNEOS Fireballs & Bolide Data** | Halaman 1 & Halaman 2 (Sebaran titik ledakan bola api satelit 1988–sekarang) | Membuktikan secara visual bahwa 70% meteor meledak di laut. Menambahkan kasus historis **Bolide Bone (Sulut, 2009\)** energi 33 kt TNT di alt 19 km. |
| **NASA SEDAC Population Density** | Halaman 3 (Overlay kepadatan penduduk per km² pada radius dampak) | Memberikan **estimasi kuantitatif jumlah warga** yang berada di dalam radius *window shatter* (\>1 psi) dan *airblast*. |
| **NASA NeoWs API (Live Feed)** | Halaman 3 (Preset pilihan objek asteroid *real-time*) | Memungkinkan simulasi defleksi **NASA DART** pada asteroid nyata berukuran ratusan meter secara presisi. |

---

# **6\. Struktur 5 Slide Pitch Deck & Draf Submission**

| Slide \# | Focus Area | Key Narrative & Visual Elements |
| :---- | :---- | :---- |
| **Slide 1** | **The Hook** | Paradoks lonjakan data 1970-an (136 vs 9.061 temuan) & kasus 1.500 korban luka pecahan kaca Chelyabinsk (90,84% *Airburst* vs 3,49% *Crater*). |
| **Slide 2** | **Data Cleaning & Trend Detective** | Funnel 45.716 \-\> 31.911 baris (6.214 bug *Null Island* dihapus), bukti kestabilan *Observed Falls* (54–88 per dekade), dan pembuktian bias Antarktika (69,25% data) serta lintang populasi via Random Forest (AUC 0,9946). |
| **Slide 3** | **Composition Physics** | Ekstraksi fitur `recclass` yang membuktikan meteorit besi (*Iron*, 350 MPa) memiliki rata-rata massa 478,04 kg (\~270x lebih berat dari *Ordinary Chondrite* 1,77 kg, 35 MPa). |
| **Slide 4** | **Global & Indonesia Spatial Explorer** | Pemetaan 5 klaster K-Means seluruh dunia, perbandingan dengan satelit CNEOS Fireballs di lautan, serta sorotan 19 meteorit darat Indonesia \+ Bolide Bone Sulawesi. |
| **Slide 5** | **Real-Map Impact & DART Simulator** | Demo langsung skenario jatuhan di atas peta jalan/satelit asli, estimasi warga terdampak (SEDAC), protokol *window-shatter* vs evakuasi kawah, dan defleksi lintasan DART. |

# **7\. Daftar Sumber Dataset & Endpoint Resmi NASA (Terverifikasi 2026\)**

*Catatan Penting Migrasi Infrastruktur NASA (2025–2026):*

1. Portal `data.nasa.gov` telah bermigrasi dari platform Socrata lama (`/Space-Science/...` dan `/resource/...`) ke sistem katalog CKAN baru (`/dataset/...` dan `/docs/legacy/...`).  
2. Domain lama Columbia University (`sedac.ciesin.columbia.edu`) telah dinonaktifkan sejak pertengahan 2025 dan seluruh datanya kini dipindahkan secara resmi ke portal **NASA Earthdata Catalog (`earthdata.nasa.gov`)**.

## **A. Dataset Utama (Sudah Diolah)**

* **NASA Open Data Portal — Meteorite Landings (The Meteoritical Society)**  
  * Halaman Katalog Resmi Baru: `https://data.nasa.gov/dataset/meteorite-landings`  
  * Halaman Katalog API: `https://data.nasa.gov/dataset/meteorite-landings-api`  
  * Endpoint File JSON Langsung: `https://data.nasa.gov/docs/legacy/meteorite_landings/gh4g-9sfh.json`  
  * Keterangan: Berisi 45.716 rekaman historis pendaratan meteorit di daratan yang telah dibersihkan menjadi 31.911 baris valid.

## **B. Dataset Tambahan untuk Multi-Dataset Fusion (Link Aktif & Terverifikasi)**

1. **NASA Fireball And Bolide Reports (Sensor Satelit Atmosfer & Lautan)**  
   * **Opsi 1 — Portal Resmi `data.nasa.gov`:**  
     * Halaman Katalog Dataset: `https://data.nasa.gov/dataset/fireball-and-bolide-reports`  
     * Halaman Resource API: `https://data.nasa.gov/dataset/fireball-and-bolide-reports-api/resource/41d11adb-555a-4069-9d38-920936e93c92`  
     * Direct Download File JSON (`data.nasa.gov`): `https://data.nasa.gov/docs/legacy/Fireball_And_Bolide_Reports/mc52-syum.json`  
   * **Opsi 2 — Portal Live NASA JPL CNEOS (Data Terlengkap hingga 2026):**  
     * Tabel Web & Unduh CSV: `https://cneos.jpl.nasa.gov/fireballs/`  
     * Endpoint JSON API Langsung (GET): `https://ssd-api.jpl.nasa.gov/fireball.api?limit=50`  
     * Dokumentasi Resmi API: `https://ssd-api.jpl.nasa.gov/doc/fireball.html`  
2. **NASA Earthdata (Ex-SEDAC) — Gridded Population of the World (GPWv4 Population Density)**  
   * Halaman Katalog Resmi Baru (NASA Earthdata): `https://www.earthdata.nasa.gov/data/catalog/sedac-ciesin-sedac-gpwv4-popdens-r10-4.10`  
   * Alternatif Katalog GPWv4: `https://www.earthdata.nasa.gov/data/catalog/sedac-ciesin-sedac-gpwv4-popdens-4.0`  
   * Informasi Resmi Migrasi SEDAC ke Earthdata: `https://www.earthdata.nasa.gov/news/data-from-sedac-available-again-earthdata-search`  
3. **NASA NeoWs & JPL SSD — Live Asteroid & Planetary Defense API**  
   * **A. NASA Open APIs (`api.nasa.gov` \- NeoWs):**  
     * Browse Data Asteroid (Langsung klik tanpa parameter tanggal): `https://api.nasa.gov/neo/rest/v1/neo/browse?api_key=DEMO_KEY`  
     * Feed Asteroid Harian (Wajib isi `start_date` & `end_date` maksimal 7 hari): `https://api.nasa.gov/neo/rest/v1/feed?start_date=2026-10-25&end_date=2026-10-31&api_key=DEMO_KEY`  
   * **B. NASA JPL CNEOS Sentry API (Monitoring Risiko Tabrakan Asteroid / DART Target):**  
     * Endpoint JSON Langsung (Tanpa API Key): `https://ssd-api.jpl.nasa.gov/sentry.api`  
     * Dokumentasi Sentry API: `https://ssd-api.jpl.nasa.gov/doc/sentry.html`  
   * **C. NASA JPL SBDB Close-Approach Data API:**  
     * Endpoint JSON Langsung (Tanpa API Key): `https://ssd-api.jpl.nasa.gov/cad.api?dist-max=10LD&date-min=2026-01-01&sort=dist`  
     * Dokumentasi CAD API: `https://ssd-api.jpl.nasa.gov/doc/cad.html`