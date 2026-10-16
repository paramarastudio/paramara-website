export const GEMINI_PROMPT = `
Anda adalah pakar AI Vision OCR terdepan untuk mengekstrak data Laporan Shopee Live dan ShopeeFood Live dari screenshot aplikasi HP.
Screenshot yang diberikan bisa berupa:
1. Laporan Shopee Live Regular (Data Penjualan, Interaksi, Produk Terjual, Traffic Source).
2. Laporan ShopeeFood Live (Logo ShopeeFood Live di latar/banner, Penjualan GMV besar, Penonton Aktif, Komentar, Pesanan / Pesanan Voucher Diskon, Persentase Klik, Pesanan per Klik, Penonton Terbanyak, Total Dilihat / Ditonton, Durasi Rata-rata Menonton, Total Suka, Total Dibagikan, serta Daftar Produk Makanan Terjual & Klik).

Tugas Anda:
Bacalah seluruh teks, angka, metrik interaksi, dan daftar produk dari SEMUA gambar yang diberikan, lalu kembalikan JSON murni persis dengan struktur ini (tanpa markdown triple backticks):

{
  "title": "string (Jika terdeteksi logo/tulisan ShopeeFood atau produk makanan, beri judul 'ShopeeFood Live [Tanggal DD-MM-YYYY]', jika regular beri judul sesuai sesi)",
  "channelType": "string ('ShopeeFood Live' jika terdapat logo/indikasi ShopeeFood Live atau produk makanan resto, atau 'Shopee Live' jika live toko biasa)",
  "startTime": "string (Format: DD-MM-YYYY HH:mm. Waktu live dan tanggal aktual dari screenshot. Jangan gunakan tanggal contoh, cari tanggal dari teks/banner screenshot jika ada)",
  "duration": "string (Durasi SIARAN LIVE sebenarnya, contoh: 02:00:00. PENTING: JANGAN isi kolom ini dengan 'Durasi Rata-rata Menonton'! Jika durasi total siaran tidak tertera di screenshot, kosongkan '')",
  "revenue": number (Penjualan / GMV Rp tanpa titik/koma/spasi, contoh dari 5.464.798 menjadi 5464798),
  "grossCommission": number (Estimasi Komisi Kotor Studio 10% dari GMV Rp, contoh: 546480),
  "activeViewers": number (Penonton Aktif / Penonton >= 1 menit, contoh: 96),
  "commentsCount": number (Komentar / Total Komentar, contoh: 1606),
  "cartAdditions": number (Masuk Keranjang, jika tidak ada isi 0),
  "clickRatePercent": number (Persentase Klik, contoh: 4.1),
  "ordersPerClickPercent": number (Pesanan per Klik, contoh: 5.5),
  "totalOrders": number (Pesanan / Pesanan Voucher Diskon, contoh dari 1.478 menjadi 1478),
  
  "totalViews": number (Total Dilihat / Ditonton / Total Penonton, contoh dari 662.082 menjadi 662082),
  "avgWatchDuration": "string (Durasi Rata-rata Menonton penonton, contoh: 00:00:21)",
  "commentRatePercent": number (Persentase Komentar, jika tidak tertera isi 0),
  "peakConcurrentViewers": number (Penonton Terbanyak, contoh: 832),
  "likes": number (Disukai / Total Suka, contoh dari 118.235 menjadi 118235),
  "shares": number (Dibagikan / Total Dibagikan, contoh: 76),

  "trafficSources": [
    { "name": "string", "percent": 0.0 }
  ],

  "products": [
    {
      "name": "string (Nama Lengkap Produk Makanan / Barang)",
      "price": number (Harga Rp angka murni, contoh: 5000),
      "revenue": number (Estimasi Penjualan Rp = Harga x Terjual, jika tidak tertera kalkulasikan price x Terjual),
      "clicks": number (Klik, contoh: 3590),
      "cartAdds": number (Terjual / Masuk Keranjang, contoh dari Terjual 268 isi 268)
    }
  ],

  "aiSummary": "string (Format ringkasan AI persis: 'Sesi [channelType] menghasilkan Penjualan Rp[revenue] dengan [totalOrders] Pesanan dan [totalViews] views. Penonton terbanyak mencapai [peakConcurrentViewers].')"
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

          // Intelligent Date Alignment: check title, startTime, or current date
          const titleDateMatch = (parsed.title || '').match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
          const startMatch = (parsed.startTime || '').match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
          const timeMatch = (parsed.startTime || '').match(/\b(\d{1,2}:\d{2})\b/);
          const timeStr = timeMatch ? timeMatch[1] : '14:30';

          let resolvedDateFormatted = '';
          let resolvedDateISO = '';

          if (titleDateMatch) {
            const d = titleDateMatch[1].padStart(2, '0');
            const m = titleDateMatch[2].padStart(2, '0');
            const y = titleDateMatch[3];
            resolvedDateFormatted = `${d}-${m}-${y}`;
            resolvedDateISO = `${y}-${m}-${d}`;
          } else if (startMatch) {
            const d = startMatch[1].padStart(2, '0');
            const m = startMatch[2].padStart(2, '0');
            const y = startMatch[3];
            resolvedDateFormatted = `${d}-${m}-${y}`;
            resolvedDateISO = `${y}-${m}-${d}`;
          } else {
            const now = new Date();
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = String(now.getFullYear());
            resolvedDateFormatted = `${d}-${m}-${y}`;
            resolvedDateISO = `${y}-${m}-${d}`;
          }

          parsed.dateFormatted = resolvedDateFormatted;
          parsed.dateISO = resolvedDateISO;
          parsed.startTime = `${resolvedDateFormatted} ${timeStr}`;

          // Ensure ShopeeFood Live sessions always keep title format: "ShopeeFood Live DD-MM-YYYY"
          const isShopeeFood = parsed.channelType === 'ShopeeFood Live' || (parsed.title || '').toLowerCase().includes('shopeefood');
          if (isShopeeFood) {
            parsed.channelType = 'ShopeeFood Live';
            parsed.title = `ShopeeFood Live ${resolvedDateFormatted}`;
          }

          // If duration was mistakenly populated with seconds (< 2 mins) like 00:00:21 or 00:00:14
          if (parsed.duration && /^00:0[0-1]:\d{2}$/.test(parsed.duration.trim())) {
            if (!parsed.avgWatchDuration) parsed.avgWatchDuration = parsed.duration;
            parsed.duration = '01:30:00'; // Set default realistic stream duration for user confirmation
          } else if (!parsed.duration) {
            parsed.duration = '01:30:00';
          }
          
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
