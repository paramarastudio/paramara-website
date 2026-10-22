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
  "commentsCount": number (Total Komentar / Komentar angka murni tanpa titik, contoh: 768 atau 1606. Jika ada 'Komentar' di bagian atas dan 'Total Komentar' di bagian tengah, ambil angka Total Komentar terbesar),
  "chatCount": number (Sama dengan commentsCount: Total Komentar / Komentar angka murni, contoh: 768),
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

export const GEMINI_COMMISSION_REPORT_PROMPT = `
Anda adalah pakar AI Vision OCR terdepan untuk mengekstrak data halaman "Rincian Komisi" Shopee Affiliate / Shopee Live / ShopeeFood.
Bacalah seluruh baris pada gambar screenshot "Rincian Komisi" yang diberikan, termasuk:
- Total Komisi Shopee Live, Komisi XTRA (Kanal Eksplorasi, Kanal Konversi), Komisi Tambahan, Biaya Layanan, dan Shopee Video.
- SELURUH baris rincian di bawah Komisi Tambahan seperti "[ADD] ShopeeFood 6-9 Okt", "[ADD] ShopeeFood 3-5 Okt", "[ADD] IN Kejar Komisi 600RB", "[ADD] Kejar Komisi Live 500RB", dst.

Kembalikan JSON murni persis dengan struktur ini (tanpa markdown triple backticks):
{
  "totalShopeeLiveCommission": number (angka murni tanpa titik/Rp, contoh: 11087821),
  "komisiXtra": number (angka murni, contoh: 896635),
  "komisiTambahanTotal": number (angka murni, contoh: 10248339),
  "biayaLayanan": number (angka positif murni dari potongan biaya layanan, contoh dari -Rp57.153 isi 57153),
  "shopeeVideoCommission": number (angka murni komisi Shopee Video jika terlihat, contoh: 1352065),
  "items": [
    {
      "label": "string (Teks persis baris item, contoh: '[ADD] ShopeeFood 6-9 Okt' atau '[ADD] IN Kejar Komisi 600RB')",
      "type": "string ('shopeefood_batch' jika mengandung kata ShopeeFood, atau 'bonus' jika Kejar Komisi / insentif lainnya)",
      "periodText": "string (Rentang tanggal yang tertulis, contoh: '6-9 Okt' atau '29-30 Sep' atau '' jika tidak ada tanggal)",
      "amount": number (Nominal Rupiah angka murni tanpa titik/koma, contoh dari 866.989 menjadi 866989)
    }
  ]
}
`;

export const GEMINI_AMAZON_ASSOCIATES_PROMPT = `
Anda adalah pakar AI Vision OCR terdepan untuk mengekstrak data Laporan Amazon Associates (Amazon Affiliate US / Global) dari screenshot dashboard.
Bacalah seluruh teks dan angka pada gambar screenshot Amazon Associates yang diberikan, termasuk:
- Store ID / Tracking ID (contoh: "abdumalikh-20") dan Negara (contoh: "US")
- Rentang Tanggal Laporan (contoh: "Sep 19 2026 - Oct 18 2026")
- Summary for This Period: Shipped Items, Total Earnings ($), Total Ordered Items, Clicks, Conversion (%)
- Fee Summary / Earnings Overview: Shipped Items Revenue ($), Total Revenue ($), Ordered Revenue ($), Bounties ($), Bonus ($), Returned Items.

Kembalikan JSON murni persis dengan struktur ini (tanpa markdown triple backticks):
{
  "storeId": "string (Store ID Amazon Associates, contoh: 'abdumalikh-20')",
  "country": "string (Negara program affiliate, contoh: 'US')",
  "dateRange": "string (Rentang tanggal persis di screenshot, contoh: 'Sep 19 2026 - Oct 18 2026')",
  "periodStart": "string (Tanggal mulai format YYYY-MM-DD, contoh: '2026-09-19')",
  "periodEnd": "string (Tanggal akhir format YYYY-MM-DD, contoh: '2026-10-18')",
  "clicks": number (Total Clicks angka bulat, contoh: 49),
  "orderedItems": number (Total Ordered Items angka bulat, contoh: 1),
  "shippedItems": number (Total Shipped Items angka bulat, contoh: 1),
  "returnedItems": number (Total Returned Items angka bulat, contoh: 0),
  "conversionRate": number (Conversion dalam persen desimal tanpa '%', contoh: 2.04),
  "orderedRevenueUsd": number (Ordered Revenue dalam USD desimal tanpa '$', contoh: 35.99),
  "shippedRevenueUsd": number (Shipped Items Revenue dalam USD desimal tanpa '$', contoh: 35.99),
  "totalRevenueUsd": number (Total Revenue / GMV dalam USD desimal tanpa '$', contoh: 35.99),
  "bountiesUsd": number (Bounties dalam USD desimal, contoh: 0),
  "bonusUsd": number (Bonus dalam USD desimal, contoh: 0),
  "totalEarningsUsd": number (Total Earnings / Komisi Affiliate dalam USD desimal tanpa '$', contoh: 1.08),
  "aiSummary": "string (Ringkasan singkat performa Amazon Associates via Pinterest US)"
}
`;


