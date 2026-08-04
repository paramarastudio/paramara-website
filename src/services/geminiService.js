/**
 * Gemini Vision AI Service for Dual Shopee Live Screenshot Data Extraction
 */

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

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = (error) => reject(error);
  });
}

export async function analyzeShopeeScreenshots(files, passedApiKey) {
  const fileArray = Array.isArray(files) ? files : [files];
  
  // Prioritize passed API Key, then local storage, then environment variable
  const activeKey = passedApiKey || localStorage.getItem("gemini_api_key") || import.meta.env.VITE_GEMINI_API_KEY || "";

  // Convert all uploaded image files to base64 inline_data parts
  const imageParts = await Promise.all(
    fileArray.map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        inline_data: {
          mime_type: file.type || "image/jpeg",
          data: base64
        }
      };
    })
  );

  const endpointsToTry = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`
  ];

  if (!activeKey || activeKey.trim() === "") {
    throw new Error("Gemini API Key tidak ditemukan. Silakan tambahkan VITE_GEMINI_API_KEY di environment variables Vercel atau masukkan API Key di tab Manajemen Admin.");
  }

  const errors = [];
  for (const url of endpointsToTry) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-goog-api-key": activeKey.trim()
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: GEMINI_PROMPT }, ...imageParts] }],
          generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
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
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        parsed.id = "session_" + Date.now();
        parsed.dateFormatted = parsed.startTime || new Date().toLocaleString("id-ID");
        
        if (!parsed.grossCommission && parsed.revenue) {
          parsed.grossCommission = 0; // default to 0, user fills manually
        }

        return parsed;
      } else {
        throw new Error("Respon API tidak mengandung konten teks data.");
      }
    } catch (err) {
      console.warn(`Gemini model call failed on endpoint: ${url}`, err.message);
      errors.push(err.message);
    }
  }

  // If all model endpoints fail, throw a detailed error listing all endpoint failures
  throw new Error("Gagal memindai gambar menggunakan Gemini API. Semua model mengembalikan error:\n- " + [...new Set(errors)].join("\n- "));
}

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

export async function analyzeShopeeVideoScreenshots(files, passedApiKey) {
  const fileArray = Array.isArray(files) ? files : [files];
  // Prioritize passed API Key, then local storage, then environment variable
  const activeKey = passedApiKey || localStorage.getItem("gemini_api_key") || import.meta.env.VITE_GEMINI_API_KEY || "";

  const imageParts = await Promise.all(
    fileArray.map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        inline_data: {
          mime_type: file.type || "image/jpeg",
          data: base64
        }
      };
    })
  );

  const endpointsToTry = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`
  ];

  if (!activeKey || activeKey.trim() === "") {
    throw new Error("Gemini API Key tidak ditemukan. Silakan tambahkan VITE_GEMINI_API_KEY di environment variables Vercel atau masukkan API Key di tab Manajemen Admin.");
  }

  const errors = [];
  for (const url of endpointsToTry) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-goog-api-key": activeKey.trim()
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: GEMINI_VIDEO_PROMPT }, ...imageParts] }],
          generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
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
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        parsed.id = "video_" + Date.now();
        if (!parsed.dateFormatted) {
          parsed.dateFormatted = new Date().toLocaleDateString("id-ID");
        }
        return parsed;
      } else {
        throw new Error("Respon API tidak mengandung konten teks data.");
      }
    } catch (err) {
      console.warn(`Gemini model call failed on endpoint: ${url}`, err.message);
      errors.push(err.message);
    }
  }

  // If all model endpoints fail, throw a detailed error listing all endpoint failures
  throw new Error("Gagal memindai gambar menggunakan Gemini API. Semua model mengembalikan error:\n- " + [...new Set(errors)].join("\n- "));
}

