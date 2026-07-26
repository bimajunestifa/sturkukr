# Konfigurasi Bankidzz di Vercel

Kode aplikasi sudah menggunakan Supabase melalui Vercel Function. Supaya
penyimpanan lintas perangkat aktif:

1. Buat proyek Supabase.
2. Buka **SQL Editor**, tempel isi `supabase.sql`, lalu jalankan.
3. Di Vercel buka **Project > Settings > Environment Variables**.
4. Tambahkan variabel berikut untuk lingkungan Production:

   - `SUPABASE_URL`: URL proyek Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: service role key dari Supabase.
   - `ADMIN_TOKEN`: kata sandi acak yang panjang untuk membuka data admin.

5. Deploy ulang proyek di Vercel.
6. Buka `admin.html` dan masukkan nilai `ADMIN_TOKEN` ketika diminta.

`SUPABASE_SERVICE_ROLE_KEY` tidak boleh ditaruh di `script.js`, dibagikan, atau
diawali dengan `NEXT_PUBLIC_`. Lokasi hanya dikirim setelah pengguna menekan
tombol izin dan browser berhasil mendapatkan koordinat.
