# BANKIDZZ - QUICK START GUIDE

## 🚀 Mulai Cepat

### 1. Start Server (Terminal/PowerShell)

```powershell
cd c:\xampp\htdocs\sturkukr
node server.js
```

**Output yang diharapkan:**
```
==================================================
  BANKIDZZ - LOCAL SERVER
==================================================
  Server berjalan di: http://localhost:3000
  Admin token: bankidzz-admin-secure-2026
  Data disimpan: C:\xampp\htdocs\sturkukr\data.json

  URL:
    - Pengguna: http://localhost:3000
    - Admin: http://localhost:3000/admin.html

  Tekan Ctrl+C untuk berhenti
==================================================
```

---

### 2. Akses Halaman

Buka di browser:

| Halaman | URL |
|---------|-----|
| Pengguna (Transfer) | http://localhost:3000 |
| Admin (Dashboard) | http://localhost:3000/admin.html |

---

## 🎯 Cara Menggunakan

### A. UNTUK PENGGUNA (Halaman Utama)

1. Buka http://localhost:3000
2. Klik "IZINKAN LANJUTKAN TRANSFER"
3. Izinkan akses lokasi
4. Lihat slip transaksi dengan template dari admin
5. Klik "KIRIM SLIP KEPADA PENERIMA"

---

### B. UNTUK ADMIN (Dashboard)

1. Buka http://localhost:3000/admin.html
2. Scroll ke bagian **"Edit Template Struk"**

#### Upload Logo Bank:
1. Klik button "Pilih Logo"
2. Pilih file gambar (JPG, PNG, GIF)
3. Logo akan muncul di pratinjau

#### Ubah Warna:
1. Klik color picker (kotak warna biru)
2. Pilih warna yang diinginkan
3. Pratinjau struk akan berubah warna

#### Edit Informasi:
- **Nama Bank**: "BANK SENTRAL INDONESIA"
- **Subtitle**: "BSI"
- **Judul Dokumen**: "Bukti Transfer Bank"
- **Biaya Transaksi**: "150000" (Rp)

#### Simpan Perubahan:
1. Klik "Simpan Template"
2. Notifikasi: "Template disimpan berhasil"
3. Perubahan akan otomatis diterapkan ke halaman pengguna

#### Reset ke Default:
1. Klik "Reset Default"
2. Semua pengaturan kembali normal

---

## 📊 Tracking Data

### Melihat Data Lokasi Pengguna:
1. Di Admin dashboard
2. Bagian **"Tracking Lokasi Pengguna"**
3. Klik "Refresh" untuk update
4. Lihat Latitud, Longitud, Ketepatan

### Melihat Daftar Transaksi:
1. Di Admin dashboard
2. Scroll ke bagian **"Senarai Transaksi"**
3. Tabel menampilkan semua transfer yang dikirim
4. Klik "Buka di Google Maps" untuk lihat lokasi

---

## 💾 Penyimpanan Data

- **Template Admin**: Tersimpan di `localStorage` browser
- **Transaksi Pengguna**: Tersimpan di `data.json`

Untuk reset semua data:
```bash
# Hapus file data.json
del c:\xampp\htdocs\sturkukr\data.json

# Server akan membuat file baru otomatis
```

---

## 🐛 Troubleshooting

### Server tidak berjalan?
```bash
# Pastikan di folder yang benar
cd c:\xampp\htdocs\sturkukr

# Pastikan Node.js terinstall
node --version

# Coba jalankan kembali
node server.js
```

### Halaman blank/error?
1. Buka browser console (F12)
2. Lihat error message
3. Pastikan server masih berjalan
4. Refresh halaman (Ctrl+F5)

### Template tidak berubah?
1. Simpan template di admin
2. Refresh halaman pengguna (Ctrl+F5)
3. atau buka tab baru

### Lokasi tidak terekam?
1. Pastikan izinkan akses lokasi ke browser
2. Browser harus online atau lokal
3. Klik "Refresh" di admin untuk sync

---

## 📝 Default Values

| Pengaturan | Nilai Default |
|-----------|------------------|
| Nama Bank | BANK SENTRAL INDONESIA |
| Subtitle | BSI |
| Judul Dokumen | Bukti Transfer Bank |
| Warna | #183153 (Navy) |
| Biaya Transaksi | 150000 Rp |
| Logo | Tidak ada (LOGO text) |

---

## 🔒 Keamanan Testing

**Token Admin (untuk production):**
```
bankidzz-admin-secure-2026
```

**Catatan:** Token ini hanya valid di Vercel production dengan header:
```
Authorization: Bearer bankidzz-admin-secure-2026
```

---

## 📱 Test di Mobile

### Menggunakan Android/iPhone:
1. Pastikan PC dan mobile di WiFi sama
2. Cari IP address PC: `ipconfig` (lihat IPv4)
3. Di mobile buka: `http://<IP>:3000`

### Contoh:
```
PC IP: 192.168.1.5
Mobile buka: http://192.168.1.5:3000
```

---

## 🎨 Customization Tips

### Ubah Default Template:
Buka `admin.js` cari `defaultTemplate`:
```javascript
const defaultTemplate = {
    logo: null,
    primaryColor: '#183153',  // Ubah warna di sini
    bankName: 'BANK SENTRAL INDONESIA',  // Ubah nama
    bankSub: 'BSI',
    docTitle: 'Bukti Transfer Bank',
    fee: '150000'  // Ubah biaya default
};
```

### Ubah Currency Range:
Buka `script.js` cari `amount =`:
```javascript
let amount = Math.floor(Math.random() * (3000000 - 500000)) + 500000;
// Format: (MAX - MIN) + MIN
// Sekarang: 500.000 - 3.000.000 Rp
```

---

## ✅ Verifikasi Setup

Klik link dan verifikasi:
- [ ] http://localhost:3000 - Halaman pengguna tampil
- [ ] http://localhost:3000/admin.html - Admin dashboard tampil
- [ ] Console (F12) - Tidak ada error kritis
- [ ] Template - Logo dapat diupload
- [ ] Warna - Color picker bekerja
- [ ] Bahasa - Semua dalam Indonesia
- [ ] Currency - Format Rp bukan RM

---

## 📞 Dukungan

Jika ada masalah:
1. Cek console (F12) untuk error details
2. Pastikan terminal server masih aktif
3. Coba refresh halaman
4. Coba clear browser cache (Ctrl+Shift+Del)

---

**Version:** 3.2
**Last Updated:** 12 September 2026
**Ready for:** Testing & Demo
