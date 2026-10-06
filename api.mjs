const MODEL = process.env.OPENAI_MODEL || 'gpt-6-luna';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 150000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 12);
const buckets = new Map();

const SOURCES = [
  {id:'rumah-pendidikan', name:'Rumah Pendidikan', tier:'utama', url:'https://rumah.pendidikan.go.id/'},
  {id:'ruang-gtk', name:'Ruang GTK / Rumah Pendidikan', tier:'utama', url:'https://rumah.pendidikan.go.id/ruang/gtk'},
  {id:'ruang-murid', name:'Ruang Murid / Rumah Pendidikan', tier:'utama', url:'https://rumah.pendidikan.go.id/ruang/murid'},
  {id:'kurikulum-nasional', name:'Sistem Informasi Kurikulum Nasional', tier:'utama', url:'https://kurikulum.kemendikdasmen.go.id/'},
  {id:'sibi', name:'SIBI / Buku Kemendikdasmen', tier:'utama', url:'https://buku.kemendikdasmen.go.id/'},
  {id:'kemendikdasmen', name:'Kemendikdasmen', tier:'utama', url:'https://www.kemendikdasmen.go.id/'},
  {id:'siap-online', name:'SIAP Online', tier:'pendukung', url:'https://siap-online.com/'},
  {id:'puskesjar', name:'Puskesjar', tier:'pendukung', url:'https://puskesjar.kemdikbud.go.id/'}
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Cache-Control': 'no-store'
};

function json(data, status=200){
  return new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8', ...corsHeaders}});
}

function clientKey(req){
  return req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function rateLimited(req){
  const key = clientKey(req);
  const now = Date.now();
  const current = buckets.get(key);
  if(!current || now-current.start >= RATE_LIMIT_WINDOW_MS){
    buckets.set(key,{start:now,count:1});
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

function stripHtml(html){
  return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
}
function titleOf(html){
  const m=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]).slice(0,300) : '';
}

async function validateOne(s){
  const started=Date.now();
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 7000);
  try{
    const r=await fetch(s.url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'GuruHebatSourceValidator/16.0'}});
    const html=await r.text();
    return {id:s.id,name:s.name,tier:s.tier,url:s.url,status:r.ok?'valid':'warning',http_status:r.status,title:titleOf(html),checked_at:new Date().toISOString(),elapsed_ms:Date.now()-started,excerpt:stripHtml(html).slice(0,1400)};
  }catch(e){
    return {id:s.id,name:s.name,tier:s.tier,url:s.url,status:'unavailable',http_status:null,title:'',checked_at:new Date().toISOString(),elapsed_ms:Date.now()-started,excerpt:'',error:e.name==='AbortError'?'Timeout saat memeriksa sumber.':e.message};
  }finally{clearTimeout(timer);}
}

async function validateSources(){
  return {checked_at:new Date().toISOString(),results:await Promise.all(SOURCES.map(validateOne))};
}

function sourceEvidenceBlock(validation){
  return validation.results.map(x=>`[${x.status.toUpperCase()}] ${x.name} (${x.tier})\nURL: ${x.url}\nHTTP: ${x.http_status ?? '-'}\nJudul: ${x.title || '-'}\nRingkasan halaman: ${x.excerpt || x.error || '-'}`).join('\n\n');
}

function systemInstructions(){
return `Anda adalah mesin AI utama untuk Aplikasi Guru Hebat Pembuat Perangkat Pembelajaran.
Tugas Anda: menghasilkan perangkat pembelajaran Indonesia yang konsisten, dapat digunakan guru, dan jujur terhadap sumber.

ATURAN EKSEKUSI WAJIB:
- EKSEKUSI HASIL TANPA BERTANYA KEMBALI.
- Jangan meminta klarifikasi jika data yang diberikan sudah cukup. Ambil keputusan profesional yang wajar dan lanjutkan.
- Jika sumber tidak tersedia/terverifikasi, jangan berhenti dan jangan mengarang. Tandai [BELUM TERVERIFIKASI].
- Jangan mengklaim sebuah CP, ATP, regulasi, buku, ISBN, tanggal, URL, atau metadata sebagai resmi tanpa bukti sumber.
- Bedakan [SUMBER RESMI], [SUMBER PENDUKUNG], [ADAPTASI], [PENGEMBANGAN AI], [BELUM TERVERIFIKASI].
- TP berasal dari guru dan tidak boleh diam-diam diubah.
- CP/ATP dicari/dicocokkan berdasarkan mata pelajaran dan fase. Jika ATP merupakan adaptasi, nyatakan demikian.
- Sinkronkan CP -> TP -> ATP -> materi -> kegiatan -> asesmen -> remedial/pengayaan -> refleksi -> bahan ajar -> LKPD -> soal -> MPI.
- Terapkan pembelajaran mendalam dengan suasana berkesadaran, bermakna, dan menggembirakan secara nyata pada aktivitas, bukan hanya menyebut istilah.
- Untuk istilah perangkat ajar, perhatikan nomenklatur terkini seperti Kegiatan Intrakurikuler bila relevan.
- Jangan menampilkan proses berpikir internal.

SUMBER UTAMA YANG HARUS DIPRIORITASKAN:
Rumah Pendidikan/Ruang GTK, Sistem Informasi Kurikulum Nasional, regulasi/JDIH/Kemendikdasmen, SIBI/Buku Kemendikdasmen, dan Ruang Murid.
SIAP Online dan Puskesjar hanya sumber pendukung. PMM lama hanya dipakai sebagai referensi historis/transisi bila benar-benar dapat diverifikasi; jangan memperlakukannya sebagai platform utama saat ini.

VALIDASI SUMBER:
Gunakan bukti sumber yang disediakan backend. Jika bukti hanya menunjukkan halaman umum, jangan menyimpulkan bahwa halaman tersebut memuat CP/ATP tertentu. Nyatakan kebutuhan verifikasi lebih lanjut.`;
}