const MONTH_MAP = {
  jan: '01', januari: '01',
  feb: '02', februari: '02',
  mar: '03', maret: '03',
  apr: '04', april: '04',
  mei: '05', may: '05',
  jun: '06', juni: '06',
  jul: '07', juli: '07',
  ags: '08', agu: '08', agust: '08', agustus: '08', aug: '08',
  sep: '09', sept: '09', september: '09',
  okt: '10', oct: '10', oktober: '10',
  nov: '11', nop: '11', november: '11',
  des: '12', dec: '12', desember: '12'
};

function parseCommissionBatchPeriod(label = '', periodText = '', year = new Date().getFullYear()) {
  const source = `${label} ${periodText}`;
  // Match "6-9 Okt" or "29 Ags - 1 Sep"
  const rangeMatch = source.match(/\b(\d{1,2})\s*([a-zA-Z]{3,9})?\s*[-–/]\s*(\d{1,2})\s+([a-zA-Z]{3,9})\b/i);
  if (rangeMatch) {
    const d1 = rangeMatch[1].padStart(2, '0');
    const m1Raw = (rangeMatch[2] || rangeMatch[4] || '').toLowerCase();
    const d2 = rangeMatch[3].padStart(2, '0');
    const m2Raw = (rangeMatch[4] || '').toLowerCase();
    const m2 = MONTH_MAP[m2Raw] || MONTH_MAP[m2Raw.slice(0, 3)] || '10';
    const m1 = MONTH_MAP[m1Raw] || MONTH_MAP[m1Raw.slice(0, 3)] || m2;
    return {
      periodStart: `${year}-${m1}-${d1}`,
      periodEnd: `${year}-${m2}-${d2}`,
      date: `${year}-${m2}-${d2}`
    };
  }
  const singleMatch = source.match(/\b(\d{1,2})\s+([a-zA-Z]{3,9})\b/i);
  if (singleMatch) {
    const d = singleMatch[1].padStart(2, '0');
    const mRaw = singleMatch[2].toLowerCase();
    const m = MONTH_MAP[mRaw] || MONTH_MAP[mRaw.slice(0, 3)];
    if (m) {
      return {
        periodStart: `${year}-${m}-${d}`,
        periodEnd: `${year}-${m}-${d}`,
        date: `${year}-${m}-${d}`
      };
    }
  }
  return null;
}

