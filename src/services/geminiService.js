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

export async function analyzeShopeeScreenshots(files) {
  const fileArray = Array.isArray(files) ? files : [files];

  // Convert files to base64 strings
  const imageParts = await Promise.all(
    fileArray.map(async (file) => {
      const base64 = await fileToBase64(file);
      return base64;
    })
  );

  // Send to Vercel Serverless Function proxy
  const response = await fetch('/api/scan-live', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: imageParts })
  });

  if (!response.ok) {
    let errMsg = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson.error) errMsg = errJson.error;
    } catch (_) {}
    throw new Error(errMsg || `HTTP ${response.status}`);
  }

  return await response.json();
}

export const GEMINI_VIDEO_PROMPT = ``;

export async function analyzeShopeeVideoScreenshots(files) {
  const fileArray = Array.isArray(files) ? files : [files];

  // Convert files to base64 strings
  const imageParts = await Promise.all(
    fileArray.map(async (file) => {
      const base64 = await fileToBase64(file);
      return base64;
    })
  );

  // Send to Vercel Serverless Function proxy
  const response = await fetch('/api/scan-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: imageParts })
  });

  if (!response.ok) {
    let errMsg = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson.error) errMsg = errJson.error;
    } catch (_) {}
    throw new Error(errMsg || `HTTP ${response.status}`);
  }

  return await response.json();
}

