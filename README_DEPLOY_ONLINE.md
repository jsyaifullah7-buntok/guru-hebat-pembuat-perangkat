# Aplikasi Guru Hebat — Deploy Online V14

Versi ini disiapkan untuk deploy sebagai satu Web Service Node.js di Render.
Frontend HTML dan backend OpenAI berjalan pada alamat web yang sama.

## Yang perlu disiapkan
1. Akun GitHub untuk menyimpan kode.
2. Akun Render untuk hosting.
3. OpenAI API key untuk fitur Eksekusi Online.

## Deploy dengan Render Blueprint
1. Upload seluruh isi folder V14 ini ke sebuah repository GitHub.
2. Pastikan file `render.yaml` berada di root repository.
3. Di Render pilih **New > Blueprint** lalu hubungkan repository tersebut.
4. Saat diminta, isi `OPENAI_API_KEY` dengan API key milik Anda. Jangan masukkan API key ke GitHub.
5. Render akan menjalankan `cd server && npm install`, kemudian `cd server && npm start`.
6. Health check menggunakan `/api/health`.
7. Setelah deploy berhasil, Render memberikan alamat HTTPS `*.onrender.com`.

## Model
Default API model: `gpt-6-luna`. Model dapat diganti melalui `OPENAI_MODEL` di Environment Render.

## Keamanan
- API key hanya berada di environment server.
- `.env` masuk `.gitignore`.
- Endpoint validasi dan generasi memiliki rate limit sederhana.
- Jangan pernah menaruh API key di `index.html`, GitHub, atau file ZIP publik.

## Catatan paket gratis
Render menyediakan Web Service gratis untuk pengujian, tetapi free service dapat berhenti sementara setelah tidak aktif dan aktif kembali ketika menerima permintaan. Untuk penggunaan sekolah/instansi yang membutuhkan ketersediaan lebih stabil, gunakan paket berbayar setelah tahap uji selesai.