async function getSupportedGeminiModels(apiKey) {
  const fallbackModels = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.0-flash-lite"
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
          const visionModels = validModels.filter(name => {
            const lower = name.toLowerCase();
            return (
              lower.startsWith("gemini-") &&
              !lower.includes("tts") &&
              !lower.includes("audio") &&
              !lower.includes("embedding") &&
              !lower.includes("gemma") &&
              !lower.includes("imagen") &&
              !lower.includes("veo") &&
              !lower.includes("robotics") &&
              !lower.includes("computer-use")
            );
          });

          visionModels.sort((a, b) => {
            const rank = (name) => {
              const lower = name.toLowerCase();
              if (lower === "gemini-2.5-flash") return 1;
              if (lower === "gemini-2.0-flash") return 2;
              if (lower === "gemini-2.5-flash-lite") return 3;
              if (lower === "gemini-flash-latest") return 4;
              if (lower.includes("2.5-flash")) return 5;
              if (lower.includes("2.0-flash")) return 6;
              return 10;
            };
            return rank(a) - rank(b);
          });
          return visionModels.length > 0 ? visionModels : fallbackModels;
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

  const { images, mode, prompt } = req.body || {};

  // Text-only prompt mode (for AI CFO Brief / Executive Analysis)
  if (mode === 'text_prompt' && prompt) {
    const availableModels = await getSupportedGeminiModels(apiKey);
    const apiVersions = ["v1beta", "v1"];
    let lastErr = "";

    for (const model of availableModels) {
      for (const apiVer of apiVersions) {
        try {
          const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3 }
            })
          });
          if (!response.ok) {
            const errTxt = await response.text();
            lastErr = errTxt;
            continue;
          }
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return res.status(200).json({ text, model });
          }
        } catch (e) {
          lastErr = e.message;
        }
      }
    }
    return res.status(500).json({ error: `Gagal menghasilkan analisis AI: ${lastErr}` });
  }

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Mohon kirimkan setidaknya satu gambar screenshot.' });
  }

  const promptToUse = mode === 'commission_report'
    ? GEMINI_COMMISSION_REPORT_PROMPT
    : mode === 'amazon_associates'
    ? GEMINI_AMAZON_ASSOCIATES_PROMPT
    : GEMINI_PROMPT;

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
        console.log(`[SERVERLESS] Attempting scan (${mode || 'live'}) on: ${model} (${apiVer})`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptToUse }, ...imageParts] }],
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

          if (mode === 'amazon_associates') {
            const todayISO = new Date().toISOString().split('T')[0];
            const periodEnd = parsed.periodEnd || todayISO;
            const periodStart = parsed.periodStart || periodEnd;
            const storeId = (parsed.storeId || 'abdumalikh-20').trim();
            const dateRange = (parsed.dateRange || `${periodStart} - ${periodEnd}`).trim();
            const totalEarningsUsd = Number(parsed.totalEarningsUsd) || 0;
            const orderedRevenueUsd = Number(parsed.orderedRevenueUsd || parsed.totalRevenueUsd) || 0;
            const totalRevenueUsd = Number(parsed.totalRevenueUsd || parsed.orderedRevenueUsd) || 0;
            const clicks = Number(parsed.clicks) || 0;
            const orderedItems = Number(parsed.orderedItems) || 0;
            const shippedItems = Number(parsed.shippedItems) || 0;
            const returnedItems = Number(parsed.returnedItems) || 0;
            const conversionRate = Number(parsed.conversionRate) || (clicks > 0 ? Number(((orderedItems / clicks) * 100).toFixed(2)) : 0);
            const defaultExchangeRate = 16300;
            const earningsIdr = Math.round(totalEarningsUsd * defaultExchangeRate);

            return res.status(200).json({
              id: `amz_${periodEnd.replace(/[^0-9]/g, '_')}`,
              storeId,
              country: parsed.country || 'US',
              dateRange,
              periodStart,
              periodEnd,
              date: periodEnd,
              clicks,
              orderedItems,
              shippedItems,
              returnedItems,
              conversionRate,
              orderedRevenueUsd,
              shippedRevenueUsd: Number(parsed.shippedRevenueUsd ?? totalRevenueUsd) || 0,
              totalRevenueUsd,
              bountiesUsd: Number(parsed.bountiesUsd) || 0,
              bonusUsd: Number(parsed.bonusUsd) || 0,
              totalEarningsUsd,
              exchangeRate: defaultExchangeRate,
              earningsIdr,
              trafficChannel: 'Pinterest US (@productijustfound)',
              aiSummary: parsed.aiSummary || `Amazon Associates (${storeId}) periode ${dateRange} menghasilkan ${clicks} klik, ${orderedItems} pesanan (${conversionRate}% CR), GMV $${totalRevenueUsd.toFixed(2)}, dan komisi $${totalEarningsUsd.toFixed(2)}.`
            });
          }

          if (mode === 'commission_report') {
            const currentYear = new Date().getFullYear();
            const todayISO = new Date().toISOString().split('T')[0];
            let lastKnownDate = todayISO;

            const normalizedItems = (Array.isArray(parsed.items) ? parsed.items : []).map((item, idx) => {
              const label = (item.label || '').trim();
              const isShopeeFood = item.type === 'shopeefood_batch' || label.toLowerCase().includes('shopeefood');
              const periodInfo = parseCommissionBatchPeriod(label, item.periodText || '', currentYear);
              if (periodInfo && periodInfo.date) {
                lastKnownDate = periodInfo.date;
              }
              const cleanSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
              return {
                id: `comm_${cleanSlug || idx}`,
                name: label || `Komisi Tambahan #${idx + 1}`,
                category: isShopeeFood ? 'Komisi ShopeeFood' : 'Bonus Kejar Komisi',
                type: isShopeeFood ? 'shopeefood_batch' : 'bonus',
                amount: Number(item.amount) || 0,
                periodStart: periodInfo ? periodInfo.periodStart : lastKnownDate,
                periodEnd: periodInfo ? periodInfo.periodEnd : lastKnownDate,
                date: periodInfo ? periodInfo.date : lastKnownDate,
                frequency: isShopeeFood ? 'Batch Periode' : 'Once'
              };
            });

            return res.status(200).json({
              ...parsed,
              items: normalizedItems
            });
          }

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

          const resolvedComments = Number(parsed.commentsCount ?? parsed.chatCount ?? parsed.comments) || 0;
          parsed.commentsCount = resolvedComments;
          parsed.chatCount = resolvedComments;

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
