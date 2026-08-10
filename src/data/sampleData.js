/**
 * Paramara Studio Data Model & Initial State
 */

export const INITIAL_STUDIO_DATA = {
  studioInfo: {
    name: "Paramara Studio",
    tagline: "",
    logoUrl: "/assets/logo.png",
    primaryColor: "#082F26",
    themeMode: "light"
  },

  // Admin Users List (CRUD)
  adminUsers: [
    {
      id: "admin_001",
      username: "abdumalikh",
      fullName: "Abdumalik",
      role: "Super Admin",
      email: "paramarastudio@gmail.com",
      status: "Aktif",
      lastLogin: "Hari ini"
    },
    {
      id: "admin_002",
      username: "admin_operasional",
      fullName: "Tim Admin Operasional",
      role: "Admin Operasional",
      email: "ops@paramarastudio.com",
      status: "Aktif",
      lastLogin: "Kemarin"
    }
  ],

  // 1. Shopee Live Streams Analytics (Clean State - Ready for user's screenshot uploads)
  shopeeSessions: [],

  // 1b. Shopee Video Analytics (Clean State - Ready for user's screenshot uploads)
  shopeeVideoSessions: [],

  // 2. Studio Client Projects & Services
  clientProjects: [],

  // 3. Team Host & Stream Schedules
  liveSchedules: [],

  // 4. Financial Lists
  capexList: [],
  opexList: [],
  personalList: [],
  otherIncomeList: [],

  // 4c. Planning Expense & Budget Limit
  monthlyBudgetLimit: 2500000,
  plannedExpenses: [
    {
      id: "plan_001",
      name: "Upgrade Camera & Lighting Studio 1",
      category: "CAPEX",
      targetDate: "2026-09-01",
      date: "2026-09-01",
      amount: 1500000,
      priority: "Tinggi",
      status: "Disetujui",
      notes: "Upgrade visual livestream untuk event kampanye 9.9"
    },
    {
      id: "plan_002",
      name: "Alokasi Iklan & Ads Promosi Shopee Live",
      category: "OPEX",
      targetDate: "2026-08-25",
      date: "2026-08-25",
      amount: 500000,
      priority: "Sedang",
      status: "Direncanakan",
      notes: "Budget Iklan Toko & CPAS Meta"
    }
  ],

  // 4b. AI Financial Insight Cache
  finIntelAiInsight: null,

  // 5. Pinterest Analytics (US Affiliate Market)
  pinterestAnalytics: [
    {
      id: "pin_2026_07",
      month: "2026-07",
      dateRange: "2026-07-01 - 2026-07-31",
      account: "@productijustfound",
      overviewFileName: "Pinterest Analytics overview 20260701-20260731 (1).csv",
      audienceFileName: "audience-insights-total-audience-2026-08-02.csv",
      fileHistory: [
        {
          id: "file_init_1",
          fileName: "Pinterest Analytics overview 20260701-20260731 (1).csv",
          fileType: "Overview Performance",
          uploadedAt: "2026-08-02 08:00",
          rowsCount: 65,
          status: "Active & Synced"
        },
        {
          id: "file_init_2",
          fileName: "audience-insights-total-audience-2026-08-02.csv",
          fileType: "Audience Insights",
          uploadedAt: "2026-08-02 08:05",
          rowsCount: 140,
          status: "Active & Synced"
        }
      ],
      impressions: 2640,
      engagements: 214,
      outboundClicks: 0,
      saves: 12,
      totalAudience: 833,
      engagedAudience: 64,
      monthlyTotalAudience: 10000,
      dailyImpressions: [
        { date: '07-15', impressions: 115 },
        { date: '07-16', impressions: 31 },
        { date: '07-17', impressions: 87 },
        { date: '07-18', impressions: 121 },
        { date: '07-19', impressions: 68 },
        { date: '07-20', impressions: 92 },
        { date: '07-21', impressions: 119 },
        { date: '07-22', impressions: 140 },
        { date: '07-23', impressions: 111 },
        { date: '07-24', impressions: 96 },
        { date: '07-25', impressions: 259 },
        { date: '07-26', impressions: 95 },
        { date: '07-27', impressions: 260 },
        { date: '07-28', impressions: 109 },
        { date: '07-29', impressions: 258 },
        { date: '07-30', impressions: 180 },
        { date: '07-31', impressions: 501 }
      ],
      topBoards: [
        { name: "home-essentials", link: "https://www.pinterest.com/productijustfound/home-essentials/", impressions: 1174, engagements: 93, pinClicks: 90, outboundClicks: 0, saves: 3 },
        { name: "suitcase", link: "https://www.pinterest.com/productijustfound/suitcase/", impressions: 968, engagements: 75, pinClicks: 68, outboundClicks: 0, saves: 7 },
        { name: "travel-essentials", link: "https://www.pinterest.com/productijustfound/travel-essentials/", impressions: 317, engagements: 26, pinClicks: 24, outboundClicks: 0, saves: 2 },
        { name: "gifts", link: "https://www.pinterest.com/productijustfound/gifts/", impressions: 183, engagements: 20, pinClicks: 20, outboundClicks: 0, saves: 0 }
      ],
      topPins: [
        { id: "1150177192366025316", link: "https://www.pinterest.com/pin/1150177192366025316/", type: "Organic", source: "From you", impressions: 790 },
        { id: "1150177192366245057", link: "https://www.pinterest.com/pin/1150177192366245057/", type: "Organic", source: "From you", impressions: 132 },
        { id: "1150177192366331558", link: "https://www.pinterest.com/pin/1150177192366331558/", type: "Organic", source: "From you", impressions: 112 },
        { id: "1150177192365957086", link: "https://www.pinterest.com/pin/1150177192365957086/", type: "Organic", source: "From you", impressions: 107 },
        { id: "1150177192366021448", link: "https://www.pinterest.com/pin/1150177192366021448/", type: "Organic", source: "From you", impressions: 98 }
      ],
      demographics: {
        age: [
          { label: '25-34', percent: 38.8 },
          { label: '18-24', percent: 30.1 },
          { label: '35-44', percent: 15.0 },
          { label: '45-49', percent: 4.5 },
          { label: '55-64', percent: 1.9 },
          { label: '50-54', percent: 1.8 },
          { label: '65+', percent: 1.5 }
        ],
        gender: [
          { label: 'Female', percent: 69.6 },
          { label: 'Male', percent: 23.6 },
          { label: 'Unspecified', percent: 6.8 }
        ],
        device: [
          { label: 'iPhone', percent: 57.3 },
          { label: 'Android Mobile', percent: 30.1 },
          { label: 'Web', percent: 24.0 },
          { label: 'iPad', percent: 14.5 },
          { label: 'Mobile Web', percent: 4.8 }
        ],
        countries: [
          { label: 'United States', percent: 15.9 },
          { label: 'India', percent: 13.3 },
          { label: 'United Kingdom', percent: 3.4 },
          { label: 'Nigeria', percent: 3.1 },
          { label: 'Canada', percent: 3.0 },
          { label: 'Philippines', percent: 2.9 },
          { label: 'Other', percent: 51.1 }
        ],
        metros: [
          { label: 'New York', percent: 6.6 },
          { label: 'Los Angeles', percent: 5.6 },
          { label: 'Washington, DC', percent: 4.2 },
          { label: 'Phoenix', percent: 3.3 },
          { label: 'Charleston, SC', percent: 2.8 },
          { label: 'San Francisco', percent: 2.8 }
        ],
        interests: [
          { category: 'Home Decor', percent: 78.3, affinity: 1.24 },
          { category: 'Art', percent: 78.1, affinity: 1.20 },
          { category: 'Entertainment', percent: 76.7, affinity: 1.22 },
          { category: 'Education', percent: 75.1, affinity: 1.30 },
          { category: "Women's Fashion", percent: 74.6, affinity: 1.35 },
          { category: 'Design', percent: 74.3, affinity: 1.30 },
          { category: 'Travel', percent: 72.6, affinity: 1.51 },
          { category: 'Health', percent: 72.6, affinity: 1.39 }
        ]
      }
    }
  ]
};
