import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, Video, Briefcase, Calendar, Globe, 
  Camera, Sparkles, TrendingUp, PieChart, PlusCircle, 
  CheckCircle, Save, Menu, Lock, LogOut, Eye, EyeOff, Trash2,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ImagePlus, Edit3, UserCheck, UserPlus, ExternalLink, ArrowRight,
  Leaf, Compass, Monitor, Cloud, CloudOff, Loader2, PanelLeftClose, Film, DollarSign, CheckCircle2, WifiOff,
  Sun, Moon, ArrowUpRight, ArrowDownRight, Receipt, Wallet, Scale, ShoppingBag,
  BarChart2, Users, Smartphone, Target, Pin, FileText, Clock, Activity
} from 'lucide-react';

import { INITIAL_STUDIO_DATA } from './data/sampleData';
import { analyzeShopeeScreenshots, analyzeShopeeVideoScreenshots } from './services/geminiService';
import { uploadScreenshotToFirebase, saveSessionToFirebase, fetchSessionsFromFirebase, storage as firebaseStorage, saveStudioDataToFirestore, loadStudioDataFromFirestore, subscribeToStudioData, isFirebaseConfigured } from './services/firebaseService';
import { isSupabaseConfigured, loadStudioDataFromSupabase, saveStudioDataToSupabase, subscribeToStudioDataSupabase, uploadScreenshotToSupabase, saveSessionToSupabase } from './services/supabaseService';
import { remoteLog } from './services/remoteLogger';

// ====== PINTEREST CSV / EXCEL EXPORT PARSER ======
export function parsePinterestCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  const result = {
    id: "pin_" + Date.now(),
    month: new Date().toISOString().slice(0, 7),
    dateRange: "Custom Range",
    account: "@productijustfound",
    impressions: 0,
    engagements: 0,
    outboundClicks: 0,
    saves: 0,
    totalAudience: 0,
    engagedAudience: 0,
    monthlyTotalAudience: 10000,
    dailyImpressions: [],
    topBoards: [],
    topPins: [],
    demographics: {
      age: [],
      gender: [],
      device: [],
      countries: [],
      metros: [],
      interests: []
    }
  };

  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/\d{4}-\d{2}-\d{2}/) && line.includes(" - ")) {
      result.dateRange = line;
      const m = line.match(/\d{4}-\d{2}/);
      if (m) result.month = m[0];
      continue;
    }

    if (line.startsWith("Top Boards")) { currentSection = "boards"; continue; }
    if (line.startsWith("Top Pins")) { currentSection = "pins"; continue; }
    if (line.startsWith("Interests")) { currentSection = "interests"; continue; }
    if (line.startsWith("Countries,")) { currentSection = "countries"; continue; }
    if (line.startsWith("Metros,")) { currentSection = "metros"; continue; }
    if (line.startsWith("Gender,")) { currentSection = "gender"; continue; }
    if (line.startsWith("Device,")) { currentSection = "device"; continue; }
    if (line.startsWith("Age,")) { currentSection = "age"; continue; }
    if (line.startsWith("Date,Impressions")) { currentSection = "daily"; continue; }

    const parts = line.split(",").map(p => p.replace(/^"|"$/g, '').trim());

    if (currentSection === "daily") {
      if (parts.length >= 2 && parts[0].match(/\d{4}-\d{2}-\d{2}/)) {
        const val = parseInt(parts[1], 10) || 0;
        const shortDate = parts[0].slice(5);
        result.dailyImpressions.push({ date: shortDate, impressions: val });
        result.impressions += val;
      }
    } else if (currentSection === "boards") {
      if (parts[0].includes("pinterest.com") && parts.length >= 2) {
        const boardName = parts[0].split('/').filter(Boolean).pop() || "board";
        const imps = parseInt(parts[1], 10) || 0;
        const engs = parseInt(parts[2], 10) || 0;
        const pinClk = parseInt(parts[3], 10) || 0;
        const outClk = parseInt(parts[4], 10) || 0;
        const svs = parseInt(parts[5], 10) || 0;
        result.topBoards.push({
          name: boardName,
          link: parts[0],
          impressions: imps,
          engagements: engs,
          pinClicks: pinClk,
          outboundClicks: outClk,
          saves: svs
        });
        result.engagements += engs;
        result.saves += svs;
        result.outboundClicks += outClk;
      }
    } else if (currentSection === "pins") {
      if (parts[0].includes("pinterest.com") && parts.length >= 2) {
        const pinId = parts[0].split('/').filter(Boolean).pop() || "pin";
        const imps = parseInt(parts[parts.length - 1], 10) || 0;
        result.topPins.push({
          id: pinId,
          link: parts[0],
          type: parts[1] || "Organic",
          source: parts[2] || "From you",
          impressions: imps
        });
      }
    } else if (currentSection === "age" && parts.length >= 2) {
      if (!parts[0].startsWith("Age")) {
        const val = parseFloat(parts[1]) || 0;
        const pct = val < 1 ? val * 100 : val;
        result.demographics.age.push({ label: parts[0], percent: parseFloat(pct.toFixed(1)) });
      }
    } else if (currentSection === "gender" && parts.length >= 2) {
      if (!parts[0].startsWith("Gender")) {
        const val = parseFloat(parts[1]) || 0;
        const pct = val < 1 ? val * 100 : val;
        result.demographics.gender.push({ label: parts[0], percent: parseFloat(pct.toFixed(1)) });
      }
    } else if (currentSection === "device" && parts.length >= 2) {
      if (!parts[0].startsWith("Device")) {
        const val = parseFloat(parts[1]) || 0;
        const pct = val < 1 ? val * 100 : val;
        result.demographics.device.push({ label: parts[0], percent: parseFloat(pct.toFixed(1)) });
      }
    } else if (currentSection === "countries" && parts.length >= 2) {
      if (!parts[0].startsWith("Countries")) {
        const val = parseFloat(parts[1]) || 0;
        const pct = val < 1 ? val * 100 : val;
        result.demographics.countries.push({ label: parts[0], percent: parseFloat(pct.toFixed(1)) });
      }
    } else if (currentSection === "metros" && parts.length >= 2) {
      if (!parts[0].startsWith("Metros")) {
        const val = parseFloat(parts[1]) || 0;
        const pct = val < 1 ? val * 100 : val;
        result.demographics.metros.push({ label: parts[0], percent: parseFloat(pct.toFixed(1)) });
      }
    } else if (currentSection === "interests" && parts.length >= 3) {
      if (!parts[0].startsWith("Category")) {
        const categoryName = parts[0];
        const val = parseFloat(parts[2]) || 0;
        const pct = val < 1 ? val * 100 : val;
        const aff = parseFloat(parts[3]) || 1.0;
        if (!result.demographics.interests.some(i => i.category === categoryName)) {
          result.demographics.interests.push({ category: categoryName, percent: parseFloat(pct.toFixed(1)), affinity: aff });
        }
      }
    }
  }

  // Fallbacks if daily sum empty
  if (result.impressions === 0 && result.topBoards.length > 0) {
    result.impressions = result.topBoards.reduce((acc, b) => acc + b.impressions, 0);
  }

  return result;
}

