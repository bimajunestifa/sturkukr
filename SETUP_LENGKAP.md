# 🏦 BANKIDZZ SETUP LENGKAP & TROUBLESHOOTING

## ✅ Checklist Setup 100%

### 1. VERCEL ENVIRONMENT VARIABLES ✓
Pastikan di Vercel project settings → Environment Variables, ada 3 variable:

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIs...
ADMIN_TOKEN = bankidzz-admin-secure-2026
```

**Cara cek:**
- Vercel Dashboard → Project → Settings → Environment Variables
- Pastikan semua 3 ada dan tidak kosong

### 2. TOKEN ADMIN SETUP ✓
Token yang Anda gunakan: **`bankidzz-admin-secure-2026`**

Di halaman admin (admin.html):
- Klik allow untuk mengambil lokasi
- Akan ada prompt "Masukkan token admin Bankidzz:"
- **Masukkan:** `bankidzz-admin-secure-2026`
- Data akan langsung tampil

### 3. TEMPLATE EDITOR (BARU) ✓
Di admin dashboard, ada bagian baru: **"Edit Template Struk"**

Anda bisa edit:
- **Logo Bank** - emoji atau URL gambar
- **Nama Bank** - nama lengkap bank
- **Subtitle** - singkatan bank
- **Pesan Keselamatan** - badge keamanan  
- **Biaya Transaksi** - dalam RM

Setelah edit → Klik "Simpan Template" → Pengguna baru akan lihat design baru

### 4. DATA FLOW (Alur Data) ✓

```
PENGGUNA (index.html)
    ↓ (Klik "Izinkan Lokasi")
AMBIL LOKASI GPS
    ↓ (POST /api/locations)
VERCEL SERVER
    ↓ (Simpan ke Supabase)
DATABASE SUPABASE
    ↓ (BroadcastChannel + localStorage)
ADMIN (admin.html)
    ↓ (Klik "Refresh")
LIHAT DATA REAL-TIME
```

## 🔧 TROUBLESHOOTING

### Problem: Admin gabisa "Masuk" (Token Error)
**Error:** "Token admin tidak valid. Muat ulang untuk mencoba lagi."

**Solusi:**
1. Buka Vercel → Settings → Environment Variables
2. Pastikan `ADMIN_TOKEN` ada dan nilainya **`bankidzz-admin-secure-2026`**
3. **REDEPLOY** project (ada tombol "Redeploy" di Vercel)
4. Tunggu 2-3 menit, baru refresh halaman admin
5. Masukkan token: `bankidzz-admin-secure-2026`

### Problem: Data tidak muncul di admin
**Gejala:** Lokasi pengguna tidak tampil di tabel transaksi admin

**Solusi:**
1. **Pastikan pengguna:**
   - Buka index.html (bukan admin.html)
   - Klik "IZINKAN LANJUT TRANSAKSI"
   - Tunggu lokasi diambil (ada notif hijau "✅ Lokasi disahkan")
   
2. **Periksa admin:**
   - Refresh halaman admin (F5)
   - Klik tombol "Refresh" di admin
   - Tunggu 5 detik (auto refresh setiap 5 detik)

3. **Jika masih tidak muncul:**
   - Buka Console admin (F12 → Console)
   - Cari error messages
   - Cek apakah token sudah benar

### Problem: Supabase Error
**Error:** "Database tidak dapat menyimpan lokasi" atau "Database tidak dapat dibaca"

**Solusi:**
1. Vercel → Settings → Environment Variables
2. Copy link Supabase ke notepad
3. Buka https://app.supabase.com
4. Cari project dengan URL tersebut
5. Cek apakah **table "bankidzz_locations"** ada
6. Jika tidak ada, buat table dengan kolom:
   - transfer_id (text, primary key)
   - sender (text)
   - receiver (text)
   - amount (text)
   - total (text)
   - latitude (number)
   - longitude (number)
   - accuracy (number)
   - captured_at (timestamp)
   - status (text)
   - verification_code (text)
   - consented_at (timestamp)

### Problem: Template tidak berubah
**Gejala:** Edit template di admin, tapi struk pengguna tidak berubah

**Solusi:**
1. **Pastikan sudah klik "Simpan Template"** (hijau)
2. Buka index.html (halaman pengguna) **di tab baru**
3. Template akan otomatis load dari admin
4. Jika masih tidak muncul:
   - Buka Console (F12)
   - Cari "Template loaded from admin"
   - Jika ada error, cek localStorage (F12 → Application → Local Storage)

## 📱 CARA PAKAI SISTEM

### Untuk Pengguna (index.html):
1. Buka index.html
2. Klik "IZINKAN LANJUT TRANSAKSI"
3. Izinkan akses lokasi di browser
4. Tunggu tanda ✅ "Lokasi Disahkan"
5. Klik "HANTAR SLIP"
6. Data otomatis terkirim ke admin

### Untuk Admin (admin.html):
1. Buka admin.html
2. Masukkan token: `bankidzz-admin-secure-2026`
3. Lihat daftar transaksi real-time
4. Klik "🗺️ Lihat" untuk lihat lokasi di peta
5. Edit template di section "Edit Template Struk"
6. Klik "Hapus" untuk delete transaksi
7. Klik "Export" untuk download CSV

## 🛠️ DEPLOYMENT FINAL

Sebelum go-live:

```bash
# 1. VERCEL
- Settings → Environment Variables
- Pastikan 3 variable ada

# 2. DATABASE
- Supabase → Create table bankidzz_locations
- Column sesuai di atas

# 3. TEST
- Buka index.html → Izinkan lokasi
- Buka admin.html → Input token
- Lihat apakah data muncul

# 4. CUSTOMIZE
- Edit template di admin
- Ubah nama bank, logo, biaya
- Klik Simpan

# 5. PRODUCTION
- Siap untuk production use!
```

## 📞 Support
Jika ada error, lihat:
1. Console browser (F12 → Console)
2. Network tab (F12 → Network) - cek request ke `/api/locations`
3. Vercel logs (Vercel Dashboard → Deployments → Function logs)
4. Supabase logs (Supabase Dashboard → Logs)

---
**Version:** 3.1 | **Last Updated:** September 2026 | **Status:** ✅ Ready for Production
