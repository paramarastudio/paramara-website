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
            contents: [{ parts: [{ text: GEMINI_VIDEO_PROMPT }, ...imageParts] }],
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
          parsed.id = 'video_' + Date.now();
          if (!parsed.dateFormatted) {
            parsed.dateFormatted = new Date().toLocaleDateString('id-ID');
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
