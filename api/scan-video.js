
export const GEMINI_VIDEO_PROMPT = `
Anda adalah pakar AI Vision OCR terdepan untuk mengekstrak data Laporan Performa Video Shopee dari screenshot HP.
Anda mungkin diberikan 1 atau 2 screenshot HP sekaligus (Screenshot Penonton/Audience, Screenshot Penjualan/Sales).

Tugas Anda:
Bacalah seluruh teks, angka, metrik interaksi, dan penjualan dari SEMUA gambar yang diberikan, lalu kembalikan JSON murni persis dengan struktur ini (tanpa markdown triple backticks):

{
  "title": "string (Nama/Periode Laporan Video, contoh: Performa Video 03-08-2026)",
  "dateFormatted": "string (Tanggal analisis, contoh: 03-08-2026)",
  "totalViews": number (Penonton, baca dari angka seperti 22,7RB menjadi 22700, contoh: 22700),
  "likes": number (Suka, contoh: 41),
  "shares": number (Konten Dibagikan, contoh: 14),
  "commentsCount": number (Komentar, contoh: 1),
  "profileVisits": number (Kunjungan Profil, contoh: 23),
  "newFollowers": number (Pengikut Baru, contoh: 14),
  "videosWithProducts": number (Video dengan Produk, contoh: 177),
  "monetizedVideos": number (Video Berpendapatan, contoh: 9),
  "productsSold": number (Produk Terjual, contoh: 16),
  "buyers": number (Pembeli, contoh: 13),
  "revenue": number (Penjualan / GMV, baca dari angka seperti 6.5JT menjadi 6500000, contoh: 6500000),
  "totalOrders": number (Pesanan, contoh: 16),
  "productClicks": number (Klik pada Produk, contoh: 165),
  "conversionRatePercent": number (Tingkat Konversi, contoh: 0.1),
  "aiSummary": "string (Format ringkasan AI: 'Performa Video menghasilkan Rp[revenue] GMV dari [productsSold] produk terjual. Dilihat oleh [totalViews] penonton dengan konversi [conversionRatePercent]%.')"
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
          contents: [{ parts: [{ text: GEMINI_VIDEO_PROMPT }, ...imageParts] }],
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
        parsed.id = 'video_' + Date.now();
        if (!parsed.dateFormatted) {
          parsed.dateFormatted = new Date().toLocaleDateString('id-ID');
        }

        console.log(`[SERVERLESS SUCCESS] Shopee Video screenshot scanned successfully.`);
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
