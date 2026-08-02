/**
 * Gemini Vision API Service for Shopee Live Screenshot Data Extraction
 */

export const GEMINI_PROMPT = `
Anda adalah sistem AI OCR pakar analisis E-commerce Shopee Live.
Tugas Anda adalah membaca gambar screenshot (tangkapan layar) laporan data & aktivitas Shopee Live dari smartphone dan mengekstrak SELURUH metrik ke dalam format JSON murni tanpa markdown triple backticks.

Berikut adalah struktur JSON yang WAJIB Anda kembalikan:

{
  "title": "string (Judul Livestream, misal: APOTEK 24 JAM DISC UP TO 50%)",
  "startTime": "string (Waktu Mulai, misal: 01-08-2026 21:37 atau YYYY-MM-DD THH:mm)",
  "duration": "string (Durasi Live, misal: 01:27:11)",
  "revenue": number (Penjualan dalam Rp, hapus titik/koma, misal: 232500),
  "activeViewers": number (Penonton Aktif),
  "commentsCount": number (Jumlah Komentar),
  "cartAdditions": number (Jumlah Masuk Keranjang),
  "clickRatePercent": number (Persentase Klik misal 32.1),
  "ordersPerClickPercent": number (Pesanan per Klik misal 11.1),
  "totalOrders": number (Total Pesanan),
  
  "totalViews": number (Ditonton / Total Penonton),
  "avgWatchDuration": "string (Rata-Rata Durasi Menonton, misal 00:00:50)",
  "commentRatePercent": number (Persentase Komentar misal 3.6),
  "peakConcurrentViewers": number (Penonton Terbanyak),
  "likes": number (Disukai / Likes),
  "shares": number (Dibagikan / Shares),

  "trafficSources": [
    { "name": "Video", "percent": number },
    { "name": "Tab Live & Video", "percent": number },
    { "name": "Beranda", "percent": number }
  ],

  "products": [
    {
      "name": "string (Nama Produk)",
      "price": number (Harga produk Rp),
      "revenue": number (Penjualan Rp),
      "clicks": number (Jumlah Klik),
      "cartAdds": number (Masuk Keranjang)
    }
  ],

  "viewerProfile": {
    "gender": { "male": number, "female": number, "unknown": number },
    "identity": { "followers": number, "nonFollowers": number },
    "ageDistribution": [
      { "range": "18-24", "percent": number },
      { "range": "25-34", "percent": number },
      { "range": "35-44", "percent": number },
      { "range": "45+", "percent": number },
      { "range": "Tidak Diketahui", "percent": number }
    ]
  },

  "buyerProfile": {
    "gender": { "male": number, "female": number },
    "identity": { "followers": number, "nonFollowers": number },
    "ageDistribution": [
      { "range": "35-44", "percent": number },
      { "range": "45+", "percent": number }
    ],
    "locations": [
      { "city": "string", "percent": number }
    ]
  },

  "aiSummary": "string (Ringkasan performa singkat & saran actionable untuk streamer)"
}

Instruksi Tambahan:
- Jika ada metrik yang tidak terlihat atau tidak ada di gambar screenshot, gunakan estimasi logis atau angka 0.
- Pastikan hanya mengembalikan JSON valid saja.
`;

/**
 * Convert File to Base64
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Scan Screenshot with Gemini API or Mock Fallback
 */
export async function analyzeShopeeScreenshot(file, apiKey) {
  const base64Data = await fileToBase64(file);
  const mimeType = file.type || "image/jpeg";

  // If no API key provided, use realistic simulation
  if (!apiKey || apiKey.trim() === "") {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getMockScanResult(file.name));
      }, 1800);
    });
  }

  // Call Gemini REST API (gemini-1.5-flash / gemini-2.0-flash)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: GEMINI_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json"
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("Respon dari Gemini AI tidak memberikan teks data.");
    }

    // Clean JSON response
    const cleanJson = candidateText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanJson);
    
    // Add default fields if missing
    parsedData.id = "session_" + Date.now();
    parsedData.dateFormatted = parsedData.startTime || new Date().toLocaleString("id-ID");

    return parsedData;

  } catch (error) {
    console.warn("Gemini API call failed, falling back to smart parser:", error);
    // Throw error or fallback if needed
    throw error;
  }
}

/**
 * Mock Result for Testing without API Key
 */
function getMockScanResult(fileName) {
  return {
    id: "session_" + Date.now(),
    title: `Sesi Shopee Live (${fileName || 'Hasil Scan AI'})`,
    host: "Host Paramara Studio",
    startTime: new Date().toISOString().slice(0, 16).replace("T", " "),
    duration: "01:15:30",
    dateFormatted: new Date().toLocaleDateString("id-ID"),
    
    revenue: 345000,
    activeViewers: 12,
    commentsCount: 8,
    cartAdditions: 9,
    clickRatePercent: 28.5,
    ordersPerClickPercent: 14.2,
    totalOrders: 3,

    totalViews: 45,
    avgWatchDuration: "00:01:15",
    commentRatePercent: 4.8,
    peakConcurrentViewers: 6,
    likes: 120,
    shares: 4,

    trafficSources: [
      { name: "Video", percent: 22.0 },
      { name: "Tab Live & Video", percent: 18.0 },
      { name: "Beranda", percent: 15.0 },
      { name: "Lainnya / Langsung", percent: 45.0 }
    ],

    products: [
      {
        name: "MEGAMOVE 100% ORIGINAL OBAT HERBAL",
        price: 250000,
        revenue: 250000,
        clicks: 4,
        cartAdds: 3
      },
      {
        name: "NOW Supplements, Vitamin D-3 1000 IU",
        price: 199900,
        revenue: 95000,
        clicks: 3,
        cartAdds: 2
      }
    ],

    viewerProfile: {
      gender: { male: 40.0, female: 50.0, unknown: 10.0 },
      identity: { followers: 15.0, nonFollowers: 85.0 },
      ageDistribution: [
        { range: "18-24", percent: 10.0 },
        { range: "25-34", percent: 35.0 },
        { range: "35-44", percent: 30.0 },
        { range: "45+", percent: 15.0 },
        { range: "Tidak Diketahui", percent: 10.0 }
      ]
    },

    buyerProfile: {
      gender: { male: 33.3, female: 66.7 },
      identity: { followers: 33.3, nonFollowers: 66.7 },
      ageDistribution: [
        { range: "25-34", percent: 33.3 },
        { range: "35-44", percent: 66.7 }
      ],
      locations: [
        { city: "JAKARTA SELATAN", percent: 66.7 },
        { city: "KOTA TANGERANG", percent: 33.3 }
      ]
    },

    aiSummary: "Ekstraksi AI Berhasil! Sesi ini mencatatkan peningkatan omset Rp345.000 dengan 3 orderan. Penonton terbanyak 6 orang. Konversi klik ke keranjang cukup solid di angka 28.5%."
  };
}
