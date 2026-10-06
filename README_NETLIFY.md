APLIKASI GURU HEBAT — V16 NETLIFY

V16 disiapkan khusus untuk deployment Netlify dengan Netlify Functions modern.
Backend AI tidak lagi bergantung pada Express/serverless-http/OpenAI SDK di dalam paket. Function memakai Web API fetch dan memanggil OpenAI Responses API secara server-side. Ini membuat paket lebih ringan dan mengurangi masalah bundling dependency.

PENTING: untuk fitur OpenAI, gunakan deployment berbasis Git (direkomendasikan) atau Netlify CLI. Netlify Drop/manual deploy adalah untuk situs statis dan tidak menjalankan proses build Functions secara penuh.

STRUKTUR:
- index.html
- assets/
- netlify/functions/api.mjs
- netlify.toml
- package.json

ENDPOINT:
- /api/health
- /api/validate-sources
- /api/generate
- /.netlify/functions/api juga tersedia sebagai endpoint function bawaan

ENVIRONMENT VARIABLES DI NETLIFY:
OPENAI_API_KEY = API key OpenAI Bapak
OPENAI_MODEL = gpt-6-luna (opsional; default sudah gpt-6-luna)

JANGAN memasukkan API key ke index.html atau file yang diunggah ke publik.

DEPLOY PALING MUDAH:
1. Ekstrak ZIP.
2. Masukkan seluruh isi folder ke GitHub sebagai satu repository.
3. Di Netlify: Add new project -> Import an existing project -> GitHub.
4. Pilih repository tersebut.
5. Build command: echo Guru Hebat V16
6. Publish directory: .
7. Deploy.
8. Di Project configuration -> Environment variables, pastikan OPENAI_API_KEY sudah ada untuk Functions.
9. Setelah perubahan variable, lakukan deploy baru.
10. Uji https://NAMA-SITUS.netlify.app/api/health.

Jika hasil health menunjukkan openai_configured:true, buka aplikasi dan gunakan Eksekusi Online.
