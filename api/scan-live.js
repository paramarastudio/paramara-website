
export const GEMINI_PROMPT = `
Anda adalah pakar AI Vision OCR terdepan untuk mengekstrak data Laporan Shopee Live dari screenshot HP.
Anda mungkin diberikan 1 atau 2 screenshot HP sekaligus (Screenshot Atas: Metrik Utama & Interaksi; Screenshot Bawah: Produk Terjual & Traffic Source).

Tugas Anda:
Bacalah seluruh teks, angka, metrik interaksi, dan daftar produk dari SEMUA gambar yang diberikan, lalu kembalikan JSON murni persis dengan struktur ini (tanpa markdown triple backticks):

{
  "title": "string (Judul Sesi, contoh: APOTEK 24 JAM DISC UP TO 50%)",
  "startTime": "string (Waktu mulai, contoh: 01-08-2026 21:37)",
  "duration": "string (Durasi live, contoh: 01:27:11)",
  "revenue": number (Penjualan Rp tanpa titik/koma, contoh: 232500),
  "grossCommission": number (Estimasi Komisi Kotor Studio 10% dari GMV Rp, contoh: 23250),
  "activeViewers": number (Penonton Aktif, contoh: 7),
  "commentsCount": number (Komentar, contoh: 1),
  "cartAdditions": number (Masuk Keranjang, contoh: 5),
  "clickRatePercent": number (Persentase Klik, contoh: 32.1),
  "ordersPerClickPercent": number (Pesanan per Klik, contoh: 11.1),
  "totalOrders": number (Pesanan, contoh: 1),
  
  "totalViews": number (Ditonton / Total Penonton, contoh: 28),
  "avgWatchDuration": "string (Rata-Rata Durasi Menonton, contoh: 00:00:50)",
  "commentRatePercent": number (Persentase Komentar, contoh: 3.6),
  "peakConcurrentViewers": number (Penonton Terbanyak, contoh: 3),
  "likes": number (Disukai, contoh: 76),
  "shares": number (Dibagikan, contoh: 1),

  "trafficSources": [
    { "name": "Video", "percent": 18.0 },
    { "name": "Tab Live & Video", "percent": 14.0 },
    { "name": "Beranda", "percent": 11.0 }
  ],

  "products": [
    {
      "name": "string (Nama Lengkap Produk)",
      "price": number (Harga Rp),
      "revenue": number (Penjualan Rp),
      "clicks": number (Klik),
      "cartAdds": number (Masuk Keranjang)
    }
  ],

  "aiSummary": "string (Format ringkasan AI persis: 'Sesi live berdurasi [durasi] menghasilkan Rp[revenue] ([nama produk terlaris]). CTR tinggi di [clickRatePercent]%. [totalViews] total penonton dengan rata-rata durasi [avgWatchDuration].')"
}
`;

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    console.error('[SERVERLESS ERROR] Gemini API Key is missing in Vercel configuration');
    return res.status(500).json({ error: 'Gemini API Key tidak terpasang di server Vercel. Harap tambahkan VITE_GEMINI_API_KEY di settings environment variables.' });
  }

  const { images } = req.body || {};
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Mohon kirimkan setidaknya satu gambar screenshot.' });
  }

  // Map base64 strings to Gemini API inline_data format
  const imageParts = images.map((base64) => ({
    inline_data: {
      mime_type: 'image/jpeg',
      data: base64
    }
  }));

  const endpointsToTry = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`
  ];

  const errors = [];
  for (const url of endpointsToTry) {
    try {
      console.log(`[SERVERLESS] Attempting scan on endpoint: ${url.split('/models/')[1].split(':')[0]}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: GEMINI_PROMPT }, ...imageParts] }],
          generationConfig: { temperature: 0.1, response_mime_type: 'application/json' }
        })
      });

      if (!response.ok) {
        let errMsg = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson.error?.message) {
            errMsg = errJson.error.message;
          }
        } catch (_) {}
        throw new Error(`${errMsg} (Status: ${response.status})`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        parsed.id = 'session_' + Date.now();
        parsed.dateFormatted = parsed.startTime || new Date().toLocaleString('id-ID');
        
        if (!parsed.grossCommission && parsed.revenue) {
          parsed.grossCommission = 0; // Filled manually
        }

        console.log(`[SERVERLESS SUCCESS] Shopee Live screenshot scanned successfully.`);
        return res.status(200).json(parsed);
      } else {
        throw new Error('API response did not contain candidates or content text.');
      }
    } catch (err) {
      console.warn(`[SERVERLESS WARN] Model failed:`, err.message);
      errors.push(err.message);
    }
  }

  // If all model endpoints fail
  console.error(`[SERVERLESS ERROR] All Gemini models failed to scan image.`);
  return res.status(500).json({ 
    error: 'Gagal memindai gambar menggunakan Gemini API. Semua model mengembalikan error:\n- ' + [...new Set(errors)].join('\n- ')
  });
}
