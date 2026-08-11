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

async function getSupportedGeminiModels(apiKey) {
  const fallbackModels = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-001"
  ];

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(listUrl, {
      method: "GET",
      headers: {
        "x-goog-api-key": apiKey
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models)) {
        const validModels = data.models
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
          .map(m => (m.name || "").replace(/^models\//, ""))
          .filter(Boolean);

        if (validModels.length > 0) {
          // Filter out non-vision/deprecated models (TTS, Audio, Embedding, 2.5 legacy, Gemma)
          const visionModels = validModels.filter(name => {
            const lower = name.toLowerCase();
            return !lower.includes("tts") && !lower.includes("audio") && !lower.includes("embedding") && !lower.includes("2.5") && !lower.includes("gemma");
          });

          // Sort models: gemini-1.5-flash > gemini-2.0-flash > others
          visionModels.sort((a, b) => {
            const rank = (name) => {
              const lower = name.toLowerCase();
              if (lower === "gemini-1.5-flash" || lower === "gemini-1.5-flash-latest") return 1;
              if (lower.includes("1.5-flash")) return 2;
              if (lower.includes("2.0-flash")) return 3;
              if (lower.includes("1.5-pro")) return 4;
              return 10;
            };
            return rank(a) - rank(b);
          });
          return visionModels.length > 0 ? visionModels : fallbackModels;
          return validModels;
        }
      }
    }
  } catch (e) {
    console.warn("[SERVERLESS WARN] Failed to fetch available Gemini models dynamically:", e);
  }

  return fallbackModels;
}

export default async function handler(req, res) {
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

  const imageParts = images.map((base64) => ({
    inline_data: {
      mime_type: 'image/jpeg',
      data: base64
    }
  }));

  const availableModels = await getSupportedGeminiModels(apiKey);
  const apiVersions = ["v1beta", "v1"];
  let lastErrorMessage = "";

  for (const model of availableModels) {
    for (const apiVer of apiVersions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        console.log(`[SERVERLESS] Attempting scan on: ${model} (${apiVer})`);
        
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
          const errorText = await response.text();
          console.warn(`[SERVERLESS WARN] Model ${model} (${apiVer}) failed with status ${response.status}:`, errorText);
          try {
            const errObj = JSON.parse(errorText);
            lastErrorMessage = errObj.error?.message || errorText;
          } catch {
            lastErrorMessage = errorText;
          }
          continue; // Try next model/version
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          parsed.id = 'session_' + Date.now();
          parsed.dateFormatted = parsed.startTime || new Date().toLocaleString('id-ID');
          
          if (!parsed.grossCommission && parsed.revenue) {
            parsed.grossCommission = 0;
          }

          console.log(`[SERVERLESS SUCCESS] Scanned successfully using ${model} (${apiVer})`);
          return res.status(200).json(parsed);
        } else {
          throw new Error('API response did not contain candidates or content text.');
        }
      } catch (err) {
        console.warn(`[SERVERLESS WARN] Model ${model} (${apiVer}) try failed:`, err.message);
        lastErrorMessage = err.message || String(err);
      }
    }
  }

  console.error(`[SERVERLESS ERROR] All Gemini models failed to scan image.`);
  return res.status(500).json({ 
    error: `Gagal memindai gambar menggunakan Gemini API. Detail error terakhir:\n- ${lastErrorMessage}`
  });
}