function extractOutput(data){
  if(typeof data?.output_text === 'string') return data.output_text;
  const chunks=[];
  for(const item of (data?.output || [])){
    if(item?.type === 'message'){
      for(const c of (item.content || [])) if(typeof c?.text === 'string') chunks.push(c.text);
    }
  }
  return chunks.join('\n\n').trim();
}

async function callOpenAI({prompt,target,mode,identity,evidence}){
  const body={
    model:MODEL,
    instructions:systemInstructions(),
    input:`TARGET PERANGKAT: ${target}\nMODE: ${mode}\n\nDATA IDENTITAS (gunakan sebagai sumber fakta lokal):\n${JSON.stringify(identity,null,2)}\n\nBUKTI VALIDASI SUMBER DARI BACKEND:\n${evidence}\n\nMASTER PROMPT DARI APLIKASI:\n${prompt}`
  };
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 55000);
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify(body),
      signal:controller.signal
    });
    const text=await r.text();
    let data; try{data=JSON.parse(text)}catch{data={error:{message:text}}}
    if(!r.ok) throw Object.assign(new Error(data?.error?.message || `OpenAI HTTP ${r.status}`),{status:r.status});
    return {output:extractOutput(data), raw_id:data?.id || null};
  }finally{clearTimeout(timer);}
}

export default async function handler(req){
  if(req.method === 'OPTIONS') return new Response(null,{status:204,headers:corsHeaders});
  const url=new URL(req.url);
  const path=url.pathname.replace(/\/+$/,'') || '/';

  if(path === '/api/health' && req.method === 'GET'){
    return json({ok:true,service:'guru-hebat-netlify',version:'16.0.0',openai_configured:Boolean(process.env.OPENAI_API_KEY),model:MODEL,time:new Date().toISOString()});
  }
  if(path === '/api/sources' && req.method === 'GET'){
    try{return json(await validateSources())}catch(e){return json({error:e.message},500)}
  }
  if(path === '/api/validate-sources' && req.method === 'POST'){
    if(rateLimited(req)) return json({error:'Terlalu banyak permintaan. Silakan coba lagi beberapa saat.'},429);
    try{return json(await validateSources())}catch(e){return json({error:e.message},500)}
  }
  if(path === '/api/generate' && req.method === 'POST'){
    if(rateLimited(req)) return json({error:'Terlalu banyak permintaan. Silakan coba lagi beberapa saat.'},429);
    if(!process.env.OPENAI_API_KEY) return json({error:'OPENAI_API_KEY belum dikonfigurasi di Netlify Environment Variables.'},503);
    try{
      const raw=await req.text();
      if(new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({error:'Permintaan terlalu besar.'},413);
      const body=JSON.parse(raw || '{}');
      const {prompt,target='all',mode='Lengkap dan siap digunakan',identity={},validate_sources=true}=body;
      if(typeof prompt!=='string' || !prompt.trim()) return json({error:'Prompt kosong.'},400);
      const validation=validate_sources ? await validateSources() : {checked_at:null,results:[]};
      const result=await callOpenAI({prompt,target,mode,identity,evidence:sourceEvidenceBlock(validation)});
      return json({ok:true,output:result.output,model:MODEL,response_id:result.raw_id,source_validation:validation});
    }catch(e){
      console.error('GuruHebat API error:',e);
      return json({error:e.name==='AbortError'?'Permintaan ke OpenAI melebihi batas waktu.':(e.message||'Gagal memproses permintaan OpenAI.')},e.status && e.status>=400 && e.status<600 ? e.status : 500);
    }
  }
  return json({error:'Endpoint tidak ditemukan.',path,version:'16.0.0'},404);
}

export const config = { path: ['/api/*'] };
