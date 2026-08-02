/**
 * Sample Data for Shopee Live AI Tracker based on user's exact uploaded screenshots
 */
export const INITIAL_SESSIONS = [
  {
    id: "session_001",
    title: "APOTEK 24 JAM DISC UP TO 50%",
    host: "Apotek Official Host",
    startTime: "2026-08-01T21:37:00",
    duration: "01:27:11",
    dateFormatted: "01-08-2026 21:37",
    
    // Data Utama
    revenue: 232500,
    activeViewers: 7,
    commentsCount: 1,
    cartAdditions: 5,
    clickRatePercent: 32.1,
    ordersPerClickPercent: 11.1,
    totalOrders: 1,

    // Interaksi
    totalViews: 28,
    avgWatchDuration: "00:00:50",
    commentRatePercent: 3.6,
    peakConcurrentViewers: 3,
    likes: 76,
    shares: 1,

    // Traffic Source
    trafficSources: [
      { name: "Video", percent: 18.0 },
      { name: "Tab Live & Video", percent: 14.0 },
      { name: "Beranda", percent: 11.0 },
      { name: "Lainnya / Direct", percent: 57.0 }
    ],

    // Detail Produk
    products: [
      {
        name: "Ovisure Gold Susu Kesehatan Tulang Persendian Syaraf Kejepit Tulang...",
        price: 300000,
        revenue: 0,
        clicks: 5,
        cartAdds: 2
      },
      {
        name: "MEGAMOVE 100% ORIGINAL OBAT HERBAL NYERI SENDI ,ASAM...",
        price: 250000,
        revenue: 232500,
        clicks: 2,
        cartAdds: 1
      },
      {
        name: "NOW Supplements, Vitamin D-3 1000 IU, 180 Softgels",
        price: 199900,
        revenue: 0,
        clicks: 1,
        cartAdds: 1
      }
    ],

    // Profil Penonton
    viewerProfile: {
      gender: { male: 47.1, female: 41.2, unknown: 11.8 },
      identity: { followers: 5.9, nonFollowers: 94.1 },
      ageDistribution: [
        { range: "18-24", percent: 6.0 },
        { range: "25-34", percent: 29.0 },
        { range: "35-44", percent: 29.0 },
        { range: "45+", percent: 6.0 },
        { range: "Tidak Diketahui", percent: 29.0 }
      ]
    },

    // Profil Pembeli
    buyerProfile: {
      gender: { male: 50.0, female: 50.0 },
      identity: { followers: 0.0, nonFollowers: 100.0 },
      ageDistribution: [
        { range: "35-44", percent: 50.0 },
        { range: "45+", percent: 50.0 }
      ],
      locations: [
        { city: "KOTA TANGERANG", percent: 50.0 },
        { city: "KOTA SURABAYA", percent: 50.0 }
      ]
    },

    // AI Insight Notes
    aiSummary: "Sesi live berdurasi 1 jam 27 menit menghasilkan Rp232.500 dari 1 pesanan (MEGAMOVE). CTR tinggi (32.1%), namun durasi menonton rata-rata 50 detik tergolong pendek. 94.1% penonton belum menjadi pengikut, menunjukkan peluang akuisisi pengikut baru masih sangat besar."
  }
];
