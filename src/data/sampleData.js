/**
 * Paramara Studio Data Model & Initial Sample State
 */

export const INITIAL_STUDIO_DATA = {
  studioInfo: {
    name: "paramarastudio.com",
    tagline: "Internal Admin & Operations Portal",
    logoUrl: "/assets/logo.png",
    primaryColor: "#082F26",
    themeMode: "light"
  },

  // 1. Shopee Live Streams Analytics from HP Screenshot
  shopeeSessions: [
    {
      id: "session_001",
      title: "APOTEK 24 JAM DISC UP TO 50%",
      host: "Apotek Official Host",
      startTime: "01-08-2026 21:37",
      duration: "01:27:11",
      dateFormatted: "01-08-2026 21:37",
      
      revenue: 232500,
      activeViewers: 7,
      commentsCount: 1,
      cartAdditions: 5,
      clickRatePercent: 32.1,
      ordersPerClickPercent: 11.1,
      totalOrders: 1,

      totalViews: 28,
      avgWatchDuration: "00:00:50",
      commentRatePercent: 3.6,
      peakConcurrentViewers: 3,
      likes: 76,
      shares: 1,

      trafficSources: [
        { name: "Video", percent: 18.0 },
        { name: "Tab Live & Video", percent: 14.0 },
        { name: "Beranda", percent: 11.0 }
      ],

      products: [
        {
          name: "Ovisure Gold Susu Kesehatan Tulang...",
          price: 300000,
          revenue: 0,
          clicks: 5,
          cartAdds: 2
        },
        {
          name: "MEGAMOVE 100% ORIGINAL OBAT HERBAL NYERI SENDI",
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

      aiSummary: "Sesi live berdurasi 1j 27m menghasilkan Rp232.500 (MEGAMOVE 100% ORIGINAL OBAT HERBAL NYERI SENDI). CTR tinggi di 32.1%. 28 total penonton dengan rata-rata durasi 00:00:50."
    }
  ],

  // 2. Studio Client Projects & Services
  clientProjects: [
    {
      id: "proj_001",
      clientName: "Apotek Official Store",
      projectTitle: "Shopee Live Streaming Management & Host Service",
      category: "Live Streaming Service",
      budget: 15000000,
      status: "Aktif",
      deadline: "2026-08-30",
      notes: "Kontrak bulanan 20 sesi live stream + pemrosesan data AI"
    },
    {
      id: "proj_002",
      clientName: "Herbal Care Indonesia",
      projectTitle: "Desain Banner Studio & Konten Shopee Video",
      category: "Content Production",
      budget: 7500000,
      status: "Selesai",
      deadline: "2026-07-25",
      notes: "Paket 15 video singkat + aset grafis banner promo"
    }
  ],

  // 3. Team Host & Stream Schedules
  liveSchedules: [
    {
      id: "sched_001",
      title: "Promo Mega Sale 8.8 Live Streaming",
      hostName: "Rina S. (Host Utama)",
      platform: "Shopee Live",
      scheduleTime: "2026-08-08 19:00 - 22:00",
      status: "Terjadwal"
    },
    {
      id: "sched_002",
      title: "Live Apotek 24 Jam Sesi Malam",
      hostName: "Budi P. (Host Shift Malam)",
      platform: "Shopee Live",
      scheduleTime: "2026-08-03 21:00 - 23:00",
      status: "Mendatang"
    }
  ]
};