// ====== EXCEL / CSV EXPORTER UTILITY ======
export function downloadCsv(filename, rows) {
  if (!rows || !rows.length) return;

  const separator = ',';
  const keys = Object.keys(rows[0]);

  // Add UTF-8 BOM so Excel opens it automatically with correct character encoding and column separation
  const csvContent =
    '\uFEFF' +
    keys.join(separator) + '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k].toString();
        cell = cell.replace(/"/g, '""');
        if (cell.search(/("|,|\n)/) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ====== STRICT DEDUPLICATION UTILITY ======
export function deduplicateSessions(sessions) {
  if (!Array.isArray(sessions)) return [];
  const seen = new Set();
  const result = [];
  for (const s of sessions) {
    if (!s) continue;
    const normTitle = (s.title || '').trim().toLowerCase();
    const normTime = (s.startTime || s.dateFormatted || '').trim();
    // Unique key: prefer ID, fallback to Title + StartTime/Date
    const uniqueKey = s.id ? `id_${s.id}` : `key_${normTitle}_${normTime}`;
    
    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      result.push(s);
    }
  }
  return result;
}

export default function App() {
  // URL-based View Mode State ('public' at '/' vs 'admin' at '/admin')
  const [viewMode, setViewModeState] = useState(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return 'admin';
    }
    return 'public';
  });

  const setViewMode = (mode) => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      const targetPath = mode === 'admin' ? '/admin' : '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    }
  };

  // Sync state on browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/admin')) {
        setViewModeState('admin');
      } else {
        setViewModeState('public');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("paramara_auth_session") === "true";
  });
  
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Portal Navigation State
  const [activeTab, setActiveTab] = useState('tabAnalytics');
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [financeSubTab, setFinanceSubTab] = useState('all'); // 'all' | 'capex' | 'opex' | 'personal' | 'other_income'
  
  // Light/Dark Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("paramara_theme") || "light";
  });

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("paramara_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // ====== TOAST NOTIFICATION SYSTEM ======
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error'|'info' }
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  
  const [studioData, setStudioData] = useState(() => {
    let rawData = INITIAL_STUDIO_DATA;
    const saved = localStorage.getItem("paramara_studio_admin_data_v2");
    if (saved) {
      try { rawData = JSON.parse(saved); } catch (e) {}
    }
    return {
      ...rawData,
      shopeeSessions: deduplicateSessions(rawData.shopeeSessions),
      shopeeVideoSessions: deduplicateSessions(rawData.shopeeVideoSessions)
    };
  });
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Cloud Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'offline'
  const isRemoteUpdate = useRef(false);
  const saveDebounceTimer = useRef(null);
  const isInitialLoad = useRef(true);
  
  // Modals state
  const [modalType, setModalType] = useState(null); // 'scan' | 'scan_video' | 'finance' | 'project' | 'schedule' | 'editSession' | 'editVideoSession' | 'addAdmin' | 'editAdmin'
  const [editingSession, setEditingSession] = useState(null);
  const [editingVideoSession, setEditingVideoSession] = useState(null);
  const [editingAdminUser, setEditingAdminUser] = useState(null);
  const [editingFinanceItem, setEditingFinanceItem] = useState(null);
  
  // Multi-Step Upload & Scan State
  const [scanning, setScanning] = useState(false);
  const [scannedPreview, setScannedPreview] = useState(null);
  const [scannedVideoPreview, setScannedVideoPreview] = useState(null);

  // Admin User Form State
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminFullName, setNewAdminFullName] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("Admin Operasional");

  // Financial Form States
  const [financialType, setFinancialType] = useState("capex"); // 'capex' | 'opex'
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemDate, setItemDate] = useState("");
  const [opexFrequency, setOpexFrequency] = useState("Once"); // 'Once' | 'Monthly' | 'Yearly'

  // Video scanner slot state
  const [videoFileSlot1, setVideoFileSlot1] = useState(null);
  const [videoFileSlot2, setVideoFileSlot2] = useState(null);
  const [videoPreviewUrl1, setVideoPreviewUrl1] = useState(null);
  const [videoPreviewUrl2, setVideoPreviewUrl2] = useState(null);

  // Video expanded card state
  const [expandedVideoId, setExpandedVideoId] = useState(null);

  // Branding Settings State
  const [domainNameInput, setDomainNameInput] = useState("paramarastudio.com");

  // Dual Screenshot Files State
  const [fileSlot1, setFileSlot1] = useState(null);
  const [fileSlot2, setFileSlot2] = useState(null);

  // Preview Image Data URLs for visual confirmation
  const [previewUrl1, setPreviewUrl1] = useState(null);
  const [previewUrl2, setPreviewUrl2] = useState(null);

  // Handle Image File 1 Select
  const handleFile1Select = (e) => {
    const file = e.target.files?.[0] || null;
    setFileSlot1(file);
    if (file) {
      setPreviewUrl1(URL.createObjectURL(file));
    } else {
      setPreviewUrl1(null);
    }
  };

  // Handle Image File 2 Select
  const handleFile2Select = (e) => {
    const file = e.target.files?.[0] || null;
    setFileSlot2(file);
    if (file) {
      setPreviewUrl2(URL.createObjectURL(file));
    } else {
      setPreviewUrl2(null);
    }
  };

  // Handle Video Image File 1 Select
  const handleVideoFile1Select = (e) => {
    const file = e.target.files?.[0] || null;
    setVideoFileSlot1(file);
    if (file) {
      setVideoPreviewUrl1(URL.createObjectURL(file));
    } else {
      setVideoPreviewUrl1(null);
    }
  };

  // Handle Video Image File 2 Select
  const handleVideoFile2Select = (e) => {
    const file = e.target.files?.[0] || null;
    setVideoFileSlot2(file);
    if (file) {
      setVideoPreviewUrl2(URL.createObjectURL(file));
    } else {
      setVideoPreviewUrl2(null);
    }
  };

  // ====== FIREBASE FIRESTORE CROSS-DEVICE SYNC ======

  // Track when we last saved to prevent onSnapshot echo loop
  const lastSaveTimestamp = useRef(null);

  // 1. On mount: Load from Supabase/Firestore (if configured), then subscribe to real-time updates
  useEffect(() => {
    const isCloudConfigured = isSupabaseConfigured || isFirebaseConfigured;
    if (!isCloudConfigured) {
      setCloudSyncStatus('offline');
      isInitialLoad.current = false;
      remoteLog.warn('No cloud provider configured — running in Local Only mode');
      return;
    }

    let unsubscribe = null;
    let isMounted = true;

    async function initCloudSync() {
      setCloudSyncStatus('syncing');

      try {
        const loadFn = isSupabaseConfigured ? loadStudioDataFromSupabase : loadStudioDataFromFirestore;
        const saveFn = isSupabaseConfigured ? saveStudioDataToSupabase : saveStudioDataToFirestore;

        const cloudData = await Promise.race([
          loadFn(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);

        if (!isMounted) return;

        if (cloudData) {
          isRemoteUpdate.current = true;
          setStudioData(prev => {
            const mergedSessions = deduplicateSessions([...(prev.shopeeSessions || []), ...(cloudData.shopeeSessions || [])]);
            const mergedVideoSessions = deduplicateSessions([...(prev.shopeeVideoSessions || []), ...(cloudData.shopeeVideoSessions || [])]);
            
            const mergedData = {
              ...prev,
              ...cloudData,
              shopeeSessions: mergedSessions,
              shopeeVideoSessions: mergedVideoSessions,
              clientProjects: (cloudData.clientProjects && cloudData.clientProjects.length > 0) ? cloudData.clientProjects : (prev.clientProjects || []),
              liveSchedules: (cloudData.liveSchedules && cloudData.liveSchedules.length > 0) ? cloudData.liveSchedules : (prev.liveSchedules || []),
              capexList: (cloudData.capexList && cloudData.capexList.length > 0) ? cloudData.capexList : (prev.capexList || []),
              opexList: (cloudData.opexList && cloudData.opexList.length > 0) ? cloudData.opexList : (prev.opexList || []),
              personalList: (cloudData.personalList && cloudData.personalList.length > 0) ? cloudData.personalList : (prev.personalList || []),
              adminUsers: (cloudData.adminUsers && cloudData.adminUsers.length > 0) ? cloudData.adminUsers : (prev.adminUsers || []),
            };

            // If local state had more sessions than cloud, push merged state back to cloud immediately
            if ((prev.shopeeSessions || []).length > (cloudData.shopeeSessions || []).length) {
              saveFn(mergedData);
            }

            return mergedData;
          });
          setCloudSyncStatus('synced');
          remoteLog.info('Cloud initial sync: smart merged remote and local data');
        } else {
          const localData = JSON.parse(localStorage.getItem("paramara_studio_admin_data_v2") || "null");
          if (localData) {
            lastSaveTimestamp.current = Date.now();
            await saveFn(localData);
          }
          if (isMounted) setCloudSyncStatus('synced');
        }
      } catch (err) {
        remoteLog.error('Cloud init sync failed', { error: err.message });
        if (isMounted) setCloudSyncStatus('offline');
      }

      isInitialLoad.current = false;

      // Subscribe to real-time updates from other devices
      const subscribeFn = isSupabaseConfigured ? subscribeToStudioDataSupabase : subscribeToStudioData;
      unsubscribe = subscribeFn((remoteData) => {
        if (!isMounted || !remoteData) return;

        if (lastSaveTimestamp.current && (Date.now() - lastSaveTimestamp.current) < 3000) {
          return;
        }

        isRemoteUpdate.current = true;
        setStudioData(prev => ({
          ...prev,
          ...remoteData,
          shopeeSessions: deduplicateSessions([...(prev.shopeeSessions || []), ...(remoteData.shopeeSessions || [])]),
          shopeeVideoSessions: deduplicateSessions([...(prev.shopeeVideoSessions || []), ...(remoteData.shopeeVideoSessions || [])]),
          clientProjects: remoteData.clientProjects || prev.clientProjects || [],
          liveSchedules: remoteData.liveSchedules || prev.liveSchedules || [],
          capexList: remoteData.capexList || prev.capexList || [],
          opexList: remoteData.opexList || prev.opexList || [],
          personalList: remoteData.personalList || prev.personalList || [],
          adminUsers: remoteData.adminUsers || prev.adminUsers || [],
        }));
        setCloudSyncStatus('synced');
      });
    }

    initCloudSync();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. Save Studio Data to localStorage AND Cloud (debounced) on every change
  useEffect(() => {
    localStorage.setItem("paramara_studio_admin_data_v2", JSON.stringify(studioData));

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    if (isInitialLoad.current) return;

    const isCloudConfigured = isSupabaseConfigured || isFirebaseConfigured;
    if (!isCloudConfigured) return;

    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }

    setCloudSyncStatus('syncing');
    saveDebounceTimer.current = setTimeout(async () => {
      lastSaveTimestamp.current = Date.now();
      const saveFn = isSupabaseConfigured ? saveStudioDataToSupabase : saveStudioDataToFirestore;
      const success = await saveFn(studioData);
      setCloudSyncStatus(success ? 'synced' : 'offline');
      if (!success) remoteLog.error('Cloud debounced save failed');
    }, 1000);

    return () => {
      if (saveDebounceTimer.current) {
        clearTimeout(saveDebounceTimer.current);
      }
    };
  }, [studioData]);

  // Handle Login Authentication
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginUsername.trim() === "abdumalikh" && loginPassword === "Ygj80kq91j!") {
      setIsAuthenticated(true);
      localStorage.setItem("paramara_auth_session", "true");
      setLoginError("");
      setShowLoginModal(false);
      setViewMode('admin');
      remoteLog.info('Admin login successful', { user: loginUsername.trim() });
    } else {
      setLoginError("Username atau password tidak cocok. Silakan coba lagi.");
      remoteLog.warn('Admin login failed', { attemptedUser: loginUsername.trim() });
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("paramara_auth_session");
    setLoginUsername("");
    setLoginPassword("");
    setViewMode('public');
  };

  // Clear All Sessions Helper
  const handleClearAllSessions = () => {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh data sesi Shopee Live?")) {
      setStudioData(prev => ({ ...prev, shopeeSessions: [] }));
      showToast('Seluruh data sesi berhasil dibersihkan!');
    }
  };
  // ====== GLOBAL TIMEFRAME FILTER ======
  const [dateFilterPreset, setDateFilterPreset] = useState('all'); // 'all' | 'today' | '7d' | '30d' | 'thisMonth' | 'custom'
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  // Parse various date formats used in the app into a Date object
  const parseItemDate = (item) => {
    // Financial items use 'date' field: "2026-08-01"
    if (item.date) return new Date(item.date);
    // Shopee Live sessions use 'dateFormatted' or 'startTime': "01-08-2026 21:37" or "01-08-2026"
    const raw = item.dateFormatted || item.startTime || '';
    if (!raw) return null;
    // Try DD-MM-YYYY HH:MM or DD-MM-YYYY
    const match = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (match) {
      return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    }
    // Try ISO or other standard formats
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  // Calculate date range from preset
  const getDateRange = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilterPreset) {
      case 'today':
        return { start: todayStart, end: new Date(todayStart.getTime() + 86400000) };
      case '7d':
        return { start: new Date(todayStart.getTime() - 6 * 86400000), end: new Date(todayStart.getTime() + 86400000) };
      case '30d':
        return { start: new Date(todayStart.getTime() - 29 * 86400000), end: new Date(todayStart.getTime() + 86400000) };
      case 'thisMonth':
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(todayStart.getTime() + 86400000) };
      case 'custom':
        return {
          start: customDateStart ? new Date(customDateStart) : new Date(0),
          end: customDateEnd ? new Date(new Date(customDateEnd).getTime() + 86400000) : new Date(todayStart.getTime() + 86400000)
        };
      default: // 'all'
        return null;
    }
  };

  // Filter any array by date range
  const filterByDate = (items) => {
    const range = getDateRange();
    if (!range) return items; // 'all' — no filter
    return items.filter(item => {
      const d = parseItemDate(item);
      if (!d) return true; // If no date parseable, include it
      return d >= range.start && d < range.end;
    });
  };

  // Derived Calculations (with timeframe filter applied)
  const allSessions = studioData.shopeeSessions || [];
  const allVideoSessions = studioData.shopeeVideoSessions || [];
  const allCapexList = studioData.capexList || [];
  const allOpexList = studioData.opexList || [];
  const allPersonalList = studioData.personalList || [];
  const allOtherIncomeList = studioData.otherIncomeList || [];
  const allProjects = studioData.clientProjects || [];
  const adminUsers = studioData.adminUsers || INITIAL_STUDIO_DATA.adminUsers;
  const allPinterestReports = studioData.pinterestAnalytics || INITIAL_STUDIO_DATA.pinterestAnalytics;

  // Filtered data arrays used everywhere
  const sessions = filterByDate(allSessions);
  const videoSessions = filterByDate(allVideoSessions);
  const capexList = filterByDate(allCapexList);
  const opexList = filterByDate(allOpexList);
  const personalList = filterByDate(allPersonalList);
  const otherIncomeList = filterByDate(allOtherIncomeList);
  const projects = allProjects; // Projects don't have date field yet
  const pinterestReports = allPinterestReports;

  const [pinterestSubTab, setPinterestSubTab] = useState('overview'); // 'overview' | 'audience' | 'files'

  // Handler for uploading Pinterest Analytics CSV (Smart Merge for Overview vs Audience files)
  const handlePinterestCsvUpload = (e, forcedType = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const parsedData = parsePinterestCsv(text);

        const isAudienceFile = forcedType === 'audience' || (forcedType === null && (fileName.toLowerCase().includes("audience") || text.includes("Category,Bulk Sheet Category") || text.includes("Audience View") || text.includes("Audience Size")));
        const isOverviewFile = forcedType === 'overview' || (forcedType === null && (fileName.toLowerCase().includes("overview") || text.includes("Date,Impressions") || text.includes("Top Boards")));

        setStudioData(prev => {
          const existingList = [...(prev.pinterestAnalytics || INITIAL_STUDIO_DATA.pinterestAnalytics)];
          
          let targetIndex = existingList.findIndex(r => r.month === parsedData.month || r.id === "pin_2026_07");
          if (targetIndex === -1 && existingList.length > 0) targetIndex = 0;

          if (targetIndex !== -1) {
            const current = { ...existingList[targetIndex] };

            if (isOverviewFile) {
              current.overviewFileName = fileName;
              current.overviewUploadedAt = new Date().toLocaleString('id-ID');
              if (parsedData.impressions > 0) current.impressions = parsedData.impressions;
              if (parsedData.engagements > 0) current.engagements = parsedData.engagements;
              if (parsedData.outboundClicks >= 0) current.outboundClicks = parsedData.outboundClicks;
              if (parsedData.saves > 0) current.saves = parsedData.saves;
              if (parsedData.dailyImpressions.length > 0) current.dailyImpressions = parsedData.dailyImpressions;
              if (parsedData.topBoards.length > 0) current.topBoards = parsedData.topBoards;
              if (parsedData.topPins.length > 0) current.topPins = parsedData.topPins;
              if (parsedData.dateRange && parsedData.dateRange !== "Custom Range") current.dateRange = parsedData.dateRange;
            }

            if (isAudienceFile) {
              current.audienceFileName = fileName;
              current.audienceUploadedAt = new Date().toLocaleString('id-ID');
              if (parsedData.totalAudience > 0) current.totalAudience = parsedData.totalAudience;
              if (parsedData.engagedAudience > 0) current.engagedAudience = parsedData.engagedAudience;
              if (parsedData.monthlyTotalAudience > 0) current.monthlyTotalAudience = parsedData.monthlyTotalAudience;
              if (parsedData.demographics.age.length > 0) current.demographics.age = parsedData.demographics.age;
              if (parsedData.demographics.gender.length > 0) current.demographics.gender = parsedData.demographics.gender;
              if (parsedData.demographics.device.length > 0) current.demographics.device = parsedData.demographics.device;
              if (parsedData.demographics.countries.length > 0) current.demographics.countries = parsedData.demographics.countries;
              if (parsedData.demographics.metros.length > 0) current.demographics.metros = parsedData.demographics.metros;
              if (parsedData.demographics.interests.length > 0) current.demographics.interests = parsedData.demographics.interests;
            }

            // Deduplicate file history by fileType so we keep the latest uploaded file for each type
            let history = current.fileHistory ? [...current.fileHistory] : [
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
            ];

            const fileTypeLabel = isAudienceFile ? "Audience Insights" : "Overview Performance";
            
            history = history.filter(h => h.fileType !== fileTypeLabel);
            history.unshift({
              id: "file_" + Date.now(),
              fileName: fileName,
              fileType: fileTypeLabel,
              uploadedAt: new Date().toLocaleString('id-ID'),
              rowsCount: text.split(/\r?\n/).length,
              status: "Active & Synced"
            });

            current.fileHistory = history;
            existingList[targetIndex] = current;
            return { ...prev, pinterestAnalytics: existingList };
          } else {
            parsedData.overviewFileName = isOverviewFile ? fileName : null;
            parsedData.audienceFileName = isAudienceFile ? fileName : null;
            parsedData.fileHistory = [{
              id: "file_" + Date.now(),
              fileName: fileName,
              fileType: isAudienceFile ? "Audience Insights" : "Overview Performance",
              uploadedAt: new Date().toLocaleString('id-ID'),
              rowsCount: text.split(/\r?\n/).length,
              status: "Active & Synced"
            }];
            return { ...prev, pinterestAnalytics: [parsedData, ...existingList] };
          }
        });

        setModalType(null);
        showToast(`File ${isAudienceFile ? 'Audience Insights' : 'Overview Performance'} (${fileName}) Berhasil Diimpor & Digabungkan!`);
      } catch (err) {
        showToast('Gagal memproses file CSV: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  // Revenue
  const totalShopeeRev = sessions.reduce((acc, s) => acc + (s.revenue || 0), 0);
  const totalGrossCommission = sessions.reduce((acc, s) => acc + (s.grossCommission || 0), 0);
  
  const totalVideoRev = videoSessions.reduce((acc, v) => acc + (v.revenue || 0), 0);
  const totalGrossVideoCommission = videoSessions.reduce((acc, v) => acc + (v.grossCommission || 0), 0);

  const totalProjectRev = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  const totalOtherIncome = otherIncomeList.reduce((acc, i) => acc + (i.amount || 0), 0);

  // Total GMV / Transaction Volume (Shopee Live + Shopee Video)
  const totalCombinedGMV = totalShopeeRev + totalVideoRev;

  // Actual Studio Gross Revenue (Live Comm + Video Comm + Project Income + Other Income/Bonus)
  const totalStudioGrossRevenue = totalGrossCommission + totalGrossVideoCommission + totalProjectRev + totalOtherIncome;

  // Expenses
  const totalCapex = capexList.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalOpex = opexList.reduce((acc, o) => acc + (o.amount || 0), 0);
  const totalPersonal = personalList.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalExpenses = totalCapex + totalOpex;
  const totalCashOutflow = totalCapex + totalOpex + totalPersonal;

  // Profitability
  const netProfit = totalStudioGrossRevenue - totalExpenses;
  const netProfitMarginPercent = totalStudioGrossRevenue > 0 ? (netProfit / totalStudioGrossRevenue) * 100 : 0;

  // Profitability After Personal Purchase
  const netProfitAfterPersonal = totalStudioGrossRevenue - totalCashOutflow;
  const netProfitAfterPersonalMarginPercent = totalStudioGrossRevenue > 0 ? (netProfitAfterPersonal / totalStudioGrossRevenue) * 100 : 0;

  const totalCombinedIncome = totalShopeeRev + totalProjectRev; // fallback compatibility
  const activeProjectsCount = projects.filter(p => p.status === "Aktif").length;

  // Add Admin User
  const handleAddAdminUser = (e) => {
    e.preventDefault();
    if (!newAdminUsername || !newAdminFullName) return;

    const newAdmin = {
      id: "admin_" + Date.now(),
      username: newAdminUsername.trim().toLowerCase(),
      fullName: newAdminFullName.trim(),
      role: newAdminRole,
      email: `${newAdminUsername.trim().toLowerCase()}@paramarastudio.com`,
      status: "Aktif",
      lastLogin: "Baru dibuat"
    };

    setStudioData(prev => ({
      ...prev,
      adminUsers: [...(prev.adminUsers || []), newAdmin]
    }));

    setNewAdminUsername("");
    setNewAdminFullName("");
    setModalType(null);
    showToast('Akun Admin berhasil ditambahkan!');
  };

  // Save Edit Admin User
  const handleSaveEditedAdmin = (e) => {
    e.preventDefault();
    if (!editingAdminUser) return;

    setStudioData(prev => ({
      ...prev,
      adminUsers: (prev.adminUsers || []).map(usr => usr.id === editingAdminUser.id ? editingAdminUser : usr)
    }));

    setEditingAdminUser(null);
    setModalType(null);
    showToast('Data profil admin berhasil diperbarui!');
  };

  // INSTANT AI Vision Scanning Handler (NO SLOW CLOUD WAITING)
  const handleDualAnalysis = async () => {
    const filesToProcess = [fileSlot1, fileSlot2].filter(Boolean);
    if (filesToProcess.length === 0) {
      showToast('Mohon pilih minimal 1 foto screenshot!', 'error');
      return;
    }

    setScanning(true);
    remoteLog.info('AI Scan started (Shopee Live)', { fileCount: filesToProcess.length });

    try {
      // Analyze INSTANTLY with Gemini Vision AI via Vercel serverless proxy
      const result = await analyzeShopeeScreenshots(filesToProcess);
      result.grossCommission = "";

      setScannedPreview(result);
      remoteLog.info('AI Scan success (Shopee Live)', { revenue: result.revenue, orders: result.orders });
    } catch (err) {
      showToast('Gagal membaca screenshot: ' + err.message, 'error');
      remoteLog.error('AI Scan failed (Shopee Live)', { error: err.message });
    } finally {
      setScanning(false);
    }
  };

  // Save Session & Asynchronously Upload to Firebase in background
  const handleSaveScannedSession = async () => {
    const sessionToSave = { 
      ...scannedPreview,
      grossCommission: parseInt(scannedPreview.grossCommission) || 0
    };

    // 1. Immediately Save to Local State so UI updates instantly (with deduplication)!
    setStudioData(prev => {
      const list = prev.shopeeSessions || [];
      const normTitle = (sessionToSave.title || '').trim().toLowerCase();
      const normTime = (sessionToSave.startTime || sessionToSave.dateFormatted || '').trim();

      const existingIndex = list.findIndex(s => 
        s.id === sessionToSave.id ||
        ((s.title || '').trim().toLowerCase() === normTitle && (s.startTime || s.dateFormatted || '').trim() === normTime)
      );

      let updatedList = [...list];
      if (existingIndex >= 0) {
        updatedList[existingIndex] = { ...updatedList[existingIndex], ...sessionToSave };
      } else {
        updatedList.unshift(sessionToSave);
      }

      return {
        ...prev,
        shopeeSessions: deduplicateSessions(updatedList)
      };
    });

    setScannedPreview(null);
    setFileSlot1(null);
    setFileSlot2(null);
    setPreviewUrl1(null);
    setPreviewUrl2(null);
    setModalType(null);

    showToast('Metrik & Komisi Kotor Berhasil Disimpan!');
    remoteLog.info('Shopee Live session saved', { sessionId: sessionToSave.id, revenue: sessionToSave.revenue });

    // 2. Asynchronously upload to Firebase Storage in background without blocking user UI
    if (firebaseStorage) {
      try {
        if (fileSlot1) {
          const url1 = await uploadScreenshotToFirebase(fileSlot1);
          if (url1) sessionToSave.screenshotUrlTop = url1;
        }
        if (fileSlot2) {
          const url2 = await uploadScreenshotToFirebase(fileSlot2);
          if (url2) sessionToSave.screenshotUrlBottom = url2;
        }
        await saveSessionToFirebase(sessionToSave);
      } catch (e) {
        console.warn("Background Firebase upload finished with warning:", e.message);
      }
    }
  };

  const handleSaveEditedSession = () => {
    if (!editingSession) return;
    setStudioData(prev => ({
      ...prev,
      shopeeSessions: prev.shopeeSessions.map(s => s.id === editingSession.id ? editingSession : s)
    }));
    setEditingSession(null);
    setModalType(null);
    showToast('Perubahan data sesi berhasil disimpan!');
  };

  // Shopee Video Analysis
  const handleVideoDualAnalysis = async () => {
    const filesToProcess = [videoFileSlot1, videoFileSlot2].filter(Boolean);
    if (filesToProcess.length === 0) {
      showToast('Mohon pilih minimal 1 foto screenshot!', 'error');
      return;
    }

    setScanning(true);
    remoteLog.info('AI Scan started (Shopee Video)', { fileCount: filesToProcess.length });

    try {
      const result = await analyzeShopeeVideoScreenshots(filesToProcess);
      result.grossCommission = "";
      setScannedVideoPreview(result);
      remoteLog.info('AI Scan success (Shopee Video)', { revenue: result.revenue, orders: result.totalOrders });
    } catch (err) {
      showToast('Gagal membaca screenshot video: ' + err.message, 'error');
      remoteLog.error('AI Scan failed (Shopee Video)', { error: err.message });
    } finally {
      setScanning(false);
    }
  };

  // Save Video Session
  const handleSaveScannedVideoSession = async () => {
    if (!scannedVideoPreview) return;

    const videoToSave = { 
      ...scannedVideoPreview,
      grossCommission: parseInt(scannedVideoPreview.grossCommission) || 0
    };

    setStudioData(prev => {
      const list = prev.shopeeVideoSessions || [];
      const normTitle = (videoToSave.title || '').trim().toLowerCase();
      const normTime = (videoToSave.startTime || videoToSave.dateFormatted || '').trim();

      const existingIndex = list.findIndex(v => 
        v.id === videoToSave.id ||
        ((v.title || '').trim().toLowerCase() === normTitle && (v.startTime || v.dateFormatted || '').trim() === normTime)
      );

      let updatedList = [...list];
      if (existingIndex >= 0) {
        updatedList[existingIndex] = { ...updatedList[existingIndex], ...videoToSave };
      } else {
        updatedList.unshift(videoToSave);
      }

      return {
        ...prev,
        shopeeVideoSessions: deduplicateSessions(updatedList)
      };
    });
    setScannedVideoPreview(null);
    setVideoFileSlot1(null);
    setVideoFileSlot2(null);
    setVideoPreviewUrl1(null);
    setVideoPreviewUrl2(null);
    setModalType(null);

    showToast('Metrik & Pendapatan Video Berhasil Disimpan!');

    // Background upload if Firebase active
    if (firebaseStorage) {
      try {
        if (videoFileSlot1) {
          const url1 = await uploadScreenshotToFirebase(videoFileSlot1);
          if (url1) videoToSave.screenshotUrlTop = url1;
        }
        if (videoFileSlot2) {
          const url2 = await uploadScreenshotToFirebase(videoFileSlot2);
          if (url2) videoToSave.screenshotUrlBottom = url2;
        }
        // Save to Firebase (video sessions can use similar format or be deferred)
        await saveSessionToFirebase({ ...videoToSave, isVideo: true });
      } catch (e) {
        console.warn("Background Firebase upload finished with warning:", e.message);
      }
    }
  };

  const parseDateToISO = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const clean = dateStr.trim().split(' ')[0];
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
  };

  const handleOpenManualLiveInput = () => {
    const now = new Date();
    const isoDate = now.toISOString().split('T')[0];
    const todayStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    setScannedPreview({
      id: "live_manual_" + Date.now(),
      title: `Sesi Live ${todayStr}`,
      startTime: `${todayStr} 20:00`,
      dateISO: isoDate,
      dateFormatted: todayStr,
      duration: "01:30:00",
      revenue: 0,
      grossCommission: 0,
      totalOrders: 0,
      totalViews: 0,
      clickRatePercent: 0,
      activeViewers: 0,
      cartAdditions: 0,
      likes: 0,
      conversionRatePercent: 0,
      products: [],
      aiSummary: "Sesi live diinput secara manual.",
      created_at: new Date().toISOString()
    });
    setModalType('manual_live');
  };

  const handleOpenManualVideoInput = () => {
    const now = new Date();
    const isoDate = now.toISOString().split('T')[0];
    const todayStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    setScannedVideoPreview({
      id: "video_manual_" + Date.now(),
      title: `Performa Video ${todayStr}`,
      dateISO: isoDate,
      dateFormatted: todayStr,
      revenue: 0,
      grossCommission: 0,
      totalOrders: 0,
      totalViews: 0,
      likes: 0,
      conversionRatePercent: 0,
      aiSummary: "Data performa Shopee Video diinput secara manual.",
      created_at: new Date().toISOString()
    });
    setModalType('manual_video');
  };

  const handleSaveEditedVideoSession = () => {
    if (!editingVideoSession) return;
    setStudioData(prev => ({
      ...prev,
      shopeeVideoSessions: (prev.shopeeVideoSessions || []).map(v => v.id === editingVideoSession.id ? editingVideoSession : v)
    }));
    setEditingVideoSession(null);
    setModalType(null);
    showToast('Perubahan data video berhasil disimpan!');
  };

  const handleClearAllVideoSessions = () => {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh data Shopee Video?")) {
      setStudioData(prev => ({ ...prev, shopeeVideoSessions: [] }));
      showToast('Seluruh data Shopee Video berhasil dibersihkan!');
    }
  };

  // Financial Items Add & Delete
  const handleAddFinancialItem = (e) => {
    e.preventDefault();
    if (!itemName || !itemAmount) {
      showToast('Nama Item dan Jumlah harus diisi!', 'error');
      return;
    }

    const newItem = {
      id: "fin_" + Date.now(),
      name: itemName.trim(),
      category: itemCategory.trim() || "Umum",
      amount: parseInt(itemAmount) || 0,
      date: itemDate || new Date().toISOString().split('T')[0],
      frequency: opexFrequency
    };

    if (financialType === 'capex') {
      setStudioData(prev => ({
        ...prev,
        capexList: [...(prev.capexList || []), newItem]
      }));
    } else if (financialType === 'personal') {
      setStudioData(prev => ({
        ...prev,
        personalList: [...(prev.personalList || []), newItem]
      }));
    } else if (financialType === 'other_income') {
      setStudioData(prev => ({
        ...prev,
        otherIncomeList: [...(prev.otherIncomeList || []), newItem]
      }));
    } else {
      setStudioData(prev => ({
        ...prev,
        opexList: [...(prev.opexList || []), newItem]
      }));
    }

    setItemName("");
    setItemCategory("");
    setItemAmount("");
    setItemDate("");
    setOpexFrequency("Once");
    setModalType(null);
    showToast('Transaksi keuangan berhasil ditambahkan!');
  };

  const handleStartEditCapex = (item) => {
    setEditingFinanceItem({ ...item, type: 'capex' });
    setItemName(item.name);
    setItemCategory(item.category);
    setItemAmount(item.amount.toString());
    setItemDate(item.date);
    setOpexFrequency(item.frequency || "Once");
    setFinancialType('capex');
    setModalType('edit_finance');
  };

  const handleStartEditOpex = (item) => {
    setEditingFinanceItem({ ...item, type: 'opex' });
    setItemName(item.name);
    setItemCategory(item.category);
    setItemAmount(item.amount.toString());
    setItemDate(item.date || "");
    setOpexFrequency(item.frequency);
    setFinancialType('opex');
    setModalType('edit_finance');
  };

  const handleStartEditPersonal = (item) => {
    setEditingFinanceItem({ ...item, type: 'personal' });
    setItemName(item.name);
    setItemCategory(item.category || "Personal Purchase");
    setItemAmount(item.amount.toString());
    setItemDate(item.date || "");
    setOpexFrequency("Once");
    setFinancialType('personal');
    setModalType('edit_finance');
  };

  const handleStartEditOtherIncome = (item) => {
    setEditingFinanceItem({ ...item, type: 'other_income' });
    setItemName(item.name);
    setItemCategory(item.category || "Bonus Target");
    setItemAmount(item.amount.toString());
    setItemDate(item.date || "");
    setOpexFrequency("Once");
    setFinancialType('other_income');
    setModalType('edit_finance');
  };

  const handleSaveEditFinancialItem = (e) => {
    e.preventDefault();
    if (!itemName || !itemAmount) {
      showToast('Nama Item dan Jumlah harus diisi!', 'error');
      return;
    }

    const oldType = editingFinanceItem.type;
    const newType = financialType;

    const updatedItem = {
      ...editingFinanceItem,
      name: itemName.trim(),
      category: itemCategory.trim() || (newType === 'personal' ? "Personal Purchase" : newType === 'other_income' ? "Bonus Target" : "Umum"),
      amount: parseInt(itemAmount) || 0,
      date: itemDate || new Date().toISOString().split('T')[0],
      frequency: opexFrequency
    };

    setStudioData(prev => {
      let capex = [...(prev.capexList || [])];
      let opex = [...(prev.opexList || [])];
      let personal = [...(prev.personalList || [])];
      let otherIncome = [...(prev.otherIncomeList || [])];

      // Remove from old list
      if (oldType === 'capex') capex = capex.filter(i => i.id !== editingFinanceItem.id);
      else if (oldType === 'opex') opex = opex.filter(i => i.id !== editingFinanceItem.id);
      else if (oldType === 'personal') personal = personal.filter(i => i.id !== editingFinanceItem.id);
      else if (oldType === 'other_income') otherIncome = otherIncome.filter(i => i.id !== editingFinanceItem.id);

      // Add to new list
      if (newType === 'capex') capex.push(updatedItem);
      else if (newType === 'opex') opex.push(updatedItem);
      else if (newType === 'personal') personal.push(updatedItem);
      else if (newType === 'other_income') otherIncome.push(updatedItem);

      return {
        ...prev,
        capexList: capex,
        opexList: opex,
        personalList: personal,
        otherIncomeList: otherIncome
      };
    });

    setItemName("");
    setItemCategory("");
    setItemAmount("");
    setItemDate("");
    setOpexFrequency("Once");
    setEditingFinanceItem(null);
    setModalType(null);
    showToast(`Transaksi berhasil dipindahkan ke ${newType === 'capex' ? 'CAPEX' : newType === 'personal' ? 'Personal Purchase' : newType === 'other_income' ? 'Bonus & Pendapatan Lain' : 'OPEX'}!`);
  };

  const handleDeleteCapex = (id) => {
    if (confirm("Hapus item CAPEX ini?")) {
      setStudioData(prev => ({
        ...prev,
        capexList: (prev.capexList || []).filter(item => item.id !== id)
      }));
    }
  };

  const handleDeleteOpex = (id) => {
    if (confirm("Hapus item OPEX ini?")) {
      setStudioData(prev => ({
        ...prev,
        opexList: (prev.opexList || []).filter(item => item.id !== id)
      }));
    }
  };

  const handleDeletePersonal = (id) => {
    if (confirm("Hapus item Pembelian Pribadi ini?")) {
      setStudioData(prev => ({
        ...prev,
        personalList: (prev.personalList || []).filter(item => item.id !== id)
      }));
    }
  };

  const handleDeleteOtherIncome = (id) => {
    if (confirm("Hapus item Bonus / Pendapatan ini?")) {
      setStudioData(prev => ({
        ...prev,
        otherIncomeList: (prev.otherIncomeList || []).filter(item => item.id !== id)
      }));
    }
  };

  const handleExportBackupData = () => {
    try {
      const dataStr = JSON.stringify(studioData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `paramara_studio_backup_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showToast('Seluruh data berhasil diekspor & diunduh!');
    } catch (err) {
      showToast('Gagal mengekspor data: ' + err.message, 'error');
    }
  };

  const handleImportBackupData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Apakah Anda yakin ingin menimpa seluruh data saat ini dengan file cadangan ini? Data lama Anda akan digantikan sepenuhnya.")) {
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        
        if (!parsed.shopeeSessions && !parsed.shopeeVideoSessions && !parsed.clientProjects) {
          showToast('File backup tidak valid!', 'error');
          return;
        }

        setStudioData(parsed);
        showToast('Seluruh data berhasil dipulihkan dari file cadangan!');
      } catch (err) {
        showToast('Gagal membaca file backup: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleGenerateFinIntelAI = async (totalStudioGrossRevenue, totalOpex, totalCapex, opProfit, opMargin, cashFlowAfterInv, totalPersonal, totalCombinedGMV, reinvestmentRate) => {
    const snapshot = {
      grossRevenue: totalStudioGrossRevenue,
      opex: totalOpex,
      capex: totalCapex,
      operatingProfit: opProfit,
      operatingMargin: opMargin,
      cashFlowAfterInvestment: cashFlowAfterInv,
      personalWithdrawals: totalPersonal,
      totalGMV: totalCombinedGMV,
      reinvestmentRate: reinvestmentRate
    };

    try {
      showToast("Menghasilkan CFO Executive Insight (AI)...", "info", 5000);
      const prompt = `Sebagai Paramara CFO & Strategy Analyst, berikan insight keuangan eksekutif berdasarkan data berikut:
Pendapatan Kotor: Rp ${snapshot.grossRevenue}
OPEX: Rp ${snapshot.opex}
CAPEX (Investasi Aset): Rp ${snapshot.capex}
Laba Operasional (Operating Profit): Rp ${snapshot.operatingProfit} (Margin: ${snapshot.operatingMargin.toFixed(1)}%)
Cash Flow Setelah Investasi: Rp ${snapshot.cashFlowAfterInvestment}
Penarikan Pribadi (Owner Withdrawal): Rp ${snapshot.personalWithdrawals}
Total E-Commerce GMV: Rp ${snapshot.totalGMV}
Tingkat Reinvestasi (Reinvestment Rate): ${snapshot.reinvestmentRate.toFixed(1)}%

Berikan analisis dalam format teks ringkas (tanpa basa-basi). Gunakan format ini persis:

EXECUTIVE SUMMARY
[Ringkasan kondisi saat ini]

WHAT IS GOING WELL
[Kekuatan utama]

BIGGEST RISK
[Risiko terbesar]

OPPORTUNITY
[Peluang terbesar]

NEXT 7 DAYS
[Satu tindakan konkrit]

METRIC TO WATCH
[Metrik utama yang harus dipantau]`;

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
      if (!apiKey) {
        throw new Error("API Key Gemini tidak ditemukan. Harap masukkan di pengaturan.");
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Gagal menghubungi AI");
      
      const insightText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!insightText) throw new Error("Format respons AI tidak valid.");

      const generatedAt = new Date().toLocaleString('id-ID');
      const nextEligibleTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      setStudioData(prev => ({
        ...prev,
        finIntelAiInsight: {
          insightText,
          generatedAt,
          nextEligibleGenerationTime: nextEligibleTime,
          dataSnapshot: snapshot
        }
      }));

      showToast("AI Insight berhasil diperbarui!");
    } catch (err) {
      console.error(err);
      showToast("Gagal menghasilkan insight: " + err.message, "error");
    }
  };

  const handleExportLiveToExcel = () => {
    if (!sessions || sessions.length === 0) {
      showToast('Tidak ada data Shopee Live untuk diekspor!', 'error');
      return;
    }

    // Deduplicate sessions so each live session appears exactly once (1 Row / Session)
    const uniqueSessions = deduplicateSessions(sessions);

    const rows = uniqueSessions.map(s => {
      const productSummaryList = (s.products || [])
        .map(p => `${p.name} (GMV: Rp${(p.revenue||0).toLocaleString('id-ID')}, Keranjang: ${p.cartAdds||0})`)
        .join(' | ');

      return {
        "Judul Sesi": s.title || '-',
        "Tanggal & Waktu": s.startTime || s.dateFormatted || '-',
        "Durasi Sesi": s.duration || '-',
        "Penjualan GMV (Rp)": s.revenue || 0,
        "Komisi Kotor (Rp)": s.grossCommission || 0,
        "Total Pesanan": s.totalOrders || 0,
        "Total Views": s.totalViews || 0,
        "CTR Klik (%)": s.clickRatePercent || 0,
        "Penonton Aktif": s.activeViewers || 0,
        "Masuk Keranjang": s.cartAdditions || 0,
        "Total Suka": s.likes ?? s.likeCount ?? 0,
        "Tingkat Konversi (%)": s.ordersPerClickPercent ?? s.conversionRatePercent ?? 0,
        "Rincian Produk Terjual": productSummaryList || '-'
      };
    });

    downloadCsv(`Shopee_Live_Summary_Paramara_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast('Ringkasan Sesi Live (1 Baris / Sesi) berhasil diekspor ke Excel!');
  };

  const handleExportLiveProductsToExcel = () => {
    if (!sessions || sessions.length === 0) {
      showToast('Tidak ada data Shopee Live untuk diekspor!', 'error');
      return;
    }

    const uniqueSessions = deduplicateSessions(sessions);
    const rows = [];
    uniqueSessions.forEach(s => {
      if (s.products && s.products.length > 0) {
        s.products.forEach(p => {
          rows.push({
            "Judul Sesi": s.title || '-',
            "Tanggal & Waktu": s.startTime || s.dateFormatted || '-',
            "Nama Produk": p.name || '-',
            "Harga Katalog (Rp)": p.price || 0,
            "GMV Produk (Rp)": p.revenue || 0,
            "Klik Produk": p.clicks || 0,
            "Masuk Keranjang": p.cartAdds || 0
          });
        });
      }
    });

    if (rows.length === 0) {
      showToast('Belum ada rincian produk terdaftar di sesi live!', 'error');
      return;
    }

    downloadCsv(`Shopee_Live_Detail_Produk_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast('Rincian Detail Produk berhasil diekspor ke Excel!');
  };

  const handleExportVideoToExcel = () => {
    if (!videoSessions || videoSessions.length === 0) {
      showToast('Tidak ada data Shopee Video untuk diekspor!', 'error');
      return;
    }
    const rows = videoSessions.map(v => ({
      "Judul Video": v.title || '-',
      "Tanggal Waktu": v.startTime || v.dateFormatted || '-',
      "Durasi": v.duration || '-',
      "Penjualan GMV (Rp)": v.revenue || 0,
      "Komisi Kotor (Rp)": v.grossCommission || 0,
      "Total Pesanan": v.totalOrders || 0,
      "Produk Terjual": v.productsSold || 0,
      "Pembeli": v.buyers || 0,
      "Klik Produk": v.productClicks || 0,
      "Total Penonton": v.views || 0,
      "Suka": v.likes || 0,
      "Komentar": v.comments || 0,
      "Dibagikan": v.shares || 0,
      "Tingkat Konversi (%)": v.conversionRatePercent || 0
    }));
    downloadCsv(`Shopee_Video_Paramara_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast('Data Shopee Video berhasil diekspor ke Excel!');
  };

  const handleExportFinanceToExcel = () => {
    const capex = (studioData.capexList || []).map(c => ({
      "Tipe Transaksi": "CAPEX (Belanja Aset)",
      "Nama Item": c.name,
      "Kategori": c.category,
      "Tanggal": c.date,
      "Siklus": "-",
      "Nominal (Rp)": c.amount
    }));
    const opex = (studioData.opexList || []).map(o => ({
      "Tipe Transaksi": "OPEX (Operasional)",
      "Nama Item": o.name,
      "Kategori": o.category,
      "Tanggal": o.date || "-",
      "Siklus": o.frequency,
      "Nominal (Rp)": o.amount
    }));
    const personal = (studioData.personalList || []).map(p => ({
      "Tipe Transaksi": "Personal Purchase (Pembelian Pribadi)",
      "Nama Item": p.name,
      "Kategori": p.category || "Personal Purchase",
      "Tanggal": p.date || "-",
      "Siklus": "-",
      "Nominal (Rp)": p.amount
    }));
    const otherIncome = (studioData.otherIncomeList || []).map(i => ({
      "Tipe Transaksi": "Pendapatan Lain / Bonus",
      "Nama Item": i.name,
      "Kategori": i.category || "Bonus",
      "Tanggal": i.date || "-",
      "Siklus": "-",
      "Nominal (Rp)": i.amount
    }));
    const allFinance = [...capex, ...opex, ...personal, ...otherIncome];
    if (allFinance.length === 0) {
      showToast('Tidak ada data keuangan untuk diekspor!', 'error');
      return;
    }
    downloadCsv(`Laporan_Keuangan_Paramara_${new Date().toISOString().slice(0, 10)}.csv`, allFinance);
    showToast('Laporan Keuangan (CAPEX, OPEX, Personal & Bonus) berhasil diekspor ke Excel!');
  };

  // =========================================================================
  // VIEW MODE 1: PUBLIC OFFICIAL HOMEPAGE (URL: /)
  // =========================================================================
  if (viewMode === 'public') {
    return (
      <div style={{ background: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-main)' }}>
        
        {/* PUBLIC HEADER NAVIGATION */}
        <header className="glass-header" style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 100,
          padding: '0.75rem 1.25rem'
        }}>
          <div className="public-header-container" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <img src="/assets/logo.png" alt="Paramara Studio" style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--accent-gold-border)', objectFit: 'cover' }} onError={(e) => { e.target.src = '/logo.png'; }} />
              <div>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>Paramara Studio</h1>
                <span style={{ fontSize: '0.625rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.03em' }}>DIGITAL VENTURES</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
              <nav className="public-nav-links" style={{ display: 'flex', gap: '1.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                <a href="#ventures" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Ventures & Operations</a>
                <a href="#shopee" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Shopee Operations</a>
                <a href="#lestari" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Lestari Edu-Tech</a>
                <a href="#ijustfound" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>I Just Found This!</a>
              </nav>

              {isAuthenticated ? (
                <button className="btn btn-primary btn-sm" onClick={() => setViewMode('admin')}>
                  <Monitor style={{ width: 14, height: 14 }} /> Admin Portal
                </button>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => { setViewMode('admin'); setShowLoginModal(true); }}>
                  <Lock style={{ width: 14, height: 14 }} /> Admin Portal Login
                </button>
              )}
            </div>

          </div>
        </header>

        {/* HERO SECTION */}
        <section className="public-hero-section" style={{ padding: '4rem 1.5rem 3rem', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
          <div className="brand-badge" style={{ marginBottom: '1rem', padding: '6px 14px', fontSize: '0.75rem', display: 'inline-flex' }}>
            <Sparkles style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 6 }} /> Paramara Studio Ecosystem
          </div>
          <h1 className="public-hero-title" style={{ fontSize: '2.3rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.3, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Digital Venture Building & Data-Driven Operations.
          </h1>
          <p className="public-hero-desc" style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '2rem', maxWidth: 740, margin: '0 auto 2rem' }}>
            <strong>Paramara Studio</strong> operates an integrated portfolio of specialized media and technology ventures: Shopee Live & Video Commerce management, the <em>Lestari</em> Indonesian cultural edu-tech platform, and US-market product discovery media.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
            <a href="#ventures" className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
              Explore Operations & Ventures <ArrowRight style={{ width: 16, height: 16 }} />
            </a>
          </div>
        </section>

        {/* VENTURES GRID SECTION */}
        <section id="ventures" style={{ maxWidth: 1140, margin: '0 auto', padding: '1.5rem 1.25rem 5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>Paramara Studio Core Operations</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>E-commerce operations, cultural edu-tech, and international media hubs.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* PILLAR 1: SHOPEE LIVE & VIDEO */}
            <div className="glass-card" id="shopee" style={{ padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid var(--primary)' }}>
              <div>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(8, 47, 38, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--primary)' }}>
                  <Video style={{ width: 24, height: 24 }} />
                </div>
                <span className="brand-badge" style={{ marginBottom: 8 }}>E-Commerce Operations</span>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Shopee Live & Video Management</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Professional operational management for e-commerce live streaming broadcasting, video content production & optimization, and GMV conversion analytics.
                </p>
                
                <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                  <strong>⭐ Key Capabilities & Focus:</strong><br/>
                  <span style={{ color: 'var(--secondary-emerald)', fontWeight: 700 }}>• Live Studio Equipment & Technical Broadcasting</span><br/>
                  <span>• Shopee Video Content Production & Editing</span><br/>
                  <span>• GMV Sales Analytics & Conversion Optimization</span>
                </div>
              </div>
            </div>

            {/* PILLAR 2: LESTARI EDU-TECH */}
            <div className="glass-card" id="lestari" style={{ padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid var(--secondary-emerald)' }}>
              <div>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(5, 150, 105, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--secondary-emerald)' }}>
                  <Leaf style={{ width: 24, height: 24 }} />
                </div>
                <span className="brand-badge" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', borderColor: 'rgba(5, 150, 105, 0.3)', marginBottom: 8 }}>
                  Indonesian Cultural Edu-Tech
                </span>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Lestari Traditional Dance</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  <strong>Lestari</strong> is an educational platform for learning traditional Indonesian dance, connecting structured curricula with expert instructor feedback.
                </p>

                <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                  <strong>💃 Features & Platform:</strong><br/>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>• Structured Nusantara Dance Curricula</span><br/>
                  <span>• Expert Instructor Guidance & Feedback</span><br/>
                  <span>• Live Web Application: <strong>lestari-app.vercel.app</strong></span>
                </div>
              </div>

              <a href="https://lestari-app.vercel.app/" target="_blank" rel="noreferrer" className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }}>
                Visit Lestari Platform <ExternalLink style={{ width: 16, height: 16 }} />
              </a>
            </div>

            {/* PILLAR 3: I JUST FOUND THIS! */}
            <div className="glass-card" id="ijustfound" style={{ padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid var(--accent-gold)' }}>
              <div>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(184, 142, 57, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-gold)' }}>
                  <Compass style={{ width: 24, height: 24 }} />
                </div>
                <span className="brand-badge" style={{ marginBottom: 8 }}>US Market & Media Hub</span>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>I Just Found This! (US Market)</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  A curated product discovery and affiliate media hub targeted specifically at the United States consumer market via Pinterest and digital channels.
                </p>

                <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                  <strong>Channel Focus & Profile:</strong><br/>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>• Account: @productijustfound (Amazon Finds)</span><br/>
                  <span>• Content: Home Essentials, Travel Gear & Gift Guides</span><br/>
                  <span>• Target Audience: United States Consumer Market</span>
                </div>
              </div>

              <a 
                href="https://uk.pinterest.com/productijustfound/" 
                target="_blank" 
                rel="noreferrer" 
                className="btn" 
                style={{ 
                  width: '100%', 
                  justify: 'center', 
                  color: 'var(--accent-gold)', 
                  background: 'rgba(184, 142, 57, 0.08)', 
                  border: '1px solid var(--accent-gold-border)',
                  padding: '10px 14px',
                  fontSize: '0.875rem',
                  fontWeight: 700
                }}
              >
                Pinterest @productijustfound <ExternalLink style={{ width: 15, height: 15, flexShrink: 0, marginLeft: 4 }} />
              </a>
            </div>

          </div>
        </section>

        {/* PUBLIC FOOTER */}
        <footer style={{ background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border-color)', padding: '2rem 1.25rem', textAlign: 'center' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/assets/logo.png" alt="Paramara Studio" style={{ width: 30, height: 30, borderRadius: 8 }} onError={(e) => { e.target.src = '/logo.png'; }} />
              <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>Paramara Studio</strong>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              © 2026 <strong>Paramara Studio</strong>. All rights reserved. Operating Digital Commerce & Media Ecosystem.
            </p>
          </div>
        </footer>

      </div>
    );
  }

  // =========================================================================
  // VIEW MODE 2: PRIVATE ADMIN PORTAL (URL: /admin)
  // =========================================================================

  // If visiting /admin but not authenticated, render Admin Login Page!
  if (!isAuthenticated) {
    return (
      <div style={{ background: 'var(--bg-main)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem' }}>
        <div className="glass-card" style={{ maxWidth: 420, width: '100%', padding: '2rem 1.5rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <img src="/assets/logo.png" alt="Paramara Studio" style={{ width: 52, height: 52, borderRadius: 14, border: '2px solid var(--accent-gold)', marginBottom: '0.75rem', objectFit: 'cover' }} onError={(e) => { e.target.src = '/logo.png'; }} />
            <h2 style={{ fontSize: '1.3rem', color: 'var(--primary)', fontWeight: 800 }}>Paramara Studio</h2>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.04em' }}>AUTHORIZED ADMIN PORTAL</span>
          </div>

          <form onSubmit={handleLoginSubmit}>
            {loginError && (
              <div style={{ background: 'rgba(211, 47, 47, 0.08)', color: '#D32F2F', padding: '10px 14px', borderRadius: 10, fontSize: '0.825rem', marginBottom: '1.25rem', border: '1px solid rgba(211, 47, 47, 0.2)', fontWeight: 600 }}>
                {loginError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username Admin</label>
              <input type="text" className="form-input" placeholder="Masukkan Username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? "text" : "password"} className="form-input" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                <button type="button" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginBottom: '1rem' }}>
              <Lock style={{ width: 16, height: 16 }} /> Masuk ke Admin Portal
            </button>

            <button type="button" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} onClick={() => setViewMode('public')}>
              <Globe style={{ width: 15, height: 15 }} /> Kembali ke Homepage
            </button>
          </form>

        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="admin-layout">
      
      {/* Mobile Backdrop */}
      <div 
        className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`} 
        onClick={() => setSidebarOpen(false)} 
      />

      {/* Vertical Sidebar with Collapse Toggle */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Collapse/Expand Toggle Button */}
        <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? "Tampilkan Sidebar" : "Sembunyikan Sidebar"}>
          {sidebarCollapsed ? <ChevronRight style={{ width: 14, height: 14 }} /> : <ChevronLeft style={{ width: 14, height: 14 }} />}
        </button>

        <div>
          <div className="sidebar-header">
            <div className="brand-wrapper">
              <img className="brand-logo-img" src="/assets/logo.png" alt="Paramara Studio Logo" onError={(e) => { e.target.src = '/logo.png'; }} />
              <div>
                <h1 className="brand-title" style={{ fontSize: '1.25rem' }}>Paramara Studio</h1>
              </div>
            </div>
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>Welcome back, Malikh</div>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.03em', marginTop: 2 }}>SUPER ADMIN • PARAMARA STUDIO</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button className={`tab-btn ${activeTab === 'tabAnalytics' ? 'active' : ''}`} onClick={() => { setActiveTab('tabAnalytics'); setSidebarOpen(false); }}>
              <LayoutDashboard /> Executive Dashboard
            </button>
            <button className={`tab-btn ${activeTab === 'tabFinIntel' ? 'active' : ''}`} onClick={() => { setActiveTab('tabFinIntel'); setSidebarOpen(false); }}>
              <Activity /> Financial Intelligence
            </button>
            <button className={`tab-btn ${activeTab === 'tabShopeeTracker' ? 'active' : ''}`} onClick={() => { setActiveTab('tabShopeeTracker'); setSidebarOpen(false); }}>
              <Video /> Shopee Live Tracker
            </button>
            <button className={`tab-btn ${activeTab === 'tabShopeeVideo' ? 'active' : ''}`} onClick={() => { setActiveTab('tabShopeeVideo'); setSidebarOpen(false); }}>
              <Film /> Shopee Video Tracker
            </button>
            <button className={`tab-btn ${activeTab === 'tabFinance' ? 'active' : ''}`} onClick={() => { setActiveTab('tabFinance'); setSidebarOpen(false); }}>
              <DollarSign /> Keuangan
            </button>
            <button className={`tab-btn ${activeTab === 'tabPinterest' ? 'active' : ''}`} onClick={() => { setActiveTab('tabPinterest'); setSidebarOpen(false); }}>
              <Compass /> Pinterest Analytics (US)
            </button>
            <button className={`tab-btn ${activeTab === 'tabProjects' ? 'active' : ''}`} onClick={() => { setActiveTab('tabProjects'); setSidebarOpen(false); }}>
              <Briefcase /> Proyek & Klien Studio
            </button>
            <button className={`tab-btn ${activeTab === 'tabSchedules' ? 'active' : ''}`} onClick={() => { setActiveTab('tabSchedules'); setSidebarOpen(false); }}>
              <Calendar /> Jadwal Live & Host
            </button>
            <button className={`tab-btn ${activeTab === 'tabAdminUsers' ? 'active' : ''}`} onClick={() => { setActiveTab('tabAdminUsers'); setSidebarOpen(false); }}>
              <UserCheck /> Manajemen Admin
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 6 }} onClick={() => setViewMode('public')}>
            <Globe style={{ width: 14, height: 14 }} /> Lihat Homepage Publik
          </button>
          <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: '#D32F2F', marginBottom: 6 }} onClick={handleLogout}>
            <LogOut style={{ width: 14, height: 14 }} /> Keluar / Logout
          </button>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: 8 }}>
            Build: v2.7.0
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={sidebarCollapsed ? { marginLeft: 0, width: '100%' } : {}}>
        
        {/* Top Header */}
        <div className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {sidebarCollapsed && (
              <button className="mobile-nav-toggle" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSidebarCollapsed(false)}>
                <PanelLeftClose />
              </button>
            )}
            <button className="mobile-nav-toggle" onClick={() => setSidebarOpen(true)}>
              <Menu />
            </button>
            <div className="header-title">
              <h2>
                {activeTab === 'tabAnalytics' && "Paramara Executive Intelligence"}
                {activeTab === 'tabFinIntel' && "Financial Intelligence"}
                {activeTab === 'tabShopeeTracker' && "Shopee Live Tracker"}
                {activeTab === 'tabShopeeVideo' && "Shopee Video Tracker"}
                {activeTab === 'tabFinance' && "Keuangan & Transaksi Studio"}
                {activeTab === 'tabPinterest' && "Pinterest Analytics (US)"}
                {activeTab === 'tabProjects' && "Proyek & Klien Studio"}
                {activeTab === 'tabSchedules' && "Jadwal Live & Host"}
                {activeTab === 'tabAdminUsers' && "Manajemen Admin"}
              </h2>
              <p>
                {activeTab === 'tabFinIntel' ? "CFO View — Profitability, Cash Flow, Investment & Business Decisions" : "Real-Time Operations, Financial Matrix & Omnichannel Growth Hub"}
              </p>
            </div>
          </div>

          <div className="header-actions">
            {/* Cloud Sync Status Indicator */}
            <div 
              className="sync-pill" 
              onClick={() => setModalType('sync_info')}
              title="Klik untuk petunjuk memindahkan data ke HP/Device baru"
              style={{
                background: cloudSyncStatus === 'synced' ? 'rgba(5, 150, 105, 0.1)' : cloudSyncStatus === 'syncing' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                color: cloudSyncStatus === 'synced' ? '#059669' : cloudSyncStatus === 'syncing' ? '#b45309' : '#6b7280',
                borderColor: cloudSyncStatus === 'synced' ? 'rgba(5,150,105,0.25)' : cloudSyncStatus === 'syncing' ? 'rgba(234,179,8,0.25)' : 'rgba(156,163,175,0.2)',
                cursor: 'pointer'
              }}
            >
              {cloudSyncStatus === 'synced' && <><Cloud style={{ width: 12, height: 12 }} /> Synced</>}
              {cloudSyncStatus === 'syncing' && <><Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> Syncing...</>}
              {cloudSyncStatus === 'offline' && <><CloudOff style={{ width: 12, height: 12 }} /> Offline</>}
              {cloudSyncStatus === 'idle' && <><Cloud style={{ width: 12, height: 12 }} /> ...</>}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 10,
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                color: 'var(--text-muted)', cursor: 'pointer', transition: 'var(--transition)',
                flexShrink: 0
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = theme === 'dark' ? '#09110F' : '#fff'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              {theme === 'light' ? <Moon style={{ width: 15, height: 15 }} /> : <Sun style={{ width: 15, height: 15 }} />}
            </button>

            {/* CONTEXTUAL ACTION BUTTONS */}
            {activeTab === 'tabFinance' && (
              <>
                <button className="btn btn-secondary btn-sm" style={{ gap: 6, display: 'inline-flex', alignItems: 'center' }} onClick={handleExportFinanceToExcel}>
                  <FileText style={{ width: 14, height: 14, color: '#059669' }} />
                  <span className="btn-label">Ekspor Excel</span>
                </button>
                <button className="btn btn-primary" onClick={() => { setItemName(""); setItemCategory(""); setItemAmount(""); setItemDate(""); setOpexFrequency("Once"); setFinancialType("capex"); setModalType('finance'); }}>
                  <PlusCircle style={{ width: 15, height: 15 }} />
                  <span className="btn-label">Tambah Transaksi</span>
                </button>
              </>
            )}

            {activeTab === 'tabPinterest' && (
              <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
                <PlusCircle style={{ width: 15, height: 15 }} />
                <span className="btn-label">Upload CSV Pinterest</span>
                <input type="file" accept=".csv, .txt" onChange={handlePinterestCsvUpload} style={{ display: 'none' }} />
              </label>
            )}

            {activeTab === 'tabProjects' && (
              <button className="btn btn-primary" onClick={() => setModalType('project')}>
                <PlusCircle style={{ width: 15, height: 15 }} />
                <span className="btn-label">Input Proyek</span>
              </button>
            )}

            {activeTab === 'tabSchedules' && (
              <button className="btn btn-primary" onClick={() => setModalType('schedule')}>
                <PlusCircle style={{ width: 15, height: 15 }} />
                <span className="btn-label">Input Jadwal</span>
              </button>
            )}

            {activeTab === 'tabAdminUsers' && (
              <button className="btn btn-primary" onClick={() => setModalType('addAdmin')}>
                <UserPlus style={{ width: 15, height: 15 }} />
                <span className="btn-label">Tambah Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* ====== TIMEFRAME FILTER BAR ====== */}
        <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 2.5rem', background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginRight: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>FILTER:</span>
          {[
            { key: 'all', label: 'Semua' },
            { key: 'today', label: 'Hari Ini' },
            { key: '7d', label: '7 Hari' },
            { key: '30d', label: '30 Hari' },
            { key: 'thisMonth', label: 'Bulan Ini' },
            { key: 'custom', label: 'Custom' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setDateFilterPreset(opt.key)}
              style={{
                padding: '5px 14px',
                fontSize: '0.75rem',
                fontWeight: dateFilterPreset === opt.key ? 700 : 500,
                borderRadius: 20,
                border: `1.5px solid ${dateFilterPreset === opt.key ? 'var(--primary)' : 'var(--border-color)'}`,
                background: dateFilterPreset === opt.key ? 'var(--primary)' : 'var(--bg-input)',
                color: dateFilterPreset === opt.key ? (theme === 'dark' ? '#09110F' : 'white') : 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {opt.label}
            </button>
          ))}

          {dateFilterPreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
              <input
                type="date"
                value={customDateStart}
                onChange={e => setCustomDateStart(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>—</span>
              <input
                type="date"
                value={customDateEnd}
                onChange={e => setCustomDateEnd(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
              />
            </div>
          )}

          {dateFilterPreset !== 'all' && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: 'auto', fontStyle: 'italic' }}>
              Menampilkan {sessions.length} live, {videoSessions.length} video, {capexList.length + opexList.length} transaksi
            </span>
          )}
        </div>

        {/* Tab 1: Executive Dashboard */}
        {activeTab === 'tabAnalytics' && (
          <div className="tab-content main-inner">

            {/* AI EXECUTIVE INSIGHT (360° STUDIO DASHBOARD OVERVIEW — 24-HOUR CACHED) */}
            <div className="glass-card ai-summary-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: 8 }}>
                <div className="ai-badge" style={{ margin: 0 }}>
                  <Sparkles style={{ width: 14, height: 14 }} /> AI Executive Intelligence Summary
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', background: 'var(--bg-input)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border-color)' }}>
                    ⏱️ Di-update Otomatis 24 Jam Sekali (Hemat Kredit AI)
                  </span>
                </div>
              </div>

              <div className="ai-summary-text" style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <strong style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <TrendingUp style={{ width: 14, height: 14 }} /> Performansi Keuangan Studio
                    </strong>
                    <span>
                      Studio mencatatkan Pendapatan Kotor <strong>Rp {totalStudioGrossRevenue.toLocaleString('id-ID')}</strong> dengan Total Pengeluaran Operasional <strong>Rp {totalExpenses.toLocaleString('id-ID')}</strong> (CAPEX Rp {totalCapex.toLocaleString('id-ID')}, OPEX Rp {totalOpex.toLocaleString('id-ID')}). Hasil Laba Bersih berada pada posisi <strong style={{ color: netProfit >= 0 ? '#059669' : '#D32F2F' }}>{netProfit >= 0 ? "Surplus 📈" : "Defisit 📉"} Rp {netProfit.toLocaleString('id-ID')}</strong> (Margin {netProfitMarginPercent.toFixed(1)}%).
                    </span>
                  </div>

                  <div>
                    <strong style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Briefcase style={{ width: 14, height: 14 }} /> Omnichannel & Kas Sisa
                    </strong>
                    <span>
                      Total E-Commerce GMV terkumpul <strong>Rp {totalCombinedGMV.toLocaleString('id-ID')}</strong> dari {sessions.length} Sesi Shopee Live dan {videoSessions.length} Shopee Video. Sisa Kas Bersih setelah Pembelian Pribadi berada di angka <strong style={{ color: netProfitAfterPersonal >= 0 ? '#8B5CF6' : '#D32F2F' }}>Rp {netProfitAfterPersonal.toLocaleString('id-ID')}</strong>.
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', color: 'var(--text-main)', fontSize: '0.825rem' }}>
                  <strong>💡 Rekomendasi Eksekutif AI:</strong>{' '}
                  {netProfit >= 0 ? (
                    <span>Performansi keuangan studio dalam posisi surplus yang baik. Disarankan untuk menambah alokasi budget pada video berkonversi tinggi dan mempertahankan host utama pada jam puncak.</span>
                  ) : (
                    <span>Pengeluaran operasional studio saat ini melampaui omset komisi. Disarankan meninjau efisiensi biaya OPEX rutin dan memprioritaskan promosi produk komisi tinggi.</span>
                  )}
                </div>
              </div>
            </div>

            {/* 4 Premium Executive KPI Cards */}
            <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="glass-card kpi-card" style={{ '--kpi-accent': netProfit >= 0 ? '#059669' : '#D32F2F' }}>
                <div className="kpi-icon" style={{ '--kpi-accent': netProfit >= 0 ? '#059669' : '#D32F2F', background: netProfit >= 0 ? 'rgba(5,150,105,0.1)' : 'rgba(211,47,47,0.1)', color: netProfit >= 0 ? '#059669' : '#D32F2F' }}>
                  <TrendingUp style={{ width: 16, height: 16 }} />
                </div>
                <div className="kpi-title">Laba Bersih (Net Profit)</div>
                <div className="kpi-value" style={{ color: netProfit >= 0 ? '#059669' : '#D32F2F' }}>
                  Rp {netProfit.toLocaleString('id-ID')}
                </div>
                <div className="kpi-subtext">Margin Bersih: {netProfitMarginPercent.toFixed(1)}%</div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': 'var(--secondary-emerald)' }}>
                <div className="kpi-icon" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                  <DollarSign style={{ width: 16, height: 16 }} />
                </div>
                <div className="kpi-title">Pendapatan Kotor Studio</div>
                <div className="kpi-value text-success">
                  Rp {totalStudioGrossRevenue.toLocaleString('id-ID')}
                </div>
                <div className="kpi-subtext">Komisi Live/Video + Proyek</div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': '#B88E39' }}>
                <div className="kpi-icon" style={{ background: 'rgba(184,142,57,0.1)', color: '#B88E39' }}>
                  <PieChart style={{ width: 16, height: 16 }} />
                </div>
                <div className="kpi-title">Total Pengeluaran</div>
                <div className="kpi-value text-warning">
                  Rp {totalExpenses.toLocaleString('id-ID')}
                </div>
                <div className="kpi-subtext">CAPEX: Rp {totalCapex.toLocaleString('id-ID')} | OPEX: Rp {totalOpex.toLocaleString('id-ID')}</div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': 'var(--primary)' }}>
                <div className="kpi-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                  <Briefcase style={{ width: 16, height: 16 }} />
                </div>
                <div className="kpi-title">Total E-Commerce GMV</div>
                <div className="kpi-value">
                  Rp {totalCombinedGMV.toLocaleString('id-ID')}
                </div>
                <div className="kpi-subtext">Volume Penjualan Live + Video</div>
              </div>
            </div>



            {/* Split Grid for Details */}
            <div className="dashboard-grid">
              
              {/* Shopee Live Trends List */}
              <div className="glass-card chart-card">
                <div className="chart-header">
                  <h3><Video style={{ color: 'var(--primary)', width: 16, height: 16 }} /> Sesi Shopee Live Terbaru</h3>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>Internal Live Analytics</span>
                </div>
                <div className="chart-container" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 280, overflowY: 'auto' }}>
                  {sessions.length > 0 ? (
                    sessions.slice(0, 5).map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem' }}>{s.title}</strong>
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: 2 }}>
                            ⏱️ {s.duration} | 💵 Komisi: <strong className="text-warning">Rp {(s.grossCommission || 0).toLocaleString('id-ID')}</strong>
                          </div>
                        </div>
                        <span className="text-success" style={{ fontWeight: 800 }}>Rp {(s.revenue || 0).toLocaleString('id-ID')}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      Belum ada sesi live terekam.
                    </div>
                  )}
                </div>
              </div>

              {/* Shopee Video Trends List */}
              <div className="glass-card chart-card">
                <div className="chart-header">
                  <h3><Film style={{ color: 'var(--primary)', width: 16, height: 16 }} /> Performa Shopee Video Terbaru</h3>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>Video Analytics</span>
                </div>
                <div className="chart-container" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 280, overflowY: 'auto' }}>
                  {videoSessions.length > 0 ? (
                    videoSessions.slice(0, 5).map(v => (
                      <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem' }}>{v.title}</strong>
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: 2 }}>
                            📈 {v.productsSold} Produk Terjual | 💵 Komisi: <strong className="text-warning">Rp {(v.grossCommission || 0).toLocaleString('id-ID')}</strong>
                          </div>
                        </div>
                        <span className="text-success" style={{ fontWeight: 800 }}>Rp {(v.revenue || 0).toLocaleString('id-ID')}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      Belum ada data performa video terekam.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Shopee Live Tracker */}
        {/* Tab 1b: Financial Intelligence (CFO View) */}
        {activeTab === 'tabFinIntel' && (() => {
          // CFO Calculations
          const opProfit = totalStudioGrossRevenue - totalOpex;
          const opMargin = totalStudioGrossRevenue > 0 ? (opProfit / totalStudioGrossRevenue) * 100 : 0;
          const cashFlowAfterInv = opProfit - totalCapex;
          const cashFlowAfterOwner = cashFlowAfterInv - totalPersonal;
          const reinvestmentRate = totalStudioGrossRevenue > 0 ? (totalCapex / totalStudioGrossRevenue) * 100 : 0;
          
          const livePct = totalStudioGrossRevenue > 0 ? (totalGrossCommission / totalStudioGrossRevenue) * 100 : 0;
          const videoPct = totalStudioGrossRevenue > 0 ? (totalGrossVideoCommission / totalStudioGrossRevenue) * 100 : 0;
          const projectPct = totalStudioGrossRevenue > 0 ? (totalProjectRev / totalStudioGrossRevenue) * 100 : 0;
          const otherPct = totalStudioGrossRevenue > 0 ? (totalOtherIncome / totalStudioGrossRevenue) * 100 : 0;

          // AI Cache Check (48h Cooldown)
          const aiData = studioData.finIntelAiInsight || {};
          const now = new Date();
          const hasValidAiInsight = aiData.insightText && new Date(aiData.nextEligibleGenerationTime) > now;
          
          let hoursAgoText = null;
          let hoursUntilRefreshText = null;
          if (aiData.generatedAt) {
            const nextTime = new Date(aiData.nextEligibleGenerationTime);
            const diffMs = nextTime - now;
            const hoursLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
            hoursUntilRefreshText = `AI refresh available in ${hoursLeft}h`;
            hoursAgoText = `AI analysis updated ${aiData.generatedAt}`;
          }

          // Smart Rule-Based Insights
          let ruleInsight = {
            summary: opProfit >= 0 && cashFlowAfterInv < 0
              ? "Operations are currently profitable, but cash flow is negative because studio investment (CAPEX) is higher than operating profit."
              : opProfit < 0
              ? "Operating expenses currently exceed gross revenue. Focus on operating break-even before expansion."
              : "Business operations and cash flow are healthy and positive.",
            goingWell: livePct > 50
              ? `Operating profit is positive (${opMargin.toFixed(1)}% margin) and Live Commerce is the primary revenue engine.`
              : "Revenue streams are diversified across multiple channels.",
            biggestRisk: cashFlowAfterInv < 0
              ? "CAPEX is currently larger than operating profit, placing short-term pressure on cash."
              : totalOpex > totalStudioGrossRevenue
              ? "Recurring OPEX is higher than gross revenue."
              : "Single platform concentration risk if affiliate fees fluctuate.",
            nextDecision: cashFlowAfterInv < 0
              ? "Prioritize revenue-generating CAPEX and delay non-essential discretionary purchases until cash inflows become more predictable."
              : "Maintain momentum and consider scaling high-performing live sessions or client acquisition.",
            metricToWatch: cashFlowAfterInv < 0 ? "Cash Flow After Investment" : "Operating Profit Margin"
          };

          return (
            <div className="tab-content main-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 2.5rem 4rem' }}>
              
              {/* 1. PRIMARY KPI SECTION (EXACTLY 4 CARDS) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                
                {/* CARD 1: Gross Revenue */}
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Gross Revenue
                    </span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: 8 }}>
                    Rp {totalStudioGrossRevenue.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                    Live + Video + Project + Other
                  </div>
                </div>

                {/* CARD 2: Operating Profit (Green Positive) */}
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Operating Profit
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: opProfit >= 0 ? '#059669' : '#D32F2F', background: opProfit >= 0 ? 'rgba(5,150,105,0.1)' : 'rgba(211,47,47,0.1)', padding: '2px 8px', borderRadius: 10 }}>
                      Margin {opMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: opProfit >= 0 ? '#059669' : '#D32F2F', letterSpacing: '-0.03em', marginBottom: 8 }}>
                    Rp {opProfit.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                    Revenue − OPEX
                  </div>
                </div>

                {/* CARD 3: Studio Investment (Paramara Muted Gold) */}
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Studio Investment
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#B88E39', background: 'rgba(184,142,57,0.1)', padding: '2px 8px', borderRadius: 10 }}>
                      Reinvestment {reinvestmentRate.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#B88E39', letterSpacing: '-0.03em', marginBottom: 8 }}>
                    Rp {totalCapex.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                    CAPEX (Assets & Hardware)
                  </div>
                </div>

                {/* CARD 4: Cash Flow After Investment (Red if Negative) */}
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Cash Flow After Inv.
                    </span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cashFlowAfterInv >= 0 ? '#059669' : '#D32F2F' }} />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: cashFlowAfterInv >= 0 ? '#059669' : '#D32F2F', letterSpacing: '-0.03em', marginBottom: 8 }}>
                    Rp {cashFlowAfterInv.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                    Operating Profit − CAPEX
                  </div>
                </div>

              </div>

              {/* 2. MAIN SECTION: FINANCIAL FLOW & AI CFO BRIEF */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.75rem', marginBottom: '2rem' }}>
                
                {/* FINANCIAL FLOW - CLEAN & UNCLUTTERED */}
                <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 18, border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                      Financial Flow
                    </h3>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', fontWeight: 600 }}>Management Accounting</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.875rem' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>GROSS REVENUE</span>
                      <strong style={{ fontWeight: 700, color: 'var(--text-main)' }}>Rp {totalStudioGrossRevenue.toLocaleString('id-ID')}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>− OPEX (Operating Expenses)</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Rp {totalOpex.toLocaleString('id-ID')}</span>
                    </div>

                    <div style={{ height: 1, background: 'var(--border-color)', margin: '2px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(5, 150, 105, 0.06)', borderRadius: 10 }}>
                      <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.825rem' }}>= OPERATING PROFIT</span>
                      <strong style={{ fontWeight: 800, color: opProfit >= 0 ? '#059669' : '#D32F2F', fontSize: '1rem' }}>Rp {opProfit.toLocaleString('id-ID')}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>− CAPEX (Studio Investment)</span>
                      <span style={{ fontWeight: 600, color: '#B88E39' }}>Rp {totalCapex.toLocaleString('id-ID')}</span>
                    </div>

                    <div style={{ height: 1, background: 'var(--border-color)', margin: '2px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: cashFlowAfterInv >= 0 ? 'rgba(5, 150, 105, 0.06)' : 'rgba(211, 47, 47, 0.06)', borderRadius: 10 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.825rem' }}>= CASH FLOW AFTER INVESTMENT</span>
                      <strong style={{ fontWeight: 800, color: cashFlowAfterInv >= 0 ? '#059669' : '#D32F2F', fontSize: '1rem' }}>Rp {cashFlowAfterInv.toLocaleString('id-ID')}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>− OWNER WITHDRAWALS (Personal)</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Rp {totalPersonal.toLocaleString('id-ID')}</span>
                    </div>

                    <div style={{ height: 2, background: 'var(--text-main)', margin: '4px 0 2px' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        NET CASH FLOW AFTER OWNER WITHDRAWAL
                      </span>
                      <strong style={{ fontWeight: 900, color: cashFlowAfterOwner >= 0 ? '#059669' : '#D32F2F', fontSize: '1.1rem' }}>
                        Rp {cashFlowAfterOwner.toLocaleString('id-ID')}
                      </strong>
                    </div>

                  </div>
                </div>

                {/* AI CFO BRIEF - SINGLE ELEGANT PANEL */}
                <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 18, border: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                          AI CFO Brief
                        </h3>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Decision Support
                        </span>
                      </div>
                      {hoursUntilRefreshText && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                          {hoursUntilRefreshText}
                        </span>
                      )}
                    </div>

                    {/* TYPOGRAPHY HIERARCHY CONTENT */}
                    <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
                      <div style={{ marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px dashed var(--border-color)' }}>
                        <div style={{ fontSize: '0.675rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                          EXECUTIVE SUMMARY
                        </div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                          "{ruleInsight.summary}"
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                        <div>
                          <div style={{ fontSize: '0.675rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                            WHAT'S GOING WELL
                          </div>
                          <div style={{ color: 'var(--text-main)', fontSize: '0.825rem' }}>
                            {ruleInsight.goingWell}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.675rem', fontWeight: 800, color: '#D32F2F', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                            BIGGEST RISK
                          </div>
                          <div style={{ color: 'var(--text-main)', fontSize: '0.825rem' }}>
                            {ruleInsight.biggestRisk}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.675rem', fontWeight: 800, color: '#B88E39', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                            NEXT FOUNDER DECISION
                          </div>
                          <div style={{ color: 'var(--text-main)', fontSize: '0.825rem', fontWeight: 600 }}>
                            {ruleInsight.nextDecision}
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>METRIC TO WATCH:</span>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 800 }}>{ruleInsight.metricToWatch}</strong>
                      </div>

                    </div>
                  </div>

                  {/* BOTTOM ACTION BUTTON */}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      {hoursAgoText || "Rule-based analysis active"}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleGenerateFinIntelAI(totalStudioGrossRevenue, totalOpex, totalCapex, opProfit, opMargin, cashFlowAfterInv, totalPersonal, totalCombinedGMV, reinvestmentRate)}
                      disabled={hasValidAiInsight}
                      style={{ fontSize: '0.75rem', fontWeight: 700, opacity: hasValidAiInsight ? 0.5 : 1, cursor: hasValidAiInsight ? 'not-allowed' : 'pointer' }}
                    >
                      {hasValidAiInsight ? 'AI Cached (48h)' : 'Refresh AI Analysis →'}
                    </button>
                  </div>

                </div>

              </div>

              {/* 3. LOWER SECTION: REVENUE MIX, CASH HEALTH & BREAK-EVEN */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                
                {/* REVENUE ENGINE MIX */}
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
                    Revenue Engine Mix
                  </h4>

                  {/* Stacked Horizontal Bar - Neutral Colors (No Red for Live) */}
                  <div style={{ display: 'flex', height: 14, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-input)', marginBottom: '1.25rem' }}>
                    <div style={{ width: `${livePct}%`, background: '#082F26' }} title="Live" />
                    <div style={{ width: `${videoPct}%`, background: '#B88E39' }} title="Video" />
                    <div style={{ width: `${projectPct}%`, background: '#2563EB' }} title="Project" />
                    <div style={{ width: `${otherPct}%`, background: '#6B7280' }} title="Other" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.75rem' }}>
                    <div style={{ padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#082F26' }} /> Live
                      </span>
                      <strong style={{ color: 'var(--text-main)' }}>{livePct.toFixed(1)}%</strong>
                    </div>

                    <div style={{ padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#B88E39' }} /> Video
                      </span>
                      <strong style={{ color: 'var(--text-main)' }}>{videoPct.toFixed(1)}%</strong>
                    </div>

                    <div style={{ padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} /> Project
                      </span>
                      <strong style={{ color: 'var(--text-main)' }}>{projectPct.toFixed(1)}%</strong>
                    </div>

                    <div style={{ padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6B7280' }} /> Other
                      </span>
                      <strong style={{ color: 'var(--text-main)' }}>{otherPct.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>

                {/* CASH HEALTH */}
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
                    Cash Health
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px dashed var(--border-color)' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Current Cash</span>
                      <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Requires actual cash balance</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px dashed var(--border-color)' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Monthly OPEX</span>
                      <strong style={{ color: 'var(--text-main)' }}>Rp {totalOpex.toLocaleString('id-ID')}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Cash Runway</span>
                      <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Requires actual cash balance</span>
                    </div>
                  </div>
                </div>

                {/* OPERATING BREAK-EVEN */}
                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
                    Operating Break-even
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Current Revenue</span>
                      <strong style={{ color: 'var(--text-main)' }}>Rp {totalStudioGrossRevenue.toLocaleString('id-ID')}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Operating Expenses</span>
                      <strong style={{ color: 'var(--text-main)' }}>Rp {totalOpex.toLocaleString('id-ID')}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Operating Break-even</span>
                      <span style={{
                        fontSize: '0.675rem', fontWeight: 800,
                        background: opProfit >= 0 ? 'rgba(5, 150, 105, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                        color: opProfit >= 0 ? '#059669' : '#D32F2F',
                        padding: '3px 10px', borderRadius: 12
                      }}>
                        {opProfit >= 0 ? 'ACHIEVED' : 'NOT ACHIEVED'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      <span>Operating Margin</span>
                      <strong style={{ color: opProfit >= 0 ? '#059669' : '#D32F2F' }}>{opMargin.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          );
        })()}
        {activeTab === 'tabShopeeTracker' && (
          <div className="tab-content main-inner">

            {/* ACTION BANNER (MOBILE & DESKTOP ACCESSIBLE) */}
            <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: 2 }}>Shopee Live Tracker</h3>
                <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{sessions.length} sesi live terekam</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleOpenManualLiveInput} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Edit3 style={{ width: 14, height: 14 }} /> Input Manual
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => { setFileSlot1(null); setFileSlot2(null); setPreviewUrl1(null); setPreviewUrl2(null); setScannedPreview(null); setModalType('scan'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ImagePlus style={{ width: 14, height: 14 }} /> Scan AI (2 Foto)
                </button>
              </div>
            </div>

            {/* EXPANDABLE EXECUTIVE SESSION CARDS OR CLEAN ZERO STATE */}
            {sessions.length > 0 ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {sessions.map(s => {
                    const isExpanded = expandedSessionId === s.id;
                    return (
                      <div key={s.id} className="glass-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid var(--primary)' }}>
                        
                        {/* CARD HEADER */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: 4 }}>{s.title}</h3>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              <span>🕒 Waktu: <strong>{s.dateFormatted || s.startTime}</strong></span>
                              <span>⏱️ Durasi: <strong>{s.duration}</strong></span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button 
                              className="btn btn-sm btn-secondary" 
                              onClick={() => setExpandedSessionId(isExpanded ? null : s.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              {isExpanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                              <span>{isExpanded ? 'Tutup Metrik' : 'Lihat Metrik & Produk'}</span>
                            </button>

                            <button className="btn btn-sm btn-secondary" style={{ color: 'var(--primary)' }} onClick={() => { setEditingSession({ ...s }); setModalType('editSession'); }}>
                              <Edit3 style={{ width: 14, height: 14 }} /> Edit Data
                            </button>

                            <button className="btn btn-sm btn-secondary" style={{ color: '#D32F2F' }} onClick={() => handleDeleteSession(s.id)}>
                              <Trash2 style={{ width: 14, height: 14 }} /> Hapus
                            </button>
                          </div>
                        </div>

                        {/* EXECUTIVE SUMMARY METRICS BAR */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Penjualan (GMV)</span>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>Rp {(s.revenue || 0).toLocaleString('id-ID')}</div>
                          </div>

                          <div style={{ background: 'rgba(184, 142, 57, 0.08)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--accent-gold-border)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>💵 Komisi Kotor</span>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>Rp {(s.grossCommission || 0).toLocaleString('id-ID')}</div>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pesanan</span>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--secondary-emerald)' }}>{s.totalOrders || 0} order</div>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Penonton Aktif</span>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{s.activeViewers || 0} orang</div>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Komentar</span>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{s.chatCount || 0} chat</div>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Keranjang</span>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{s.cartAdditions || 0} item</div>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CTR Klik</span>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                              <span style={{ background: 'var(--primary-glow)', padding: '2px 6px', borderRadius: 4 }}>{s.clickRatePercent || 0}% CTR</span>
                            </div>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Views</span>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{s.totalViews || 0} views</div>
                          </div>
                        </div>

                        {/* DETAILED EXPANDED INSIGHTS */}
                        {isExpanded && (
                          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                              <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: 8 }}>Interaksi & Traffic:</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                <div>Total Suka: <strong>{(s.likes ?? s.likeCount ?? 0).toLocaleString('id-ID')}</strong></div>
                                <div>Tingkat Konversi: <strong>{s.ordersPerClickPercent ?? s.conversionRatePercent ?? s.clickRatePercent ?? 0}%</strong></div>
                              </div>
                            </div>

                            {/* DETAILED PRODUCTS LIST */}
                            {s.products && s.products.length > 0 && (
                              <div>
                                <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                                  <Briefcase style={{ width: 14, height: 14 }} /> Detail Produk ({s.products.length} Item Terdeteksi):
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {s.products.map((p, pIdx) => (
                                    <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.8rem', flexWrap: 'wrap', gap: '8px' }}>
                                      <div style={{ flex: 1, minWidth: 200 }}>
                                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{p.name}</strong>
                                        {p.price > 0 && (
                                          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: 2 }}>
                                            Harga Katalog: Rp {p.price.toLocaleString('id-ID')}
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div>
                                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Penjualan (GMV)</span>
                                          <strong style={{ color: '#059669', fontSize: '0.85rem' }}>Rp {(p.revenue || 0).toLocaleString('id-ID')}</strong>
                                        </div>
                                        <div>
                                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Klik</span>
                                          <strong>{p.clicks || 0}</strong>
                                        </div>
                                        <div>
                                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Masuk Keranjang</span>
                                          <strong style={{ color: 'var(--primary)' }}>{p.cartAdds || 0} item</strong>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* TRAFFIC SOURCES */}
                            {s.trafficSources && s.trafficSources.length > 0 && (
                              <div>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: 8, fontWeight: 700 }}>Sumber Traffic Utama:</h4>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                  {s.trafficSources.map((t, tIdx) => (
                                    <div key={tIdx} style={{ background: 'var(--bg-input)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.775rem' }}>
                                      <span style={{ color: 'var(--text-dim)' }}>{t.name}: </span>
                                      <strong style={{ color: 'var(--primary)' }}>{t.percent}%</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {s.aiSummary && (
                              <div className="ai-summary-text" style={{ background: 'rgba(184, 142, 57, 0.06)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--accent-gold-border)', fontSize: '0.85rem' }}>
                                <Sparkles style={{ width: 14, height: 14, color: 'var(--accent-gold)', verticalAlign: 'middle', marginRight: 6 }} />
                                {s.aiSummary}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
                <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={handleExportLiveToExcel} 
                    style={{ 
                      background: 'rgba(5, 150, 105, 0.08)', 
                      border: '1px solid rgba(5, 150, 105, 0.25)', 
                      color: '#059669', 
                      fontSize: '0.775rem', 
                      fontWeight: 700,
                      padding: '8px 16px', 
                      borderRadius: 8, 
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(5, 150, 105, 0.08)'; e.currentTarget.style.color = '#059669'; }}
                  >
                    <FileText style={{ width: 14, height: 14 }} /> Ekspor Ringkasan Live (1 Baris / Sesi)
                  </button>

                  <button 
                    onClick={handleExportLiveProductsToExcel} 
                    style={{ 
                      background: 'var(--bg-input)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-main)', 
                      fontSize: '0.775rem', 
                      fontWeight: 600,
                      padding: '8px 16px', 
                      borderRadius: 8, 
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                  >
                    <Briefcase style={{ width: 14, height: 14 }} /> Ekspor Detail Produk (.csv)
                  </button>

                  <button 
                    onClick={() => setModalType('confirm_clear_live')} 
                    style={{ 
                      background: 'transparent', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-dim)', 
                      fontSize: '0.75rem', 
                      padding: '8px 14px', 
                      borderRadius: 8, 
                      cursor: 'pointer',
                      opacity: 0.6,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#D32F2F'; e.currentTarget.style.borderColor = 'rgba(211,47,47,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Trash2 style={{ width: 12, height: 12, display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }} /> Hapus Seluruh Data Sesi Live...
                  </button>
                </div>
              </>
            ) : (
              <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(8, 47, 38, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: 'var(--primary)' }}>
                  <Camera style={{ width: 32, height: 32 }} />
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 6 }}>Belum Ada Data Sesi Shopee Live</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>
                  Seluruh data sample sebelumnya telah dibersihkan. Gunakan tombol <strong>"Input Shopee Live (2 Foto)"</strong> di pojok kanan atas untuk mengekstrak laporan HP Anda.
                </p>
              </div>
            )}

          </div>
        )}

        {/* TAB MANAJEMEN ADMIN */}
        {activeTab === 'tabAdminUsers' && (
          <div className="tab-content main-inner">
            <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserCheck style={{ color: 'var(--primary)' }} /> Manajemen Akun Admin Paramara Studio</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Kelola hak akses pengguna internal admin portal (Tambah, Edit Profil Admin, & Hapus Akun Admin).</p>
              </div>
              <button className="btn btn-primary" onClick={() => setModalType('addAdmin')}>
                <UserPlus /> + Tambah Akun Admin
              </button>
            </div>

            <div className="table-wrapper glass-card">
              <table>
                <thead>
                  <tr>
                    <th>Username & Nama Lengkap</th>
                    <th>Peran / Role</th>
                    <th>Email Terdaftar</th>
                    <th>Status</th>
                    <th>Login Terakhir</th>
                    <th>Aksi Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map(usr => (
                    <tr key={usr.id}>
                      <td>
                        <strong>{usr.fullName}</strong>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>@{usr.username}</div>
                      </td>
                      <td>
                        <span className="brand-badge" style={{ background: usr.role === 'Super Admin' ? 'rgba(184, 142, 57, 0.1)' : 'rgba(8, 47, 38, 0.06)', color: usr.role === 'Super Admin' ? 'var(--accent-gold)' : 'var(--primary)' }}>
                          {usr.role}
                        </span>
                      </td>
                      <td>{usr.email}</td>
                      <td>
                        <span className="brand-badge" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                          {usr.status}
                        </span>
                      </td>
                      <td>{usr.lastLogin}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-sm btn-secondary" style={{ color: 'var(--primary)' }} onClick={() => { setEditingAdminUser(usr); setModalType('editAdmin'); }}>
                          <Edit3 style={{ width: 14, height: 14 }} /> Edit Profil
                        </button>

                        {usr.username !== 'abdumalikh' && (
                          <button className="btn btn-sm btn-secondary" style={{ color: '#D32F2F' }} onClick={() => {
                            if (confirm(`Hapus akun admin ${usr.username}?`)) {
                              setStudioData(prev => ({ ...prev, adminUsers: prev.adminUsers.filter(a => a.id !== usr.id) }));
                            }
                          }}>
                            <Trash2 style={{ width: 14, height: 14 }} /> Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* BACKUP & RESTORE DATA SECTION */}
            <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 800 }}>
                    <Cloud style={{ color: 'var(--primary)', width: 18, height: 18 }} /> Backup & Keamanan Sinkronisasi Data Studio
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    Seluruh data Anda otomatis tersinkronisasi dua arah secara real-time ke **Firebase Cloud Database** dan tersimpan di **Local Storage Browser** Anda secara aman. 
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: 'var(--bg-input)', padding: '1.25rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Unduh Cadangan Manual (Offline Backup)</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.5 }}>
                    Unduh seluruh basis data Paramara Studio (.json) langsung ke komputer Anda sebagai cadangan ekstra offline.
                  </p>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleExportBackupData}>
                    <Save style={{ width: 14, height: 14 }} /> Ekspor & Unduh Data (.json)
                  </button>
                </div>

                <div style={{ width: 1, background: 'var(--border-color)', alignSelf: 'stretch' }}></div>

                <div style={{ flex: 1, minWidth: 260 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pulihkan Data dari File Cadangan (Restore Backup)</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.5 }}>
                    Unggah file JSON cadangan yang telah Anda unduh sebelumnya untuk memulihkan seluruh data secara instan.
                  </p>
                  <label className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0 }}>
                    <Cloud style={{ width: 14, height: 14 }} />
                    <span>Pilih File & Impor Data (.json)</span>
                    <input type="file" accept=".json" onChange={handleImportBackupData} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2b: Shopee Video Tracker */}
        {activeTab === 'tabShopeeVideo' && (
          <div className="tab-content main-inner">

            {/* ACTION BANNER (MOBILE & DESKTOP ACCESSIBLE) */}
            <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: 2 }}>Shopee Video Tracker</h3>
                <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{videoSessions.length} performa video terekam</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleExportVideoToExcel} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <FileText style={{ width: 14, height: 14, color: '#059669' }} /> Ekspor Excel
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleOpenManualVideoInput} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Edit3 style={{ width: 14, height: 14 }} /> Input Manual
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => { setVideoFileSlot1(null); setVideoFileSlot2(null); setVideoPreviewUrl1(null); setVideoPreviewUrl2(null); setScannedVideoPreview(null); setModalType('scan_video'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Film style={{ width: 14, height: 14 }} /> Scan AI (2 Foto)
                </button>
              </div>
            </div>

            {/* EXPANDABLE VIDEO SESSION CARDS OR CLEAN ZERO STATE */}
            {videoSessions.length > 0 ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {videoSessions.map(v => {
                    const isExpanded = expandedVideoId === v.id;
                    return (
                      <div key={v.id} className="glass-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid var(--primary)' }}>
                        
                        {/* CARD HEADER */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: 4 }}>{v.title}</h3>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              <span>Analisis: <strong>{v.dateFormatted}</strong></span>
                              <span>Penonton: <strong>{(v.totalViews || 0).toLocaleString('id-ID')}</strong></span>
                              <span>Terjual: <strong>{v.productsSold || 0} unit</strong></span>
                              <span>GMV: <strong style={{ color: '#059669' }}>Rp {(v.revenue || 0).toLocaleString('id-ID')}</strong></span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => setExpandedVideoId(isExpanded ? null : v.id)}>
                              {isExpanded ? "Tutup Detail" : "Buka Detail"}
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={() => { setEditingVideoSession(v); setModalType('editVideoSession'); }}>
                              Edit
                            </button>
                            <button className="btn btn-sm btn-secondary" style={{ color: '#D32F2F' }} onClick={() => handleDeleteVideoSession(v.id)}>
                              Hapus
                            </button>
                          </div>
                        </div>

                        {/* EXPANDED DETAILS */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                              
                              {/* TAB PENONTON */}
                              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>Data Utama: Penonton</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: '0.8rem' }}>
                                  <div>Penonton: <strong>{(v.totalViews || 0).toLocaleString('id-ID')}</strong></div>
                                  <div>Suka (Likes): <strong>{(v.likes || 0).toLocaleString('id-ID')}</strong></div>
                                  <div>Komentar: <strong>{(v.commentsCount || 0).toLocaleString('id-ID')}</strong></div>
                                  <div>Dibagikan (Shares): <strong>{(v.shares || 0).toLocaleString('id-ID')}</strong></div>
                                  <div>Kunjungan Profil: <strong>{(v.profileVisits || 0).toLocaleString('id-ID')}</strong></div>
                                  <div>Pengikut Baru: <strong>{(v.newFollowers || 0).toLocaleString('id-ID')}</strong></div>
                                </div>
                              </div>

                              {/* TAB PENJUALAN */}
                              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>Data Utama: Penjualan</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: '0.8rem' }}>
                                  <div>Video dengan Produk: <strong>{v.videosWithProducts || 0}</strong></div>
                                  <div>Video Berpendapatan: <strong>{v.monetizedVideos || 0}</strong></div>
                                  <div>Produk Terjual: <strong>{v.productsSold || 0}</strong></div>
                                  <div>Pembeli: <strong>{v.buyers || 0}</strong></div>
                                  <div>Klik pada Produk: <strong>{v.productClicks || 0}</strong></div>
                                  <div>Pesanan: <strong>{v.totalOrders || 0}</strong></div>
                                  <div>Penjualan GMV: <strong style={{ color: '#059669' }}>Rp {(v.revenue || 0).toLocaleString('id-ID')}</strong></div>
                                  <div>Tingkat Konversi: <strong>{v.conversionRatePercent || 0}%</strong></div>
                                </div>
                              </div>

                            </div>

                            {/* AI SUMMARY INSIGHT */}
                            {v.aiSummary && (
                              <div style={{ background: 'var(--primary-glow)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.825rem', color: 'var(--primary)' }}>
                                <strong>Summary Insight:</strong> {v.aiSummary}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                  <button 
                    onClick={() => setModalType('confirm_clear_video')} 
                    style={{ 
                      background: 'transparent', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-dim)', 
                      fontSize: '0.75rem', 
                      padding: '6px 14px', 
                      borderRadius: 8, 
                      cursor: 'pointer',
                      opacity: 0.6,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#D32F2F'; e.currentTarget.style.borderColor = 'rgba(211,47,47,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Trash2 style={{ width: 12, height: 12, display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }} /> Hapus Seluruh Data Sesi Video...
                  </button>
                </div>
              </>
            ) : (
              <div className="glass-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--text-dim)' }}>
                  <Film style={{ width: 28, height: 28 }} />
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 6 }}>Belum Ada Data Shopee Video</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>
                  Seluruh data sample sebelumnya telah dibersihkan. Gunakan tombol <strong>"Input Shopee Video (2 Foto)"</strong> di pojok kanan atas untuk mengekstrak laporan HP Anda.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2c: Keuangan (CAPEX / OPEX) */}
        {activeTab === 'tabFinance' && (
          <div className="tab-content main-inner">
            
            {/* 1. EXECUTIVE FINANCIAL KPI HEADERS */}
            <div className="kpi-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="glass-card kpi-card" style={{ '--kpi-accent': 'var(--secondary-emerald)' }}>
                <div className="kpi-icon" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                  <ArrowUpRight style={{ width: 18, height: 18 }} />
                </div>
                <div className="kpi-title">Pendapatan Kotor Studio</div>
                <div className="kpi-value text-success">Rp {totalStudioGrossRevenue.toLocaleString('id-ID')}</div>
                <div className="kpi-subtext">Live (10%) + Video (10%) + Proyek</div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': '#B88E39' }}>
                <div className="kpi-icon" style={{ background: 'rgba(184,142,57,0.1)', color: '#B88E39' }}>
                  <ArrowDownRight style={{ width: 18, height: 18 }} />
                </div>
                <div className="kpi-title">Total Pengeluaran Studio</div>
                <div className="kpi-value text-warning">Rp {totalExpenses.toLocaleString('id-ID')}</div>
                <div className="kpi-subtext">CAPEX Rp {totalCapex.toLocaleString('id-ID')} | OPEX Rp {totalOpex.toLocaleString('id-ID')}</div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': netProfit >= 0 ? '#059669' : '#D32F2F' }}>
                <div className="kpi-icon" style={{ background: netProfit >= 0 ? 'rgba(5,150,105,0.1)' : 'rgba(211,47,47,0.1)', color: netProfit >= 0 ? '#059669' : '#D32F2F' }}>
                  <TrendingUp style={{ width: 18, height: 18 }} />
                </div>
                <div className="kpi-title">Laba Bersih (Net Profit)</div>
                <div className="kpi-value" style={{ color: netProfit >= 0 ? '#059669' : '#D32F2F' }}>
                  Rp {netProfit.toLocaleString('id-ID')}
                </div>
                <div className="kpi-subtext">
                  Margin: <strong>{netProfitMarginPercent.toFixed(1)}%</strong> {netProfit >= 0 ? "• SURPLUS 📈" : "• DEFISIT 📉"}
                </div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': netProfitAfterPersonal >= 0 ? '#8B5CF6' : '#D32F2F' }}>
                <div className="kpi-icon" style={{ background: netProfitAfterPersonal >= 0 ? 'rgba(139,92,246,0.1)' : 'rgba(211,47,47,0.1)', color: netProfitAfterPersonal >= 0 ? '#8B5CF6' : '#D32F2F' }}>
                  <ShoppingBag style={{ width: 18, height: 18 }} />
                </div>
                <div className="kpi-title">Laba Bersih After Personal</div>
                <div className="kpi-value" style={{ color: netProfitAfterPersonal >= 0 ? '#8B5CF6' : '#D32F2F' }}>
                  Rp {netProfitAfterPersonal.toLocaleString('id-ID')}
                </div>
                <div className="kpi-subtext">
                  Sisa Kas (Personal: <strong>Rp {totalPersonal.toLocaleString('id-ID')}</strong>)
                </div>
              </div>
            </div>

            {/* 2. EXECUTIVE FINANCIAL MATRIX (P&L BREAKDOWN CARDS) */}
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                    <Receipt style={{ width: 18, height: 18, color: 'var(--primary)' }} /> Ringkasan Laba Rugi & Arus Kas Studio
                  </h3>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: 2 }}>Breakdown real-time aliran pendapatan vs pengeluaran operasional</p>
                </div>
                <span className="brand-badge" style={{ padding: '4px 12px', fontSize: '0.725rem' }}>P&L Statement</span>
              </div>

              {/* DUAL FLOW GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                
                {/* REVENUE STREAMS COLUMN */}
                <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                    <h4 style={{ fontSize: '0.875rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <ArrowUpRight style={{ width: 16, height: 16 }} /> Sumber Pendapatan (Revenue Streams)
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Arus Masuk</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    
                    {/* Item 1 */}
                    <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>Komisi Shopee Live</span>
                        <strong style={{ color: '#059669' }}>Rp {totalGrossCommission.toLocaleString('id-ID')}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Dari GMV Rp {totalShopeeRev.toLocaleString('id-ID')}</span>
                        <span>{totalStudioGrossRevenue > 0 ? ((totalGrossCommission / totalStudioGrossRevenue) * 100).toFixed(0) : 0}% share</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: 'var(--border-color)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${totalStudioGrossRevenue > 0 ? Math.min(100, (totalGrossCommission / totalStudioGrossRevenue) * 100) : 0}%`, height: '100%', background: '#059669', borderRadius: 2 }} />
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>Komisi Shopee Video</span>
                        <strong style={{ color: '#059669' }}>Rp {totalGrossVideoCommission.toLocaleString('id-ID')}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Dari GMV Rp {totalVideoRev.toLocaleString('id-ID')}</span>
                        <span>{totalStudioGrossRevenue > 0 ? ((totalGrossVideoCommission / totalStudioGrossRevenue) * 100).toFixed(0) : 0}% share</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: 'var(--border-color)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${totalStudioGrossRevenue > 0 ? Math.min(100, (totalGrossVideoCommission / totalStudioGrossRevenue) * 100) : 0}%`, height: '100%', background: '#059669', borderRadius: 2 }} />
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>Kontrak Proyek & Klien</span>
                        <strong style={{ color: '#059669' }}>Rp {totalProjectRev.toLocaleString('id-ID')}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Nilai Kontrak Klien Aktif</span>
                        <span>{totalStudioGrossRevenue > 0 ? ((totalProjectRev / totalStudioGrossRevenue) * 100).toFixed(0) : 0}% share</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: 'var(--border-color)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${totalStudioGrossRevenue > 0 ? Math.min(100, (totalProjectRev / totalStudioGrossRevenue) * 100) : 0}%`, height: '100%', background: '#059669', borderRadius: 2 }} />
                      </div>
                    </div>

                    {/* Revenue Total Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed var(--border-color)', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Total Pendapatan Kotor</span>
                      <strong style={{ fontSize: '1rem', color: '#059669' }}>Rp {totalStudioGrossRevenue.toLocaleString('id-ID')}</strong>
                    </div>

                  </div>
                </div>

                {/* EXPENDITURES COLUMN */}
                <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                    <h4 style={{ fontSize: '0.875rem', color: '#B88E39', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <ArrowDownRight style={{ width: 16, height: 16 }} /> Struktur Pengeluaran (Expenditures)
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Arus Keluar</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    
                    {/* Item 1: CAPEX */}
                    <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>Belanja Modal (CAPEX)</span>
                        <strong style={{ color: '#B88E39' }}>Rp {totalCapex.toLocaleString('id-ID')}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Aset Fisik & Alat Studio</span>
                        <span>{totalExpenses > 0 ? ((totalCapex / totalExpenses) * 100).toFixed(0) : 0}% alokasi</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: 'var(--border-color)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${totalExpenses > 0 ? Math.min(100, (totalCapex / totalExpenses) * 100) : 0}%`, height: '100%', background: '#B88E39', borderRadius: 2 }} />
                      </div>
                    </div>

                    {/* Item 2: OPEX */}
                    <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>Operasional (OPEX)</span>
                        <strong style={{ color: '#D32F2F' }}>Rp {totalOpex.toLocaleString('id-ID')}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Gaji Host, Internet, Sewa, Listrik</span>
                        <span>{totalExpenses > 0 ? ((totalOpex / totalExpenses) * 100).toFixed(0) : 0}% alokasi</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: 'var(--border-color)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${totalExpenses > 0 ? Math.min(100, (totalOpex / totalExpenses) * 100) : 0}%`, height: '100%', background: '#D32F2F', borderRadius: 2 }} />
                      </div>
                    </div>

                    {/* Item 3: Personal Purchase */}
                    <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>Pembelian Pribadi (Personal Purchase)</span>
                        <strong style={{ color: '#8B5CF6' }}>Rp {totalPersonal.toLocaleString('id-ID')}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Belanja & Pengeluaran Personal</span>
                        <span>{totalCashOutflow > 0 ? ((totalPersonal / totalCashOutflow) * 100).toFixed(0) : 0}% alokasi</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: 'var(--border-color)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${totalCashOutflow > 0 ? Math.min(100, (totalPersonal / totalCashOutflow) * 100) : 0}%`, height: '100%', background: '#8B5CF6', borderRadius: 2 }} />
                      </div>
                    </div>

                    {/* Expense Total Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed var(--border-color)', fontSize: '0.85rem', marginTop: 12 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Total Pengeluaran Studio (Operasional)</span>
                      <strong style={{ fontSize: '1rem', color: '#D32F2F' }}>Rp {totalExpenses.toLocaleString('id-ID')}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-dim)', paddingTop: 4 }}>
                      <span>Total Kas Keluar (Studio + Personal):</span>
                      <strong style={{ color: 'var(--text-main)' }}>Rp {totalCashOutflow.toLocaleString('id-ID')}</strong>
                    </div>

                  </div>
                </div>

              </div>

              {/* NET PROFIT HIGHLIGHT BANNER */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem',
                padding: '1.25rem 1.5rem',
                borderRadius: 12,
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-color)'
              }}>
                {/* Metric 1: Operational Net Profit */}
                <div style={{ padding: '12px 16px', background: netProfit >= 0 ? 'rgba(5, 150, 105, 0.08)' : 'rgba(211, 47, 47, 0.08)', borderRadius: 10, border: `1px solid ${netProfit >= 0 ? 'rgba(5, 150, 105, 0.3)' : 'rgba(211, 47, 47, 0.3)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: netProfit >= 0 ? '#059669' : '#D32F2F' }}>
                      📈 Laba Bersih Operasional (Net Profit)
                    </span>
                    <span className="brand-badge" style={{ background: netProfit >= 0 ? '#059669' : '#D32F2F', color: '#fff', fontSize: '0.7rem' }}>
                      Margin {netProfitMarginPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: netProfit >= 0 ? '#059669' : '#D32F2F', marginTop: 4 }}>
                    Rp {netProfit.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: 4 }}>
                    Pendapatan Kotor - (CAPEX + OPEX)
                  </div>
                </div>

                {/* Metric 2: Net Profit After Personal Purchase */}
                <div style={{ padding: '12px 16px', background: netProfitAfterPersonal >= 0 ? 'rgba(139, 92, 246, 0.08)' : 'rgba(211, 47, 47, 0.08)', borderRadius: 10, border: `1px solid ${netProfitAfterPersonal >= 0 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(211, 47, 47, 0.3)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: netProfitAfterPersonal >= 0 ? '#8B5CF6' : '#D32F2F' }}>
                      🛍️ Laba Bersih After Personal Purchase
                    </span>
                    <span className="brand-badge" style={{ background: netProfitAfterPersonal >= 0 ? '#8B5CF6' : '#D32F2F', color: '#fff', fontSize: '0.7rem' }}>
                      {netProfitAfterPersonal >= 0 ? 'SURPLUS' : 'DEFISIT'}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: netProfitAfterPersonal >= 0 ? '#8B5CF6' : '#D32F2F', marginTop: 4 }}>
                    Rp {netProfitAfterPersonal.toLocaleString('id-ID')}
                  </div>
                  </div>
                </div>
              </div>

            {/* 3. SUB-TAB FILTER BAR & FULL-WIDTH LEDGER TABLES */}
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginRight: 4 }}>KATEGORI:</span>
                <button 
                  className={`btn btn-sm ${financeSubTab === 'all' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setFinanceSubTab('all')}
                  style={{ borderRadius: 20 }}
                >
                  📑 Semua ({capexList.length + opexList.length + personalList.length + otherIncomeList.length})
                </button>
                <button 
                  className={`btn btn-sm ${financeSubTab === 'capex' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setFinanceSubTab('capex')}
                  style={{ borderRadius: 20 }}
                >
                  📦 CAPEX ({capexList.length})
                </button>
                <button 
                  className={`btn btn-sm ${financeSubTab === 'opex' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setFinanceSubTab('opex')}
                  style={{ borderRadius: 20 }}
                >
                  ⚙️ OPEX ({opexList.length})
                </button>
                <button 
                  className={`btn btn-sm ${financeSubTab === 'personal' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setFinanceSubTab('personal')}
                  style={{ borderRadius: 20 }}
                >
                  🛍️ Personal ({personalList.length})
                </button>
                <button 
                  className={`btn btn-sm ${financeSubTab === 'other_income' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setFinanceSubTab('other_income')}
                  style={{ borderRadius: 20 }}
                >
                  🎁 Bonus ({otherIncomeList.length})
                </button>
              </div>
            </div>

            {/* FULL-WIDTH STACKED LEDGER CARDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* CAPEX Table */}
              {(financeSubTab === 'all' || financeSubTab === 'capex') && (
                <div className="glass-card" style={{ padding: '1.25rem 1.5rem', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
                        📦 Pengeluaran Aset (CAPEX)
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Investasi Jangka Panjang & Pembelian Alat Studio</span>
                    </div>
                    <span className="brand-badge" style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 800, background: 'rgba(184, 142, 57, 0.1)', color: '#B88E39' }}>
                      Total CAPEX: Rp {totalCapex.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Nama Item / Peralatan</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Kategori</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Tanggal Pembelian</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px' }}>Jumlah Nominal (Rp)</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {capexList.length > 0 ? (
                          capexList.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 12px' }}><strong>{c.name}</strong></td>
                              <td style={{ padding: '10px 12px' }}><span className="brand-badge">{c.category}</span></td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>{c.date}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>Rp {c.amount.toLocaleString('id-ID')}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button className="btn btn-sm btn-secondary" style={{ padding: '5px 10px', color: 'var(--primary)' }} onClick={() => handleStartEditCapex(c)}>
                                    <Edit3 style={{ width: 14, height: 14 }} /> Edit
                                  </button>
                                  <button className="btn btn-sm btn-secondary" style={{ padding: '5px 10px', color: '#D32F2F' }} onClick={() => handleDeleteCapex(c.id)}>
                                    <Trash2 style={{ width: 14, height: 14 }} /> Hapus
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Belum ada data pengeluaran modal (CAPEX).</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* OPEX Table */}
              {(financeSubTab === 'all' || financeSubTab === 'opex') && (
                <div className="glass-card" style={{ padding: '1.25rem 1.5rem', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
                        ⚙️ Operasional Bulanan (OPEX)
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Biaya Rutin Berulang (Gaji Host, Internet, Rent, Ads)</span>
                    </div>
                    <span className="brand-badge" style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 800, background: 'rgba(211, 47, 47, 0.1)', color: '#D32F2F' }}>
                      Total OPEX: Rp {totalOpex.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Nama Item Transaksi</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Kategori</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Frekuensi / Siklus</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Tanggal</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px' }}>Jumlah Nominal (Rp)</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opexList.length > 0 ? (
                          opexList.map(o => (
                            <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 12px' }}><strong>{o.name}</strong></td>
                              <td style={{ padding: '10px 12px' }}><span className="brand-badge">{o.category}</span></td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>{o.frequency || 'Bulanan'}</td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>{o.date || '-'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#D32F2F' }}>Rp {o.amount.toLocaleString('id-ID')}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button className="btn btn-sm btn-secondary" style={{ padding: '5px 10px', color: 'var(--primary)' }} onClick={() => handleStartEditOpex(o)}>
                                    <Edit3 style={{ width: 14, height: 14 }} /> Edit
                                  </button>
                                  <button className="btn btn-sm btn-secondary" style={{ padding: '5px 10px', color: '#D32F2F' }} onClick={() => handleDeleteOpex(o.id)}>
                                    <Trash2 style={{ width: 14, height: 14 }} /> Hapus
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Belum ada data pengeluaran operasional (OPEX).</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Personal Purchase Table */}
              {(financeSubTab === 'all' || financeSubTab === 'personal') && (
                <div className="glass-card" style={{ padding: '1.25rem 1.5rem', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
                        🛍️ Pembelian Pribadi (Personal Purchase)
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Pengeluaran Personal Ditanggung Rekening Studio</span>
                    </div>
                    <span className="brand-badge" style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 800, background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>
                      Total Personal: Rp {totalPersonal.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Nama Item / Barang</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Kategori</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Tanggal Pembelian</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px' }}>Jumlah Nominal (Rp)</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {personalList.length > 0 ? (
                          personalList.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 12px' }}><strong>{p.name}</strong></td>
                              <td style={{ padding: '10px 12px' }}><span className="brand-badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>{p.category || "Personal"}</span></td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>{p.date}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#8B5CF6' }}>Rp {p.amount.toLocaleString('id-ID')}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button className="btn btn-sm btn-secondary" style={{ padding: '5px 10px', color: 'var(--primary)' }} onClick={() => handleStartEditPersonal(p)}>
                                    <Edit3 style={{ width: 14, height: 14 }} /> Edit
                                  </button>
                                  <button className="btn btn-sm btn-secondary" style={{ padding: '5px 10px', color: '#D32F2F' }} onClick={() => handleDeletePersonal(p.id)}>
                                    <Trash2 style={{ width: 14, height: 14 }} /> Hapus
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Belum ada data pengeluaran/pembelian pribadi.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bonus & Other Income Table */}
              {(financeSubTab === 'all' || financeSubTab === 'other_income') && (
                <div className="glass-card" style={{ padding: '1.25rem 1.5rem', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
                        🎁 Bonus & Pendapatan Lain-lain
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Bonus Performance Target, Cashback Affiliate, Tip & Pemasukan Ekstra</span>
                    </div>
                    <span className="brand-badge" style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 800, background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                      Total Bonus: Rp {totalOtherIncome.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Nama Item / Sumber Bonus</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Kategori</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Tanggal Pemasukan</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px' }}>Jumlah Nominal (Rp)</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherIncomeList.length > 0 ? (
                          otherIncomeList.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 12px' }}><strong>{item.name}</strong></td>
                              <td style={{ padding: '10px 12px' }}><span className="brand-badge" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>{item.category || "Bonus"}</span></td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>{item.date}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>Rp {item.amount.toLocaleString('id-ID')}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button className="btn btn-sm btn-secondary" style={{ padding: '5px 10px', color: 'var(--primary)' }} onClick={() => handleStartEditOtherIncome(item)}>
                                    <Edit3 style={{ width: 14, height: 14 }} /> Edit
                                  </button>
                                  <button className="btn btn-sm btn-secondary" style={{ padding: '5px 10px', color: '#D32F2F' }} onClick={() => handleDeleteOtherIncome(item.id)}>
                                    <Trash2 style={{ width: 14, height: 14 }} /> Hapus
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Belum ada data bonus atau pendapatan lain-lain.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Tab 6: Pinterest Analytics (US Affiliate Market) */}
        {activeTab === 'tabPinterest' && (
          <div className="tab-content main-inner">
            
            {/* PINTEREST CHANNEL BANNER & UPLOAD BUTTONS */}
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(230, 0, 35, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E60023' }}>
                  <Compass style={{ width: 26, height: 26 }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Pinterest US Affiliate Channel</h3>
                    <span className="brand-badge" style={{ background: 'rgba(230,0,35,0.1)', color: '#E60023', border: '1px solid rgba(230,0,35,0.2)' }}>@productijustfound</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    Kanal kurasi produk viral & media afiliasi Amazon (US Market) • Periode Laporan: {pinterestReports.length > 0 ? pinterestReports[0].dateRange : "Jul 2026"}
                  </p>
                </div>
              </div>

              <div>
                <label className="btn btn-primary" style={{ cursor: 'pointer', gap: 8, margin: 0, padding: '10px 20px', fontSize: '0.875rem' }}>
                  <PlusCircle style={{ width: 16, height: 16 }} />
                  <span>Upload Data Pinterest (CSV / Excel)</span>
                  <input type="file" accept=".csv, .txt" onChange={(e) => handlePinterestCsvUpload(e)} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {pinterestReports.length > 0 ? (
              <div>
                {pinterestReports.slice(0, 1).map(report => (
                  <div key={report.id}>
                    
                    {/* 6 EXECUTIVE PINTEREST KPI CARDS */}
                    <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                      <div className="glass-card kpi-card" style={{ '--kpi-accent': 'var(--primary)' }}>
                        <div className="kpi-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                          <Eye style={{ width: 18, height: 18 }} />
                        </div>
                        <div className="kpi-title">Total Impressions</div>
                        <div className="kpi-value text-primary">{(report.impressions || 0).toLocaleString('id-ID')}</div>
                        <div className="kpi-subtext">Penayangan Pin Organik</div>
                      </div>

                      <div className="glass-card kpi-card" style={{ '--kpi-accent': 'var(--secondary-emerald)' }}>
                        <div className="kpi-icon" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                          <TrendingUp style={{ width: 18, height: 18 }} />
                        </div>
                        <div className="kpi-title">Engagements</div>
                        <div className="kpi-value text-success">{(report.engagements || 0).toLocaleString('id-ID')}</div>
                        <div className="kpi-subtext">Klik Pin, Simpan & Interaksi</div>
                      </div>

                      <div className="glass-card kpi-card" style={{ '--kpi-accent': '#B88E39' }}>
                        <div className="kpi-icon" style={{ background: 'rgba(184,142,57,0.1)', color: '#B88E39' }}>
                          <ExternalLink style={{ width: 18, height: 18 }} />
                        </div>
                        <div className="kpi-title">Outbound Clicks</div>
                        <div className="kpi-value text-warning">{(report.outboundClicks || 0).toLocaleString('id-ID')}</div>
                        <div className="kpi-subtext">Traffic Klik ke Link Amazon</div>
                      </div>

                      <div className="glass-card kpi-card" style={{ '--kpi-accent': '#8B5CF6' }}>
                        <div className="kpi-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
                          <Save style={{ width: 18, height: 18 }} />
                        </div>
                        <div className="kpi-title">Saves (Re-pins)</div>
                        <div className="kpi-value" style={{ color: '#8B5CF6' }}>{(report.saves || 0).toLocaleString('id-ID')}</div>
                        <div className="kpi-subtext">Disimpan ke Board Pengguna</div>
                      </div>

                      <div className="glass-card kpi-card" style={{ '--kpi-accent': '#3B82F6' }}>
                        <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
                          <Users style={{ width: 18, height: 18 }} />
                        </div>
                        <div className="kpi-title">Total Audience</div>
                        <div className="kpi-value" style={{ color: '#3B82F6' }}>{(report.totalAudience || 833).toLocaleString('id-ID')}</div>
                        <div className="kpi-subtext">Jangkauan Unik Pengguna</div>
                      </div>

                      <div className="glass-card kpi-card" style={{ '--kpi-accent': '#EC4899' }}>
                        <div className="kpi-icon" style={{ background: 'rgba(236,72,153,0.1)', color: '#EC4899' }}>
                          <Sparkles style={{ width: 18, height: 18 }} />
                        </div>
                        <div className="kpi-title">Engaged Audience</div>
                        <div className="kpi-value" style={{ color: '#EC4899' }}>{(report.engagedAudience || 64).toLocaleString('id-ID')}</div>
                        <div className="kpi-subtext">Pengguna Berinteraksi Aktif</div>
                      </div>
                    </div>

                    {/* DAILY IMPRESSIONS TREND GRAPH */}
                    {report.dailyImpressions && report.dailyImpressions.length > 0 && (
                      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TrendingUp style={{ color: 'var(--primary)', width: 16, height: 16 }} /> Performance Over Time (Daily Impressions)
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Sumber: {report.overviewFileName || "Pinterest Analytics overview.csv"}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '10px 0', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
                          {report.dailyImpressions.map((d, idx) => {
                            const maxVal = Math.max(...report.dailyImpressions.map(item => item.impressions), 500);
                            const pct = (d.impressions / maxVal) * 100;
                            return (
                              <div key={idx} style={{ flex: 1, minWidth: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} title={`${d.date}: ${d.impressions} impressions`}>
                                <span style={{ fontSize: '0.625rem', color: 'var(--text-dim)', marginBottom: 2 }}>{d.impressions}</span>
                                <div style={{ width: '80%', height: `${Math.max(4, pct)}%`, background: 'var(--primary)', borderRadius: '4px 4px 0 0', opacity: 0.85, transition: 'all 0.2s ease' }} />
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4 }}>{d.date}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* TOP BOARDS & TOP PINS TABLES */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      
                      {/* Top Boards */}
                      <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Pin style={{ width: 15, height: 15 }} /> Top Boards (Kategori Populer)
                        </h3>
                        <div className="table-wrapper">
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ textAlign: 'left', padding: '8px' }}>Nama Board</th>
                                <th style={{ textAlign: 'right', padding: '8px' }}>Impressions</th>
                                <th style={{ textAlign: 'right', padding: '8px' }}>Saves</th>
                                <th style={{ textAlign: 'right', padding: '8px' }}>Pin Clicks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(report.topBoards || []).map((b, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <td style={{ padding: '8px' }}>
                                    <a href={b.link} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                                      /{b.name}
                                    </a>
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{b.impressions}</td>
                                  <td style={{ padding: '8px', textAlign: 'right', color: '#8B5CF6', fontWeight: 700 }}>{b.saves}</td>
                                  <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{b.pinClicks}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Top Pins */}
                      <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Compass style={{ width: 15, height: 15 }} /> Top Pins (Produk Terlaris Amazon)
                        </h3>
                        <div className="table-wrapper">
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ textAlign: 'left', padding: '8px' }}>Pin ID / Link</th>
                                <th style={{ textAlign: 'left', padding: '8px' }}>Tipe</th>
                                <th style={{ textAlign: 'right', padding: '8px' }}>Impressions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(report.topPins || []).map((p, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <td style={{ padding: '8px' }}>
                                    <a href={p.link} target="_blank" rel="noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'none', fontFamily: 'monospace' }}>
                                      Pin #{p.id.slice(-8)} <ExternalLink style={{ width: 10, height: 10, display: 'inline', marginLeft: 2 }} />
                                    </a>
                                  </td>
                                  <td style={{ padding: '8px' }}><span className="brand-badge">{p.type}</span></td>
                                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{p.impressions}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>

                    {/* AUDIENCE DEMOGRAPHICS & TARGETING INSIGHTS */}
                    {report.demographics && (
                      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Users style={{ color: 'var(--primary)', width: 16, height: 16 }} /> Audience Demographics & Targeting Insights (US Market)
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Sumber: {report.audienceFileName || "audience-insights-total-audience.csv"}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                          
                          {/* Age Distribution */}
                          <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <BarChart2 style={{ width: 14, height: 14 }} /> Demografi Usia (Age)
                            </h4>
                            {(report.demographics.age || []).map((a, i) => (
                              <div key={i} style={{ marginBottom: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                                  <span>Usia {a.label}</span>
                                  <strong>{a.percent}%</strong>
                                </div>
                                <div style={{ width: '100%', height: 5, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: `${a.percent}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Gender Split */}
                          <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Users style={{ width: 14, height: 14 }} /> Demografi Gender
                            </h4>
                            {(report.demographics.gender || []).map((g, i) => (
                              <div key={i} style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                                  <span>{g.label}</span>
                                  <strong>{g.percent}%</strong>
                                </div>
                                <div style={{ width: '100%', height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: `${g.percent}%`, height: '100%', background: g.label === 'Female' ? '#EC4899' : g.label === 'Male' ? '#3B82F6' : 'var(--text-dim)', borderRadius: 3 }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Devices Breakdown */}
                          <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Smartphone style={{ width: 14, height: 14 }} /> Perangkat (Devices)
                            </h4>
                            {(report.demographics.device || []).map((d, i) => (
                              <div key={i} style={{ marginBottom: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                                  <span>{d.label}</span>
                                  <strong>{d.percent}%</strong>
                                </div>
                                <div style={{ width: '100%', height: 5, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: `${d.percent}%`, height: '100%', background: '#8B5CF6', borderRadius: 3 }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Top Target Countries */}
                          <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Globe style={{ width: 14, height: 14 }} /> Negara Teratas (Top Countries)
                            </h4>
                            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(report.demographics.countries || []).slice(0, 5).map((c, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: 3 }}>
                                  <span>{c.label}</span>
                                  <strong>{c.percent}%</strong>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Top US Metro Cities */}
                          <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Compass style={{ width: 14, height: 14 }} /> Kota Metro AS Teratas (Top US Cities)
                            </h4>
                            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(report.demographics.metros && report.demographics.metros.length > 0 ? report.demographics.metros : [
                                { label: 'New York, NY', percent: 6.6 },
                                { label: 'Los Angeles, CA', percent: 5.6 },
                                { label: 'Washington, DC', percent: 4.2 },
                                { label: 'Phoenix, AZ', percent: 3.3 },
                                { label: 'San Francisco, CA', percent: 2.8 }
                              ]).slice(0, 5).map((m, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: 3 }}>
                                  <span>{m.label}</span>
                                  <strong style={{ color: 'var(--accent-gold)' }}>{m.percent}%</strong>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>

                        {/* TOP CATEGORY INTERESTS & AFFINITY */}
                        {report.demographics.interests && report.demographics.interests.length > 0 && (
                          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border-color)' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Target style={{ width: 14, height: 14 }} /> Kategori Minat Utama (Top 8 Category Interests & Affinity)
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                              {report.demographics.interests
                                .filter((item, index, self) => index === self.findIndex(t => t.category === item.category))
                                .sort((a, b) => (b.percent || 0) - (a.percent || 0) || (b.affinity || 0) - (a.affinity || 0))
                                .slice(0, 8)
                                .map((int, idx) => (
                                  <div key={idx} style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.775rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600 }}>{int.category}</span>
                                    <div style={{ textAlign: 'right' }}>
                                      <strong style={{ color: 'var(--primary)' }}>{int.percent}%</strong>
                                      <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', display: 'block' }}>Affinity {int.affinity}x</span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                    {/* FILE LOG INSPECTOR TABLE */}
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText style={{ color: 'var(--primary)', width: 16, height: 16 }} /> Inspection & File Log Parser
                        </h3>
                        <p style={{ fontSize: '0.775rem', color: 'var(--text-dim)', marginTop: 2 }}>Daftar file laporan Excel/CSV Pinterest yang aktif diimpor ke sistem</p>
                      </div>

                      <div className="table-wrapper">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ textAlign: 'left', padding: '10px' }}>Nama File CSV</th>
                              <th style={{ textAlign: 'left', padding: '10px' }}>Tipe Laporan</th>
                              <th style={{ textAlign: 'left', padding: '10px' }}>Waktu Upload</th>
                              <th style={{ textAlign: 'right', padding: '10px' }}>Jumlah Baris</th>
                              <th style={{ textAlign: 'center', padding: '10px' }}>Status Sinkronisasi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(report.fileHistory || [
                              { id: "1", fileName: report.overviewFileName || "Pinterest Analytics overview 20260701-20260731 (1).csv", fileType: "Overview Performance", uploadedAt: "2026-08-02 08:00", rowsCount: 65, status: "Active & Synced" },
                              { id: "2", fileName: report.audienceFileName || "audience-insights-total-audience-2026-08-02.csv", fileType: "Audience Insights", uploadedAt: "2026-08-02 08:05", rowsCount: 140, status: "Active & Synced" }
                            ]).map((f, i) => (
                              <tr key={f.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '10px', fontWeight: 600 }}>
                                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <FileText style={{ width: 13, height: 13 }} /> {f.fileName}
                                  </span>
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <span className="brand-badge" style={{ background: f.fileType?.includes("Audience") ? 'rgba(59,130,246,0.1)' : 'rgba(5,150,105,0.1)', color: f.fileType?.includes("Audience") ? '#3B82F6' : '#059669' }}>
                                    {f.fileType}
                                  </span>
                                </td>
                                <td style={{ padding: '10px', color: 'var(--text-dim)' }}>{f.uploadedAt}</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{f.rowsCount || 100} baris</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                  <span className="brand-badge" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle2 style={{ width: 12, height: 12 }} /> {f.status || 'Active & Synced'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                <Compass style={{ width: 36, height: 36, color: 'var(--text-dim)', marginBottom: 8 }} />
                <h3>Belum Ada Laporan Pinterest</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gunakan tombol upload di atas untuk mengunggah file Analytics overview.csv atau audience-insights.csv dari Pinterest.</p>
              </div>
            )}

          </div>
        )}



        {/* Tab 4: Projects */}
        {activeTab === 'tabProjects' && (
          <div className="tab-content main-inner">
            <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Briefcase style={{ color: 'var(--primary)' }} /> Manajemen Proyek & Klien Studio</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Kelola kontrak jasa live streaming, produksi konten, dan anggaran klien.</p>
              </div>
              <button className="btn btn-accent" onClick={() => setModalType('project')}><PlusCircle /> Input Proyek Baru</button>
            </div>

            <div className="table-wrapper glass-card">
              <table>
                <thead>
                  <tr>
                    <th>Nama Klien</th>
                    <th>Judul Proyek & Kategori</th>
                    <th>Nilai Kontrak (Rp)</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.clientName}</strong></td>
                      <td>{p.projectTitle}<br/><small style={{ color: 'var(--text-dim)' }}>{p.category}</small></td>
                      <td className="text-success" style={{ fontWeight: 700 }}>Rp {(p.budget || 0).toLocaleString('id-ID')}</td>
                      <td><span className="brand-badge" style={{ background: p.status === 'Aktif' ? 'rgba(5,150,105,0.1)' : 'rgba(0,0,0,0.05)', color: p.status === 'Aktif' ? '#059669' : 'var(--text-muted)' }}>{p.status}</span></td>
                      <td>{p.deadline}</td>
                      <td>
                        <button className="btn btn-sm btn-secondary" style={{ color: '#D32F2F' }} onClick={() => {
                          setStudioData(prev => ({ ...prev, clientProjects: prev.clientProjects.filter(item => item.id !== p.id) }));
                        }}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer>
          <p>© 2026 <strong>Paramara Studio</strong> — Authorized Admin Portal for Malikh</p>
        </footer>
      </main>

      {/* Modal: ADD ADMIN USER */}
      {modalType === 'addAdmin' && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus style={{ color: 'var(--primary)' }} /> Tambah Akun Admin Baru</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            <form onSubmit={handleAddAdminUser}>
              <div className="form-group">
                <label className="form-label">Username Admin</label>
                <input className="form-input" placeholder="contoh: admin_lina" value={newAdminUsername} onChange={e => setNewAdminUsername(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input className="form-input" placeholder="contoh: Lina Safitri" value={newAdminFullName} onChange={e => setNewAdminFullName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Peran / Hak Akses</label>
                <select className="form-select" value={newAdminRole} onChange={e => setNewAdminRole(e.target.value)}>
                  <option value="Admin Operasional">Admin Operasional</option>
                  <option value="Host Streamer Manager">Host Streamer Manager</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                <Save /> Simpan Akun Admin
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: EDIT ADMIN USER */}
      {modalType === 'editAdmin' && editingAdminUser && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Edit3 style={{ color: 'var(--primary)' }} /> Edit Profil Admin (@{editingAdminUser.username})</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            <form onSubmit={handleSaveEditedAdmin}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input className="form-input" value={editingAdminUser.fullName} onChange={e => setEditingAdminUser({ ...editingAdminUser, fullName: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Email Terdaftar</label>
                <input className="form-input" value={editingAdminUser.email} onChange={e => setEditingAdminUser({ ...editingAdminUser, email: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Peran / Hak Akses</label>
                <select className="form-select" value={editingAdminUser.role} onChange={e => setEditingAdminUser({ ...editingAdminUser, role: e.target.value })}>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin Operasional">Admin Operasional</option>
                  <option value="Host Streamer Manager">Host Streamer Manager</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                <Save /> Simpan Perubahan Profil Admin
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: DUAL SCREENSHOT SCANNER WITH INSTANT AI SCANNING & DEFERRED BACKGROUND FIREBASE UPLOAD */}
      {modalType === 'scan' && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: 740 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ImagePlus style={{ color: 'var(--primary)' }} /> Unggah Dual Screenshot</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            {!scannedPreview && !scanning && (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Unggah 2 foto screenshot HP sekaligus: <strong>Screenshot Atas</strong> (Data Utama GMV & Interaksi) + <strong>Screenshot Bawah</strong> (Detail Produk Terjual).
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  
                  {/* Slot 1 Dropzone */}
                  <label className="dropzone" style={{ display: 'block', padding: '1.25rem 1rem', background: fileSlot1 ? 'rgba(5, 150, 105, 0.05)' : '#F8FAF9', borderColor: fileSlot1 ? 'var(--secondary-emerald)' : 'var(--border-color)' }}>
                    {previewUrl1 ? (
                      <div style={{ textAlign: 'center' }}>
                        <img src={previewUrl1} alt="Screenshot 1" style={{ height: 90, borderRadius: 8, border: '1px solid var(--secondary-emerald)', objectFit: 'cover', marginBottom: 8 }} />
                        <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <CheckCircle style={{ width: 14, height: 14 }} /> Foto 1 Terpilih
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{fileSlot1.name}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                          <ImagePlus style={{ width: 32, height: 32, color: 'var(--primary)' }} />
                        </div>
                        <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>1. Screenshot Atas</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Data Utama GMV & Interaksi</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleFile1Select} style={{ display: 'none' }} />
                  </label>

                  {/* Slot 2 Dropzone */}
                  <label className="dropzone" style={{ display: 'block', padding: '1.25rem 1rem', background: fileSlot2 ? 'rgba(5, 150, 105, 0.05)' : '#F8FAF9', borderColor: fileSlot2 ? 'var(--secondary-emerald)' : 'var(--border-color)' }}>
                    {previewUrl2 ? (
                      <div style={{ textAlign: 'center' }}>
                        <img src={previewUrl2} alt="Screenshot 2" style={{ height: 90, borderRadius: 8, border: '1px solid var(--secondary-emerald)', objectFit: 'cover', marginBottom: 8 }} />
                        <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <CheckCircle style={{ width: 14, height: 14 }} /> Foto 2 Terpilih
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{fileSlot2.name}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                          <ImagePlus style={{ width: 32, height: 32, color: 'var(--primary)' }} />
                        </div>
                        <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>2. Screenshot Bawah</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Scroll Down: Produk Terjual</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleFile2Select} style={{ display: 'none' }} />
                  </label>

                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                  onClick={handleDualAnalysis}
                  disabled={(!fileSlot1 && !fileSlot2) || scanning}
                >
                  <Sparkles /> {scanning ? 'Mengekstrak...' : 'Ekstrak Data Instan dari Galeri'} ({[fileSlot1, fileSlot2].filter(Boolean).length} Foto)
                </button>
              </div>
            )}

            {/* INSTANT SCANNING INDICATOR */}
            {scanning && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(184, 142, 57, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-gold-border)' }}>
                    <Sparkles style={{ width: 36, height: 36, color: 'var(--accent-gold)', animation: 'spin 2s linear infinite' }} />
                  </div>
                </div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: 6 }}>AI Vision Membaca Foto Screenshot...</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Mengekstrak GMV, pesanan, CTR & produk terjual secara instan tanpa menunggu upload cloud.
                </p>
                <button 
                  className="btn btn-secondary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', margin: '0 auto' }}
                  onClick={() => { setModalType(null); showToast('⚡ Pemindaian AI berjalan di latar belakang...', 'info'); }}
                >
                  <PanelLeftClose style={{ width: 15, height: 15 }} /> Lanjutkan di Latar Belakang
                </button>
              </div>
            )}

            {/* SCAN RESULT CONFIRMATION FORM */}
            {scannedPreview && !scanning && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ background: 'rgba(5, 150, 105, 0.08)', border: '1px solid rgba(5, 150, 105, 0.2)', padding: '12px 16px', borderRadius: 10, marginBottom: '1.25rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle style={{ width: 20, height: 20 }} />
                  <div>
                    <strong style={{ fontSize: '0.9rem', display: 'block' }}>Ekstraksi AI Berhasil! (Sangat Cepat)</strong>
                    <span style={{ fontSize: '0.775rem' }}>Data telah dibaca. Klik tombol simpan untuk menyimpan metrik ke portal & mengunggah foto ke Firebase di latar belakang.</span>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Judul Sesi Live</label>
                    <input className="form-input" value={scannedPreview.title} onChange={e => setScannedPreview({ ...scannedPreview, title: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Durasi Live</label>
                    <input className="form-input" value={scannedPreview.duration} onChange={e => setScannedPreview({ ...scannedPreview, duration: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Penjualan GMV (Rp)</label>
                    <input className="form-input" type="number" value={scannedPreview.revenue} onChange={e => setScannedPreview({ ...scannedPreview, revenue: parseInt(e.target.value) || 0 })} />
                  </div>

                  {/* GROSS COMMISSION INPUT */}
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--accent-gold)' }}>💵 Komisi Kotor Studio (Rp)</label>
                    <input className="form-input" type="number" placeholder="Kosong (Silakan isi nominal komisi)" value={scannedPreview.grossCommission ?? ''} onChange={e => setScannedPreview({ ...scannedPreview, grossCommission: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Total Pesanan</label>
                    <input className="form-input" type="number" value={scannedPreview.totalOrders} onChange={e => setScannedPreview({ ...scannedPreview, totalOrders: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} onClick={handleSaveScannedSession}>
                  <Save /> Simpan Seluruh Metrik & Komisi Kotor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: EDIT SESSION DATA */}
      {modalType === 'editSession' && editingSession && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Edit3 style={{ color: 'var(--primary)' }} /> Edit Data Sesi Shopee Live</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Judul Sesi Live</label>
                <input className="form-input" value={editingSession.title} onChange={e => setEditingSession({ ...editingSession, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Durasi Live</label>
                <input className="form-input" value={editingSession.duration} onChange={e => setEditingSession({ ...editingSession, duration: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Penjualan GMV (Rp)</label>
                <input className="form-input" type="number" value={editingSession.revenue} onChange={e => setEditingSession({ ...editingSession, revenue: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--accent-gold)' }}>💵 Komisi Kotor Studio (Rp)</label>
                <input className="form-input" type="number" value={editingSession.grossCommission || 0} onChange={e => setEditingSession({ ...editingSession, grossCommission: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label">Total Pesanan</label>
                <input className="form-input" type="number" value={editingSession.totalOrders} onChange={e => setEditingSession({ ...editingSession, totalOrders: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label">Persentase Klik (CTR %)</label>
                <input className="form-input" type="number" step="0.1" value={editingSession.clickRatePercent} onChange={e => setEditingSession({ ...editingSession, clickRatePercent: parseFloat(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label">Penonton Aktif</label>
                <input className="form-input" type="number" value={editingSession.activeViewers || 7} onChange={e => setEditingSession({ ...editingSession, activeViewers: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label">Masuk Keranjang</label>
                <input className="form-input" type="number" value={editingSession.cartAdditions || 5} onChange={e => setEditingSession({ ...editingSession, cartAdditions: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label">Total Suka</label>
                <input className="form-input" type="number" value={editingSession.likes ?? editingSession.likeCount ?? 0} onChange={e => setEditingSession({ ...editingSession, likes: parseInt(e.target.value) || 0, likeCount: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label">Tingkat Konversi (%)</label>
                <input className="form-input" type="number" step="0.1" value={editingSession.ordersPerClickPercent ?? editingSession.conversionRatePercent ?? 0} onChange={e => setEditingSession({ ...editingSession, ordersPerClickPercent: parseFloat(e.target.value) || 0, conversionRatePercent: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            {/* EDITABLE PRODUCTS LIST SECTION */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontWeight: 800, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Briefcase style={{ width: 15, height: 15 }} /> Detail Produk Terjual & Masuk Keranjang ({ (editingSession.products || []).length } Item)
                </label>

                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ gap: 4, padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => {
                    const newProds = [...(editingSession.products || []), { name: "Produk Baru", price: 0, revenue: 0, clicks: 0, cartAdds: 0 }];
                    setEditingSession({ ...editingSession, products: newProds });
                  }}
                >
                  <PlusCircle style={{ width: 13, height: 13 }} /> + Tambah Produk
                </button>
              </div>

              {editingSession.products && editingSession.products.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                  {editingSession.products.map((prod, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          className="form-input" 
                          style={{ flex: 1, fontSize: '0.8rem', fontWeight: 700 }} 
                          placeholder="Nama Produk"
                          value={prod.name || ''} 
                          onChange={e => {
                            const updated = [...editingSession.products];
                            updated[idx] = { ...prod, name: e.target.value };
                            setEditingSession({ ...editingSession, products: updated });
                          }} 
                        />
                        <button 
                          type="button" 
                          className="btn btn-sm btn-secondary" 
                          style={{ color: '#D32F2F', padding: '6px 8px' }}
                          onClick={() => {
                            const updated = editingSession.products.filter((_, i) => i !== idx);
                            setEditingSession({ ...editingSession, products: updated });
                          }}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.675rem', color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>Harga Katalog (Rp)</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            style={{ fontSize: '0.75rem', padding: '4px 6px' }}
                            value={prod.price || ''} 
                            onChange={e => {
                              const updated = [...editingSession.products];
                              updated[idx] = { ...prod, price: parseInt(e.target.value) || 0 };
                              setEditingSession({ ...editingSession, products: updated });
                            }} 
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.675rem', color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>GMV Penjualan (Rp)</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            style={{ fontSize: '0.75rem', padding: '4px 6px', fontWeight: 700, color: '#059669' }}
                            value={prod.revenue || ''} 
                            onChange={e => {
                              const updated = [...editingSession.products];
                              updated[idx] = { ...prod, revenue: parseInt(e.target.value) || 0 };
                              setEditingSession({ ...editingSession, products: updated });
                            }} 
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.675rem', color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>Klik</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            style={{ fontSize: '0.75rem', padding: '4px 6px' }}
                            value={prod.clicks || ''} 
                            onChange={e => {
                              const updated = [...editingSession.products];
                              updated[idx] = { ...prod, clicks: parseInt(e.target.value) || 0 };
                              setEditingSession({ ...editingSession, products: updated });
                            }} 
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.675rem', color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>Masuk Keranjang</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            style={{ fontSize: '0.75rem', padding: '4px 6px', fontWeight: 700, color: 'var(--primary)' }}
                            value={prod.cartAdds || ''} 
                            onChange={e => {
                              const updated = [...editingSession.products];
                              updated[idx] = { ...prod, cartAdds: parseInt(e.target.value) || 0 };
                              setEditingSession({ ...editingSession, products: updated });
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 8, fontSize: '0.775rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                  Belum ada item produk terdaftar. Klik "+ Tambah Produk" di atas untuk menambahkan.
                </div>
              )}
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem' }} onClick={handleSaveEditedSession}>
              <Save /> Simpan Perubahan Data Sesi
            </button>
          </div>
        </div>
      )}

      {/* Modal: SHOPEE VIDEO DUAL SCREENSHOT SCANNER */}
      {modalType === 'scan_video' && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: 740 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ImagePlus style={{ color: 'var(--primary)' }} /> Unggah Dual Screenshot Video</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            {!scannedVideoPreview && !scanning && (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Unggah 2 foto screenshot HP sekaligus: <strong>Screenshot Penonton</strong> (Data Utama Penonton/Likes) + <strong>Screenshot Penjualan</strong> (Detail Produk Terjual & GMV).
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  
                  {/* Slot 1 Dropzone */}
                  <label className="dropzone" style={{ display: 'block', padding: '1.25rem 1rem', background: videoFileSlot1 ? 'rgba(5, 150, 105, 0.05)' : '#F8FAF9', borderColor: videoFileSlot1 ? 'var(--secondary-emerald)' : 'var(--border-color)' }}>
                    {videoPreviewUrl1 ? (
                      <div style={{ textAlign: 'center' }}>
                        <img src={videoPreviewUrl1} alt="Screenshot 1" style={{ height: 90, borderRadius: 8, border: '1px solid var(--secondary-emerald)', objectFit: 'cover', marginBottom: 8 }} />
                        <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <CheckCircle style={{ width: 14, height: 14 }} /> Foto 1 Terpilih
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{videoFileSlot1.name}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                          <ImagePlus style={{ width: 32, height: 32, color: 'var(--primary)' }} />
                        </div>
                        <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>1. Screenshot Penonton</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Metrik Viewers, Likes, Shares</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleVideoFile1Select} style={{ display: 'none' }} />
                  </label>

                  {/* Slot 2 Dropzone */}
                  <label className="dropzone" style={{ display: 'block', padding: '1.25rem 1rem', background: videoFileSlot2 ? 'rgba(5, 150, 105, 0.05)' : '#F8FAF9', borderColor: videoFileSlot2 ? 'var(--secondary-emerald)' : 'var(--border-color)' }}>
                    {videoPreviewUrl2 ? (
                      <div style={{ textAlign: 'center' }}>
                        <img src={videoPreviewUrl2} alt="Screenshot 2" style={{ height: 90, borderRadius: 8, border: '1px solid var(--secondary-emerald)', objectFit: 'cover', marginBottom: 8 }} />
                        <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <CheckCircle style={{ width: 14, height: 14 }} /> Foto 2 Terpilih
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{videoFileSlot2.name}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                          <ImagePlus style={{ width: 32, height: 32, color: 'var(--primary)' }} />
                        </div>
                        <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>2. Screenshot Penjualan</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>GMV, Produk Terjual, Orders</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleVideoFile2Select} style={{ display: 'none' }} />
                  </label>

                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                  onClick={handleVideoDualAnalysis}
                  disabled={(!videoFileSlot1 && !videoFileSlot2) || scanning}
                >
                  <Sparkles /> {scanning ? 'Mengekstrak...' : 'Ekstrak Data Video dari Galeri'} ({[videoFileSlot1, videoFileSlot2].filter(Boolean).length} Foto)
                </button>
              </div>
            )}

            {/* INSTANT SCANNING INDICATOR */}
            {scanning && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(184, 142, 57, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-gold-border)' }}>
                    <Sparkles style={{ width: 36, height: 36, color: 'var(--accent-gold)', animation: 'spin 2s linear infinite' }} />
                  </div>
                </div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: 6 }}>AI Vision Membaca Foto Screenshot Video...</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Mengekstrak GMV, produk terjual, klik & interaksi video secara instan.
                </p>
                <button 
                  className="btn btn-secondary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', margin: '0 auto' }}
                  onClick={() => { setModalType(null); showToast('⚡ Pemindaian AI Video berjalan di latar belakang...', 'info'); }}
                >
                  <PanelLeftClose style={{ width: 15, height: 15 }} /> Lanjutkan di Latar Belakang
                </button>
              </div>
            )}

            {/* SCAN RESULT CONFIRMATION FORM */}
            {scannedVideoPreview && !scanning && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ background: 'rgba(5, 150, 105, 0.08)', border: '1px solid rgba(5, 150, 105, 0.2)', padding: '12px 16px', borderRadius: 10, marginBottom: '1.25rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle style={{ width: 20, height: 20 }} />
                  <div>
                    <strong style={{ fontSize: '0.9rem', display: 'block' }}>Ekstraksi AI Video Berhasil!</strong>
                    <span style={{ fontSize: '0.775rem' }}>Data telah dibaca. Klik tombol simpan untuk menyimpan metrik ke database.</span>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Judul Video / Periode</label>
                    <input className="form-input" value={scannedVideoPreview.title} onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, title: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal (Pilih Kalender)</label>
                    <input 
                      className="form-input" 
                      type="date" 
                      value={parseDateToISO(scannedVideoPreview?.dateISO || scannedVideoPreview?.dateFormatted)} 
                      onChange={e => {
                        const newISO = e.target.value;
                        if (newISO) {
                          const [y, m, d] = newISO.split('-');
                          const formatted = `${d}-${m}-${y}`;
                          setScannedVideoPreview({ 
                            ...scannedVideoPreview, 
                            dateISO: newISO,
                            dateFormatted: formatted,
                            title: `Performa Video ${formatted}`
                          });
                        }
                      }} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Penjualan GMV (Rp)</label>
                    <input className="form-input" type="number" value={scannedVideoPreview.revenue} onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, revenue: parseInt(e.target.value) || 0 })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">💵 Estimasi Komisi (Rp)</label>
                    <input className="form-input" type="number" placeholder="Kosong (Silakan isi nominal komisi)" value={scannedVideoPreview.grossCommission ?? ''} onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, grossCommission: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Produk Terjual</label>
                    <input className="form-input" type="number" value={scannedVideoPreview.productsSold} onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, productsSold: parseInt(e.target.value) || 0 })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Penonton (Views)</label>
                    <input className="form-input" type="number" value={scannedVideoPreview.totalViews} onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, totalViews: parseInt(e.target.value) || 0 })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Suka (Likes)</label>
                    <input className="form-input" type="number" value={scannedVideoPreview.likes} onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, likes: parseInt(e.target.value) || 0 })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pesanan (Orders)</label>
                    <input className="form-input" type="number" value={scannedVideoPreview.totalOrders} onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, totalOrders: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} onClick={handleSaveScannedVideoSession}>
                  <Save /> Simpan Seluruh Metrik Video
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: INPUT MANUAL SHOPEE VIDEO */}
      {modalType === 'manual_video' && (
        <div className="modal-overlay active" onClick={() => setModalType(null)}>
          <div className="modal-card" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film style={{ color: 'var(--primary)' }} /> Input Manual Performa Shopee Video
              </h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveScannedVideoSession(); }}>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Masukkan data performa Shopee Video secara manual tanpa mengunggah foto screenshot.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Judul Video / Periode Laporan</label>
                  <input 
                    className="form-input" 
                    placeholder="Contoh: Performa Video Harian 08-08-2026" 
                    value={scannedVideoPreview?.title || ''} 
                    onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, title: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal (Pilih Kalender)</label>
                  <input 
                    className="form-input" 
                    type="date" 
                    value={parseDateToISO(scannedVideoPreview?.dateISO || scannedVideoPreview?.dateFormatted)} 
                    onChange={e => {
                      const newISO = e.target.value;
                      if (newISO) {
                        const [y, m, d] = newISO.split('-');
                        const formatted = `${d}-${m}-${y}`;
                        setScannedVideoPreview({ 
                          ...scannedVideoPreview, 
                          dateISO: newISO,
                          dateFormatted: formatted,
                          title: `Performa Video ${formatted}`
                        });
                      }
                    }} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Penjualan GMV (Rp)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Nominal GMV Rp" 
                    value={scannedVideoPreview?.revenue || ''} 
                    onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, revenue: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Estimasi Komisi Kotor (Rp)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Komisi Rp" 
                    value={scannedVideoPreview?.grossCommission || ''} 
                    onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, grossCommission: parseInt(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Penonton (Views)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Jumlah Views" 
                    value={scannedVideoPreview?.totalViews || ''} 
                    onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, totalViews: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Terjual / Orders</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Jumlah Order" 
                    value={scannedVideoPreview?.totalOrders || ''} 
                    onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, totalOrders: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Suka (Likes)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Jumlah Likes" 
                    value={scannedVideoPreview?.likes || ''} 
                    onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, likes: parseInt(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan / Ringkasan Performansi</label>
                <input 
                  className="form-input" 
                  placeholder="Contoh: Video promosi produk skincare harian" 
                  value={scannedVideoPreview?.aiSummary || ''} 
                  onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, aiSummary: e.target.value })} 
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem', padding: '12px' }}>
                <CheckCircle /> Simpan Data Shopee Video
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: INPUT MANUAL SHOPEE LIVE */}
      {modalType === 'manual_live' && (
        <div className="modal-overlay active" onClick={() => setModalType(null)}>
          <div className="modal-card" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video style={{ color: 'var(--primary)' }} /> Input Manual Sesi Shopee Live
              </h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveScannedSession(); }}>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Masukkan rincian metrik Sesi Shopee Live secara manual.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Judul Sesi Live</label>
                  <input 
                    className="form-input" 
                    placeholder="Contoh: Special Live Disc Up To 50%" 
                    value={scannedPreview?.title || ''} 
                    onChange={e => setScannedPreview({ ...scannedPreview, title: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal Sesi Live (Kalender)</label>
                  <input 
                    className="form-input" 
                    type="date" 
                    value={parseDateToISO(scannedPreview?.dateISO || scannedPreview?.dateFormatted || scannedPreview?.startTime)} 
                    onChange={e => {
                      const newISO = e.target.value;
                      if (newISO) {
                        const [y, m, d] = newISO.split('-');
                        const formatted = `${d}-${m}-${y}`;
                        const timePart = scannedPreview?.startTime?.split(' ')[1] || '20:00';
                        setScannedPreview({ 
                          ...scannedPreview, 
                          dateISO: newISO,
                          dateFormatted: formatted,
                          startTime: `${formatted} ${timePart}`,
                          title: `Sesi Live ${formatted}`
                        });
                      }
                    }} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Durasi Sesi</label>
                  <input 
                    className="form-input" 
                    placeholder="01:30:00" 
                    value={scannedPreview?.duration || ''} 
                    onChange={e => setScannedPreview({ ...scannedPreview, duration: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Penjualan GMV (Rp)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Jumlah GMV Rp" 
                    value={scannedPreview?.revenue || ''} 
                    onChange={e => setScannedPreview({ ...scannedPreview, revenue: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Komisi Kotor (Rp)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Nominal Komisi Rp" 
                    value={scannedPreview?.grossCommission || ''} 
                    onChange={e => setScannedPreview({ ...scannedPreview, grossCommission: parseInt(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Total Pesanan</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Order" 
                    value={scannedPreview?.totalOrders || ''} 
                    onChange={e => setScannedPreview({ ...scannedPreview, totalOrders: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Views</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Views" 
                    value={scannedPreview?.totalViews || ''} 
                    onChange={e => setScannedPreview({ ...scannedPreview, totalViews: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Penonton Aktif</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Orang" 
                    value={scannedPreview?.activeViewers || ''} 
                    onChange={e => setScannedPreview({ ...scannedPreview, activeViewers: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Masuk Keranjang</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Item" 
                    value={scannedPreview?.cartAdditions || ''} 
                    onChange={e => setScannedPreview({ ...scannedPreview, cartAdditions: parseInt(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem', padding: '12px' }}>
                <CheckCircle /> Simpan Sesi Live Shopee
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: EDIT VIDEO SESSION */}
      {modalType === 'editVideoSession' && editingVideoSession && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Edit3 style={{ color: 'var(--primary)' }} /> Edit Data Performa Video</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Judul Video / Periode</label>
                <input className="form-input" value={editingVideoSession.title} onChange={e => setEditingVideoSession({ ...editingVideoSession, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal (Pilih Kalender)</label>
                <input 
                  className="form-input" 
                  type="date" 
                  value={parseDateToISO(editingVideoSession?.dateISO || editingVideoSession?.dateFormatted)} 
                  onChange={e => {
                    const newISO = e.target.value;
                    if (newISO) {
                      const [y, m, d] = newISO.split('-');
                      const formatted = `${d}-${m}-${y}`;
                      setEditingVideoSession({ 
                        ...editingVideoSession, 
                        dateISO: newISO,
                        dateFormatted: formatted,
                        title: `Performa Video ${formatted}`
                      });
                    }
                  }} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Penjualan GMV (Rp)</label>
                <input className="form-input" type="number" value={editingVideoSession.revenue} onChange={e => setEditingVideoSession({ ...editingVideoSession, revenue: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--accent-gold)' }}>💵 Estimasi Komisi (Rp)</label>
                <input className="form-input" type="number" value={editingVideoSession.grossCommission || 0} onChange={e => setEditingVideoSession({ ...editingVideoSession, grossCommission: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label">Produk Terjual</label>
                <input className="form-input" type="number" value={editingVideoSession.productsSold} onChange={e => setEditingVideoSession({ ...editingVideoSession, productsSold: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label">Penonton</label>
                <input className="form-input" type="number" value={editingVideoSession.totalViews} onChange={e => setEditingVideoSession({ ...editingVideoSession, totalViews: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label">Likes</label>
                <input className="form-input" type="number" value={editingVideoSession.likes} onChange={e => setEditingVideoSession({ ...editingVideoSession, likes: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label">Pesanan</label>
                <input className="form-input" type="number" value={editingVideoSession.totalOrders} onChange={e => setEditingVideoSession({ ...editingVideoSession, totalOrders: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="form-group">
                <label className="form-label">Tingkat Konversi (%)</label>
                <input className="form-input" type="number" step="0.1" value={editingVideoSession.conversionRatePercent} onChange={e => setEditingVideoSession({ ...editingVideoSession, conversionRatePercent: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} onClick={handleSaveEditedVideoSession}>
              <Save /> Simpan Perubahan Data Video
            </button>
          </div>
        </div>
      )}

      {/* Modal: INPUT TRANSAKSI KEUANGAN (CAPEX / OPEX) */}
      {modalType === 'finance' && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><DollarSign style={{ color: 'var(--primary)' }} /> Input Transaksi Keuangan</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            <form onSubmit={handleAddFinancialItem}>
              
              {/* Type Switcher Toggle (CAPEX vs OPEX vs PERSONAL vs OTHER INCOME) */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className={`btn ${financialType === 'capex' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ flex: 1, minWidth: 100, justifyContent: 'center', fontSize: '0.8rem' }}
                  onClick={() => setFinancialType('capex')}
                >
                  📦 CAPEX (Aset)
                </button>
                <button 
                  type="button" 
                  className={`btn ${financialType === 'opex' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ flex: 1, minWidth: 100, justifyContent: 'center', fontSize: '0.8rem' }}
                  onClick={() => setFinancialType('opex')}
                >
                  ⚙️ OPEX (Operasional)
                </button>
                <button 
                  type="button" 
                  className={`btn ${financialType === 'personal' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ flex: 1, minWidth: 100, justifyContent: 'center', fontSize: '0.8rem' }}
                  onClick={() => { setFinancialType('personal'); if (!itemCategory) setItemCategory('Personal Purchase'); }}
                >
                  🛍️ Personal Purchase
                </button>
                <button 
                  type="button" 
                  className={`btn ${financialType === 'other_income' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ flex: 1, minWidth: 100, justifyContent: 'center', fontSize: '0.8rem' }}
                  onClick={() => { setFinancialType('other_income'); if (!itemCategory) setItemCategory('Bonus Target'); }}
                >
                  🎁 Bonus & Pendapatan Lain
                </button>
              </div>

              {/* Quick Category Suggestions */}
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Pilih Kategori Cepat:</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => { setFinancialType('other_income'); setItemCategory('Bonus Target'); }} style={{ background: financialType === 'other_income' ? 'rgba(5, 150, 105, 0.2)' : 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer' }}>
                    🎁 Bonus Target
                  </button>
                  <button type="button" onClick={() => { setFinancialType('other_income'); setItemCategory('Cashback Affiliate'); }} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer' }}>
                    💵 Cashback Affiliate
                  </button>
                  <button type="button" onClick={() => { setFinancialType('personal'); setItemCategory('Personal Purchase'); }} style={{ background: financialType === 'personal' ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer' }}>
                    🛍️ Personal Purchase
                  </button>
                  <button type="button" onClick={() => setItemCategory('Alat Studio')} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer' }}>
                    📦 Alat Studio
                  </button>
                  <button type="button" onClick={() => setItemCategory('Gaji Host')} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer' }}>
                    👥 Gaji Host
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nama Transaksi / Item</label>
                <input 
                  className="form-input" 
                  placeholder={financialType === 'capex' ? "Contoh: Kamera Sony A6400, Meja Live Streaming" : "Contoh: Gaji Host Amanda, Biaya Internet Biznet"} 
                  value={itemName} 
                  onChange={e => setItemName(e.target.value)} 
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <input 
                    className="form-input" 
                    placeholder="Contoh: Alat, Gaji, Sewa, Listrik" 
                    value={itemCategory} 
                    onChange={e => setItemCategory(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah Nominal (Rp)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    placeholder="Jumlah Rp" 
                    value={itemAmount} 
                    onChange={e => setItemAmount(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Tanggal Transaksi</label>
                  <input 
                    className="form-input" 
                    type="date" 
                    value={itemDate} 
                    onChange={e => setItemDate(e.target.value)} 
                  />
                </div>
                
                {financialType === 'opex' && (
                  <div className="form-group">
                    <label className="form-label">Frekuensi Biaya</label>
                    <select 
                      className="form-select" 
                      value={opexFrequency} 
                      onChange={e => setOpexFrequency(e.target.value)}
                    >
                      <option value="Once">Sekali Pengeluaran</option>
                      <option value="Monthly">Bulanan (Monthly)</option>
                      <option value="Yearly">Tahunan (Yearly)</option>
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem', padding: '12px' }}>
                <CheckCircle /> Simpan Transaksi Keuangan
              </button>

            </form>
          </div>
        </div>
      )}

      {/* Modal: EDIT TRANSAKSI KEUANGAN */}
      {modalType === 'edit_finance' && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Edit3 style={{ color: 'var(--primary)' }} /> Edit Transaksi Keuangan</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            <form onSubmit={handleSaveEditFinancialItem}>
              
              {/* Type Switcher Toggle (CAPEX vs OPEX vs PERSONAL vs OTHER INCOME) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 6, display: 'block' }}>Pindahkan Tipe Transaksi Ke:</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className={`btn ${financialType === 'capex' ? 'btn-primary' : 'btn-secondary'}`} 
                    style={{ flex: 1, minWidth: 100, justifyContent: 'center', fontSize: '0.8rem' }}
                    onClick={() => setFinancialType('capex')}
                  >
                    📦 CAPEX (Aset)
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${financialType === 'opex' ? 'btn-primary' : 'btn-secondary'}`} 
                    style={{ flex: 1, minWidth: 100, justifyContent: 'center', fontSize: '0.8rem' }}
                    onClick={() => setFinancialType('opex')}
                  >
                    ⚙️ OPEX (Operasional)
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${financialType === 'personal' ? 'btn-primary' : 'btn-secondary'}`} 
                    style={{ flex: 1, minWidth: 100, justifyContent: 'center', fontSize: '0.8rem' }}
                    onClick={() => { setFinancialType('personal'); if (!itemCategory || itemCategory === "Umum") setItemCategory('Personal Purchase'); }}
                  >
                    🛍️ Personal Purchase
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${financialType === 'other_income' ? 'btn-primary' : 'btn-secondary'}`} 
                    style={{ flex: 1, minWidth: 100, justifyContent: 'center', fontSize: '0.8rem' }}
                    onClick={() => { setFinancialType('other_income'); if (!itemCategory || itemCategory === "Umum") setItemCategory('Bonus Target'); }}
                  >
                    🎁 Bonus & Pendapatan Lain
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nama Transaksi / Item</label>
                <input 
                  className="form-input" 
                  value={itemName} 
                  onChange={e => setItemName(e.target.value)} 
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <input 
                    className="form-input" 
                    value={itemCategory} 
                    onChange={e => setItemCategory(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah Nominal (Rp)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    value={itemAmount} 
                    onChange={e => setItemAmount(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Tanggal Transaksi</label>
                  <input 
                    className="form-input" 
                    type="date" 
                    value={itemDate} 
                    onChange={e => setItemDate(e.target.value)} 
                  />
                </div>
                
                {financialType === 'opex' && (
                  <div className="form-group">
                    <label className="form-label">Frekuensi Biaya</label>
                    <select 
                      className="form-select" 
                      value={opexFrequency} 
                      onChange={e => setOpexFrequency(e.target.value)}
                    >
                      <option value="Once">Sekali Pengeluaran</option>
                      <option value="Monthly">Bulanan (Monthly)</option>
                      <option value="Yearly">Tahunan (Yearly)</option>
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem', padding: '12px' }}>
                <CheckCircle /> Perbarui Transaksi Keuangan
              </button>

            </form>
          </div>
        </div>
      )}

      {/* SAFETY CONFIRMATION MODAL: CLEAR ALL LIVE SESSIONS */}
      {modalType === 'confirm_clear_live' && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="glass-card modal-content" style={{ maxWidth: 440, padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(211,47,47,0.1)', color: '#D32F2F', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <Trash2 style={{ width: 28, height: 28 }} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>Hapus Seluruh Data Shopee Live?</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Apakah Anda yakin ingin menghapus seluruh data <strong>({sessions.length} sesi)</strong> Shopee Live yang terekam? Data yang dihapus tidak dapat dikembalikan.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalType(null)}>
                  Batal
                </button>
                <button className="btn" style={{ flex: 1, background: '#D32F2F', color: '#fff', border: 'none', fontWeight: 700 }} onClick={() => { setStudioData(prev => ({ ...prev, shopeeSessions: [] })); setModalType(null); showToast('Seluruh data sesi live berhasil dibersihkan'); }}>
                  Ya, Hapus Semua
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAFETY CONFIRMATION MODAL: CLEAR ALL VIDEO SESSIONS */}
      {modalType === 'confirm_clear_video' && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="glass-card modal-content" style={{ maxWidth: 440, padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(211,47,47,0.1)', color: '#D32F2F', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <Trash2 style={{ width: 28, height: 28 }} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>Hapus Seluruh Data Shopee Video?</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Apakah Anda yakin ingin menghapus seluruh data <strong>({videoSessions.length} performa)</strong> Shopee Video yang terekam? Data yang dihapus tidak dapat dikembalikan.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalType(null)}>
                  Batal
                </button>
                <button className="btn" style={{ flex: 1, background: '#D32F2F', color: '#fff', border: 'none', fontWeight: 700 }} onClick={() => { setStudioData(prev => ({ ...prev, shopeeVideoSessions: [] })); setModalType(null); showToast('Seluruh data sesi video berhasil dibersihkan'); }}>
                  Ya, Hapus Semua
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: CLOUD SYNC & DEVICE TRANSFER INFO */}
      {modalType === 'sync_info' && (
        <div className="modal-overlay active" onClick={() => setModalType(null)}>
          <div className="modal-card" style={{ maxWidth: 520, padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
                <CloudOff style={{ color: 'var(--accent-gold)' }} /> Informasi Sinkronisasi Cloud & Device Baru
              </h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
              <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', padding: '12px 14px', borderRadius: 10, marginBottom: '1.25rem' }}>
                <strong style={{ color: '#b45309', display: 'block', marginBottom: 4 }}>Status Sinkronisasi Saat Ini: Offline / Lokal</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Data di perangkat ini aman tersimpan di browser lokal Anda. Karena proyek Google Cloud Firebase lama sedang mengalami pembatasan, sinkronisasi cloud otomatis belum terhubung ke database cloud aktif.
                </span>
              </div>

              <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                📱 Cara Memindahkan Data ke Device / HP Baru Ini:
              </h4>
              <ol style={{ paddingLeft: '1.25rem', marginBottom: '1.5rem', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)' }}>
                <li>Buka website ini di <strong>HP / Laptop Lama Anda</strong> (tempat data disimpan sebelumnya).</li>
                <li>Masuk ke tab <strong>Manajemen Admin</strong> di menu sidebar kiri.</li>
                <li>Scroll ke kartu Backup lalu klik <strong>💾 Cadangkan Seluruh Data (.json)</strong>.</li>
                <li>Kirim file <code>.json</code> tersebut ke HP baru ini (via WhatsApp / Email / Drive).</li>
                <li>Di <strong>HP Baru ini</strong>, buka tab <strong>Manajemen Admin</strong> &rarr; Klik <strong>📥 Pulihkan Data dari Backup (.json)</strong> dan pilih file tadi. Seluruh data akan langsung muncul 100%!</li>
              </ol>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} onClick={() => setModalType(null)}>
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div 
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            borderRadius: 12,
            background: toast.type === 'error' ? '#D32F2F' : 'var(--primary)',
            color: toast.type === 'error' ? '#ffffff' : (theme === 'dark' ? '#09110F' : '#ffffff'),
            fontWeight: 700,
            fontSize: '0.85rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
            animation: 'slideUpToast 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {toast.type === 'error' ? <WifiOff style={{ width: 16, height: 16 }} /> : <CheckCircle2 style={{ width: 16, height: 16 }} />}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
