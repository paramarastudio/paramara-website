/**
 * Gemini Vision AI Service for Dual Shopee Live Screenshot Data Extraction
 */

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

export function fileToBase64(file, maxWidth = 1200, maxHeight = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    // If not an image file, fallback to direct reader
    if (!file.type || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize down if image exceeds max dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Data = dataUrl.split(',')[1];
        resolve(base64Data);
      };
      img.onerror = () => {
        // Fallback to original base64 if canvas load fails
        resolve(event.target.result.split(',')[1]);
      };
    };
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

