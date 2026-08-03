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
  opexList: []
};
