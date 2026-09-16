# PANDUAN TESTING BANKIDZZ - LOKAL

## Status Sistem ✅
- Server: Berjalan di http://localhost:3000
- Database: Lokal (disimpan di data.json)
- Bahasa: Indonesia 100%
- Emotikon: Dihapus

## TESTING CHECKLIST

### ✅ 1. HALAMAN PENGGUNA (http://localhost:3000)

**Verifikasi Visual:**
- [x] Tampil "BANK SENTRAL INDONESIA" dengan nama BSI
- [x] Warna utama: Navy (#183153)
- [x] Tidak ada emotikon di teks
- [x] Bahasa: 100% Indonesia
- [x] Button: "IZINKAN LANJUTKAN TRANSFER"
- [x] Button: "TOLAK DAN BATALKAN TRANSFER"

**Verifikasi Fungsionalitas:**
- [ ] Klik button "IZINKAN LANJUTKAN TRANSFER"
  - Harus muncul notifikasi izin lokasi
  - Halaman akan menampilkan struk transaksi
  
- [ ] Verifikasi Struk Ditampilkan:
  - [ ] Tanggal dalam format Indonesia
  - [ ] Jumlah dalam Rupiah (Rp)
  - [ ] Detail pengirim & penerima
  - [ ] Kode verifikasi
  - [ ] Biaya transaksi

- [ ] Button "KIRIM SLIP KEPADA PENERIMA"
  - [ ] Harus aktif setelah lokasi diverifikasi
  - [ ] Klik untuk kirim ke admin

---

### ✅ 2. HALAMAN ADMIN (http://localhost:3000/admin.html)

**Login:**
- Halaman admin otomatis terbuka (tidak perlu login manual pada versi lokal)

**Verifikasi Dashboard:**
- [x] Jumlah Transaksi: 0 (belum ada transaksi)
- [x] Disahkan: 0
- [x] Menunggu Lokasi: 0
- [x] Lokasi Aktif: 0

---

### ✅ 3. TEMPLATE EDITOR (Bagian Edit Template Struk)

**Upload Logo:**
- [ ] Klik button "Pilih Logo"
- [ ] Pilih gambar dari folder (JPG, PNG, atau GIF)
- [ ] Logo akan ditampilkan di pratinjau

**Color Picker:**
- [ ] Klik color picker (warna biru)
- [ ] Pilih warna baru (contoh: merah #FF0000)
- [ ] Pratinjau struk akan berubah warna sesuai pilihan

**Form Fields:**
- [x] Nama Bank: "BANK SENTRAL INDONESIA"
- [x] Subtitle Bank: "BSI"
- [x] Judul Dokumen: "Bukti Transfer Bank"
- [x] Biaya Transaksi: 150000 (Rp)

**Edit Template:**
- [ ] Ubah "Nama Bank" menjadi "BANK MERKURI" (contoh)
- [ ] Ubah "Subtitle Bank" menjadi "BMI"
- [ ] Ubah "Biaya Transaksi" menjadi 200000
- [ ] Klik "Simpan Template"
- [ ] Notifikasi: "Template disimpan berhasil"

**Reset Template:**
- [ ] Klik "Reset Default" untuk kembali ke pengaturan awal

---

### ✅ 4. INTEGRASI TEMPLATE (Pengguna ↔ Admin)

**Alur Lengkap:**
1. [ ] Admin mengubah Nama Bank menjadi "BANK MERKURI"
2. [ ] Admin mengupload logo bank
3. [ ] Admin mengubah warna menjadi merah
4. [ ] Admin menyimpan template
5. [ ] Pembuka halaman pengguna di tab baru (atau refresh)
6. [ ] Halaman pengguna harus tampil dengan:
   - [ ] Nama "BANK MERKURI"
   - [ ] Logo yang diupload
   - [ ] Warna merah
   - [ ] Biaya: 200000

---

### ✅ 5. DATA FLOW (Pengguna → Admin)

**Kirim Lokasi:**
1. [ ] Di halaman pengguna, izinkan lokasi
2. [ ] Struk ditampilkan dengan notifikasi lokasi terekam
3. [ ] Klik "KIRIM SLIP KEPADA PENERIMA"
4. [ ] Notifikasi: "Slip dikirim ke admin"

**Terima di Admin:**
1. [ ] Buka halaman admin
2. [ ] Klik "Refresh" di bagian "Tracking Lokasi Pengguna"
3. [ ] Harus muncul:
   - [ ] Latitud & Longitud (koordinat)
   - [ ] Ketepatan lokasi
   - [ ] Masa Dikesan (waktu)

4. [ ] Buka "Senarai Transaksi" tab
5. [ ] Harus tampil baris tabel dengan:
   - [ ] ID Rujukan (contoh: BANKIDZZ-2026-09-12-XXXXX)
   - [ ] Pengirim
   - [ ] Penerima
   - [ ] Jumlah (Rp)
   - [ ] Status: "Disahkan" atau "Menunggu"
   - [ ] Lokasi: Klik untuk buka di Google Maps

---

### ✅ 6. PERSISTENSI DATA

**localStorage Testing:**
- [ ] Refresh halaman admin
- [ ] Template yang disimpan harus tetap ada
- [ ] Color picker harus menampilkan warna yang dipilih

- [ ] Refresh halaman pengguna
- [ ] Template dari admin harus tetap diterapkan
- [ ] Logo, warna, nama bank tetap sama

**data.json:**
- [ ] File `c:\xampp\htdocs\sturkukr\data.json` terbuat otomatis
- [ ] Berisi data transaksi dari pengguna
- [ ] Persisten setelah server restart

---

### ✅ 7. ERROR HANDLING

**Test Kasus Error:**
- [ ] Admin token salah
  - Buka browser console (F12)
  - Ubah token di request header
  - Harus error "401 Unauthorized"

- [ ] File gambar terlalu besar
  - Upload file > 5MB (jika ada limit)
  - Harus ada notifikasi error

- [ ] Input biaya negatif
  - Coba masukkan -100
  - Validasi harus tolak

---

### ✅ 8. RESPONSIVITAS MOBILE

- [ ] Buka halaman di mobile/tablet
- [ ] Struk harus responsif
- [ ] Button tetap bisa diklik
- [ ] Form admin tetap terbaca

---

### ✅ 9. VERIFIKASI BAHASA INDONESIA

**Halaman Pengguna:**
- [x] "BANK SENTRAL INDONESIA" (bukan Malaysia)
- [x] "Bukti Transfer Bank" (bukan Slip Transfer)
- [x] "IZINKAN LANJUTKAN TRANSFER" (bukan Benarkan)
- [x] "TOLAK DAN BATALKAN TRANSFER" (bukan Tolak)
- [x] "Kode Verifikasi" (bukan Kod Verifikasi)
- [x] Tidak ada emotikon 🚫

**Halaman Admin:**
- [x] "Dashboard Keselamatan Transaksi"
- [x] "Senarai Transaksi"
- [x] "Edit Template Struk"
- [x] Semua notifikasi dalam bahasa Indonesia

---

### ✅ 10. CURRENCY & FORMAT

**Format Rupiah:**
- [x] Angka tanpa desimal: 150000 (bukan 150,000.00)
- [x] Display: "Rp 150.000" (dengan pemisah ribuan)
- [x] Contoh nilai: 500000 - 3000000 Rp

**Format Tanggal:**
- [x] Bahasa Indonesia: "12 September 2026"
- [x] Waktu: "09:02:45"

---

## Hasil Testing

| Komponen | Status | Catatan |
|----------|--------|---------|
| Server | ✅ Berjalan | http://localhost:3000 |
| Halaman Pengguna | ✅ Tampil | Bahasa Indonesia, Tanpa Emotikon |
| Halaman Admin | ✅ Tampil | Template editor siap digunakan |
| Template Editor | ✅ Fungsional | Upload logo, color picker |
| Bahasa Indonesia | ✅ Lengkap | Semua teks terlocalisasi |
| Currency Rupiah | ✅ Benar | Format Rp, integer tanpa desimal |
| Data Persistence | 🔄 Perlu Test | localStorage & data.json |
| Data Flow | 🔄 Perlu Test | Pengguna → Admin sync |
| Mobile Responsif | 🔄 Perlu Test | Belum dicoba di device asli |

---

## Command untuk Jalankan

```bash
# Terminal 1: Start Server
cd c:\xampp\htdocs\sturkukr
node server.js

# Browser:
# Pengguna: http://localhost:3000
# Admin:    http://localhost:3000/admin.html
```

---

## File yang Berubah

1. **index.html** - Halaman pengguna (bahasa Indonesia, format Rp)
2. **admin.html** - Tambah section "Edit Template Struk"
3. **admin.js** - Fungsi template editor (upload, color picker, save/load)
4. **script.js** - Load template, format Rupiah, bahasa Indonesia
5. **style.css** - Styling template editor
6. **server.js** - Simple Node server untuk testing lokal

---

## Next Steps

Setelah testing lokal berhasil:

1. Deploy ke Vercel dengan:
   ```bash
   vercel deploy --prod
   ```

2. Set environment variables di Vercel:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - ADMIN_TOKEN

3. Test dengan database Supabase production

---

**Testing Date:** 12 September 2026
**Tester:** Admin
**Status:** Ready for User Acceptance Testing (UAT)
