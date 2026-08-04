import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, Video, Briefcase, Calendar, Globe, 
  Camera, Sparkles, TrendingUp, PieChart, PlusCircle, 
  CheckCircle, Save, Menu, Lock, LogOut, Eye, EyeOff, Trash2,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ImagePlus, Edit3, UserCheck, UserPlus, ExternalLink, ArrowRight,
  Leaf, Compass, Monitor, Cloud, CloudOff, Loader2, PanelLeftClose, Film, DollarSign, CheckCircle2, WifiOff
} from 'lucide-react';

import { INITIAL_STUDIO_DATA } from './data/sampleData';
import { analyzeShopeeScreenshots, analyzeShopeeVideoScreenshots } from './services/geminiService';
import { uploadScreenshotToFirebase, saveSessionToFirebase, fetchSessionsFromFirebase, storage as firebaseStorage, saveStudioDataToFirestore, loadStudioDataFromFirestore, subscribeToStudioData, isFirebaseConfigured } from './services/firebaseService';
import { remoteLog } from './services/remoteLogger';

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
  
  const [studioData, setStudioData] = useState(() => {
    const saved = localStorage.getItem("paramara_studio_admin_data_v2");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_STUDIO_DATA;
  });
  
  // Secure Gemini API Key
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || "";
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

  // 1. On mount: Load from Firestore (if configured), then subscribe to real-time updates
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setCloudSyncStatus('offline');
      isInitialLoad.current = false;
      remoteLog.warn('Firebase not configured — running in Local Only mode');
      return;
    }

    let unsubscribe = null;
    let isMounted = true;

    async function initFirestoreSync() {
      setCloudSyncStatus('syncing');

      try {
        // Race between Firestore load and a 5-second timeout
        const cloudData = await Promise.race([
          loadStudioDataFromFirestore(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);

        if (!isMounted) return;

        if (cloudData) {
          isRemoteUpdate.current = true;
          setStudioData(prev => ({
            ...prev,
            ...cloudData,
            shopeeSessions: cloudData.shopeeSessions || prev.shopeeSessions || [],
            shopeeVideoSessions: cloudData.shopeeVideoSessions || prev.shopeeVideoSessions || [],
            clientProjects: cloudData.clientProjects || prev.clientProjects || [],
            liveSchedules: cloudData.liveSchedules || prev.liveSchedules || [],
            capexList: cloudData.capexList || prev.capexList || [],
            opexList: cloudData.opexList || prev.opexList || [],
            adminUsers: cloudData.adminUsers || prev.adminUsers || [],
          }));
          setCloudSyncStatus('synced');
          remoteLog.info('Firestore initial sync: loaded cloud data', { sessions: (cloudData.shopeeSessions||[]).length, videos: (cloudData.shopeeVideoSessions||[]).length });
        } else {
          // No cloud data yet — push current localStorage data to Firestore
          const localData = JSON.parse(localStorage.getItem("paramara_studio_admin_data_v2") || "null");
          if (localData) {
            lastSaveTimestamp.current = Date.now();
            await saveStudioDataToFirestore(localData);
          }
          if (isMounted) setCloudSyncStatus('synced');
        }
      } catch (err) {
        remoteLog.error('Firestore init sync failed', { error: err.message });
        if (isMounted) setCloudSyncStatus('offline');
      }

      isInitialLoad.current = false;

      // Subscribe to real-time updates from other devices
      unsubscribe = subscribeToStudioData((remoteData) => {
        if (!isMounted || !remoteData) return;

        // Skip if this snapshot is an echo of our own save (within 3 seconds)
        if (lastSaveTimestamp.current && (Date.now() - lastSaveTimestamp.current) < 3000) {
          return;
        }

        isRemoteUpdate.current = true;
        setStudioData(prev => ({
          ...prev,
          ...remoteData,
          shopeeSessions: remoteData.shopeeSessions || prev.shopeeSessions || [],
          shopeeVideoSessions: remoteData.shopeeVideoSessions || prev.shopeeVideoSessions || [],
          clientProjects: remoteData.clientProjects || prev.clientProjects || [],
          liveSchedules: remoteData.liveSchedules || prev.liveSchedules || [],
          capexList: remoteData.capexList || prev.capexList || [],
          opexList: remoteData.opexList || prev.opexList || [],
          adminUsers: remoteData.adminUsers || prev.adminUsers || [],
        }));
        setCloudSyncStatus('synced');
      });
    }

    initFirestoreSync();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. Save Studio Data to localStorage AND Firestore (debounced) on every change
  useEffect(() => {
    // Always save to localStorage instantly
    localStorage.setItem("paramara_studio_admin_data_v2", JSON.stringify(studioData));

    // Skip Firestore save if this update came from a remote snapshot (prevents infinite loop)
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    // Skip Firestore save during initial load
    if (isInitialLoad.current) return;

    // Debounced save to Firestore (1 second)
    if (!isFirebaseConfigured) return;

    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }

    setCloudSyncStatus('syncing');
    saveDebounceTimer.current = setTimeout(async () => {
      lastSaveTimestamp.current = Date.now();
      const success = await saveStudioDataToFirestore(studioData);
      setCloudSyncStatus(success ? 'synced' : 'offline');
      if (!success) remoteLog.error('Firestore debounced save failed');
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
      alert("Seluruh data sesi berhasil dibersihkan!");
    }
  };

  // Derived Calculations
  const sessions = studioData.shopeeSessions || [];
  const videoSessions = studioData.shopeeVideoSessions || [];
  const capexList = studioData.capexList || [];
  const opexList = studioData.opexList || [];
  const projects = studioData.clientProjects || [];
  const adminUsers = studioData.adminUsers || INITIAL_STUDIO_DATA.adminUsers;

  // Revenue
  const totalShopeeRev = sessions.reduce((acc, s) => acc + (s.revenue || 0), 0);
  const totalGrossCommission = sessions.reduce((acc, s) => acc + (s.grossCommission || 0), 0);
  
  const totalVideoRev = videoSessions.reduce((acc, v) => acc + (v.revenue || 0), 0);
  const totalGrossVideoCommission = videoSessions.reduce((acc, v) => acc + (v.grossCommission || Math.round((v.revenue || 0) * 0.1)), 0);

  const totalProjectRev = projects.reduce((acc, p) => acc + (p.budget || 0), 0);

  // Total GMV / Transaction Volume (Shopee Live + Shopee Video)
  const totalCombinedGMV = totalShopeeRev + totalVideoRev;

  // Actual Studio Gross Revenue (Live Comm + Video Comm + Project Income)
  const totalStudioGrossRevenue = totalGrossCommission + totalGrossVideoCommission + totalProjectRev;

  // Expenses
  const totalCapex = capexList.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalOpex = opexList.reduce((acc, o) => acc + (o.amount || 0), 0);
  const totalExpenses = totalCapex + totalOpex;

  // Profitability
  const netProfit = totalStudioGrossRevenue - totalExpenses;
  const netProfitMarginPercent = totalStudioGrossRevenue > 0 ? (netProfit / totalStudioGrossRevenue) * 100 : 0;

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
    alert("Akun Admin berhasil ditambahkan!");
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
    alert("Data profil admin berhasil diperbarui!");
  };

  // INSTANT AI Vision Scanning Handler (NO SLOW CLOUD WAITING)
  const handleDualAnalysis = async () => {
    const filesToProcess = [fileSlot1, fileSlot2].filter(Boolean);
    if (filesToProcess.length === 0) {
      alert("Mohon pilih minimal 1 foto screenshot!");
      return;
    }

    setScanning(true);
    remoteLog.info('AI Scan started (Shopee Live)', { fileCount: filesToProcess.length });

    try {
      // Analyze INSTANTLY with Gemini Vision AI using in-memory Base64
      const result = await analyzeShopeeScreenshots(filesToProcess, apiKey);
      if (!result.grossCommission) {
        result.grossCommission = Math.round((result.revenue || 0) * 0.1);
      }

      setScannedPreview(result);
      remoteLog.info('AI Scan success (Shopee Live)', { revenue: result.revenue, orders: result.orders });
    } catch (err) {
      alert("Gagal membaca screenshot: " + err.message);
      remoteLog.error('AI Scan failed (Shopee Live)', { error: err.message });
    } finally {
      setScanning(false);
    }
  };

  // Save Session & Asynchronously Upload to Firebase in background
  const handleSaveScannedSession = async () => {
    if (!scannedPreview) return;

    const sessionToSave = { ...scannedPreview };

    // 1. Immediately Save to Local State so UI updates instantly!
    setStudioData(prev => ({
      ...prev,
      shopeeSessions: [sessionToSave, ...prev.shopeeSessions]
    }));

    setScannedPreview(null);
    setFileSlot1(null);
    setFileSlot2(null);
    setPreviewUrl1(null);
    setPreviewUrl2(null);
    setModalType(null);

    alert("✅ Metrik & Komisi Kotor Berhasil Disimpan!");
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
    alert("Perubahan data sesi berhasil disimpan!");
  };

  // Shopee Video Analysis
  const handleVideoDualAnalysis = async () => {
    const filesToProcess = [videoFileSlot1, videoFileSlot2].filter(Boolean);
    if (filesToProcess.length === 0) {
      alert("Mohon pilih minimal 1 foto screenshot!");
      return;
    }

    setScanning(true);

    try {
      const result = await analyzeShopeeVideoScreenshots(filesToProcess, apiKey);
      if (!result.grossCommission) {
        result.grossCommission = Math.round((result.revenue || 0) * 0.1);
      }
      setScannedVideoPreview(result);
    } catch (err) {
      alert("Gagal membaca screenshot video: " + err.message);
    } finally {
      setScanning(false);
    }
  };

  // Save Video Session
  const handleSaveScannedVideoSession = async () => {
    if (!scannedVideoPreview) return;

    const videoToSave = { ...scannedVideoPreview };

    setStudioData(prev => ({
      ...prev,
      shopeeVideoSessions: [videoToSave, ...(prev.shopeeVideoSessions || [])]
    }));

    setScannedVideoPreview(null);
    setVideoFileSlot1(null);
    setVideoFileSlot2(null);
    setVideoPreviewUrl1(null);
    setVideoPreviewUrl2(null);
    setModalType(null);

    alert("✅ Metrik & Pendapatan Video Berhasil Disimpan!");

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

  const handleSaveEditedVideoSession = () => {
    if (!editingVideoSession) return;
    setStudioData(prev => ({
      ...prev,
      shopeeVideoSessions: (prev.shopeeVideoSessions || []).map(v => v.id === editingVideoSession.id ? editingVideoSession : v)
    }));
    setEditingVideoSession(null);
    setModalType(null);
    alert("Perubahan data video berhasil disimpan!");
  };

  const handleClearAllVideoSessions = () => {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh data Shopee Video?")) {
      setStudioData(prev => ({ ...prev, shopeeVideoSessions: [] }));
      alert("Seluruh data Shopee Video berhasil dibersihkan!");
    }
  };

  // Financial Items Add & Delete
  const handleAddFinancialItem = (e) => {
    e.preventDefault();
    if (!itemName || !itemAmount) {
      alert("Nama Item dan Jumlah harus diisi!");
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
    alert("Transaksi keuangan berhasil ditambahkan!");
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

  // =========================================================================
  // VIEW MODE 1: PUBLIC OFFICIAL HOMEPAGE (URL: /)
  // =========================================================================
  if (viewMode === 'public') {
    return (
      <div style={{ background: '#F4F8F6', minHeight: '100vh', color: 'var(--text-main)' }}>
        
        {/* PUBLIC TOP NAVIGATION BAR */}
        <header style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-color)', 
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
                <a href="#ventures" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Layanan & Venture</a>
                <a href="#shopee" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Shopee Live & Video</a>
                <a href="#lestari" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Lestari Edu-Tech</a>
                <a href="#ijustfound" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>I Just Found This!</a>
              </nav>

              {isAuthenticated ? (
                <button className="btn btn-primary btn-sm" onClick={() => setViewMode('admin')}>
                  <Monitor style={{ width: 14, height: 14 }} /> Admin Portal
                </button>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => { setViewMode('admin'); setShowLoginModal(true); }}>
                  <Lock style={{ width: 14, height: 14 }} /> Portal Admin Login
                </button>
              )}
            </div>

          </div>
        </header>

        {/* HERO SECTION */}
        <section className="public-hero-section" style={{ padding: '4rem 1.5rem 3rem', textAlign: 'center', maxWidth: 960, margin: '0 auto' }}>
          <div className="brand-badge" style={{ marginBottom: '1rem', padding: '6px 14px', fontSize: '0.75rem', display: 'inline-flex' }}>
            <Sparkles style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 6 }} /> Official Venture Ecosystem
          </div>
          <h1 className="public-hero-title" style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.25, marginBottom: '1rem', letterSpacing: '-0.03em' }}>
            Driving High-Converting Live Commerce, Cultural Edu-Tech & International Media Engines.
          </h1>
          <p className="public-hero-desc" style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem', maxWidth: 780, margin: '0 auto 2rem' }}>
            <strong>Paramara Studio</strong> is a digital venture builder overseeing specialized media and technology operations: Shopee Live & Video Commerce management, the Lestari traditional dance edu-tech platform, and viral US-market product discovery engines.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
            <a href="#ventures" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
              Jelajahi Venture & Portfolio <ArrowRight style={{ width: 16, height: 16 }} />
            </a>
            {isAuthenticated ? (
              <button className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '0.9rem' }} onClick={() => setViewMode('admin')}>
                <Monitor style={{ width: 16, height: 16 }} /> Buka Portal Admin Studio
              </button>
            ) : (
              <button className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '0.9rem' }} onClick={() => { setViewMode('admin'); setShowLoginModal(true); }}>
                <Lock style={{ width: 16, height: 16 }} /> Portal Admin Login
              </button>
            )}
          </div>
        </section>

        {/* VENTURES GRID SECTION */}
        <section id="ventures" style={{ maxWidth: 1140, margin: '0 auto', padding: '1.5rem 1.25rem 5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>Tiga Pilar Utama Paramara Studio</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Operasi bisnis, edutech kebudayaan, dan jaringan media afiliasi internasional.</p>
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
                  Layanan manajemen live streaming e-commerce serta optimasi konten Shopee Video secara profesional. Menyediakan host berbakat, setup penyiaran konversi tinggi, produksi video promosi kreatif, dan analitik optimasi performa penjualan.
                </p>
                
                <div style={{ background: '#F8FAF9', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                  <strong>⭐ Layanan & Fitur Utama:</strong><br/>
                  <span style={{ color: 'var(--secondary-emerald)', fontWeight: 700 }}>• Penyiaran Host Live Streamer Profesional</span><br/>
                  <span>• Produksi & Optimasi Konten Shopee Video</span><br/>
                  <span>• Analitik Penjualan & Optimasi Konversi</span>
                </div>
              </div>

              {isAuthenticated ? (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setViewMode('admin'); setActiveTab('tabShopeeTracker'); }}>
                  Buka Portal Admin Tracker <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              ) : (
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setViewMode('admin'); setShowLoginModal(true); }}>
                  <Lock style={{ width: 15, height: 15 }} /> Login Admin Portal
                </button>
              )}
            </div>

            {/* PILLAR 2: LESTARI EDU-TECH */}
            <div className="glass-card" id="lestari" style={{ padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid var(--secondary-emerald)' }}>
              <div>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(5, 150, 105, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--secondary-emerald)' }}>
                  <Leaf style={{ width: 24, height: 24 }} />
                </div>
                <span className="brand-badge" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', borderColor: 'rgba(5, 150, 105, 0.3)', marginBottom: 8 }}>
                  Edu-Tech Tari Tradisional Pertama di Indonesia
                </span>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Lestarikan Tari Tradisional, Lebih Terarah & Interaktif</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  <strong>Lestari</strong> adalah platform pendamping belajar tari tradisional nusantara yang menghubungkan kurikulum terstruktur dengan koreksi presisi langsung dari guru ahli.
                </p>

                <div style={{ background: '#F8FAF9', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                  <strong>💃 Fitur & Ekosistem Lestari:</strong><br/>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>• Kurikulum Belajar Tari Nusantara Terstruktur</span><br/>
                  <span>• Umpan Balik & Koreksi Presisi Guru Ahli</span><br/>
                  <span>• Platform Aplikasi Live: lestari-app.vercel.app</span>
                </div>
              </div>

              <a href="https://lestari-app.vercel.app/" target="_blank" rel="noreferrer" className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }}>
                Kunjungi Platform Lestari App <ExternalLink style={{ width: 16, height: 16 }} />
              </a>
            </div>

            {/* PILLAR 3: I JUST FOUND THIS! */}
            <div className="glass-card" id="ijustfound" style={{ padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid var(--accent-gold)' }}>
              <div>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(184, 142, 57, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-gold)' }}>
                  <Compass style={{ width: 24, height: 24 }} />
                </div>
                <span className="brand-badge" style={{ marginBottom: 8 }}>US Consumer Market & Media Hub</span>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>I Just Found This! (US Market)</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Kanal kurasi produk viral dan media afiliasi Amazon yang ditargetkan secara khusus untuk pasar Amerika Serikat (US Market) melalui Pinterest & media sosial.
                </p>

                <div style={{ background: '#F8FAF9', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                  <strong>🇺🇸 Channel Profile & Niche:</strong><br/>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>• Account: @productijustfound</span><br/>
                  <span>• Bio: Amazon Finds | Everything You Need!</span><br/>
                  <span>• Target Audience: United States (US) Market</span>
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
                📌 Pinterest @productijustfound <ExternalLink style={{ width: 15, height: 15, flexShrink: 0, marginLeft: 4 }} />
              </a>
            </div>

          </div>
        </section>

        {/* PUBLIC FOOTER */}
        <footer style={{ background: '#FFFFFF', borderTop: '1px solid var(--border-color)', padding: '2rem 1.25rem', textAlign: 'center' }}>
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
              <input type="text" className="form-input" placeholder="abdumalikh" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
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
            <button className={`tab-btn ${activeTab === 'tabShopeeTracker' ? 'active' : ''}`} onClick={() => { setActiveTab('tabShopeeTracker'); setSidebarOpen(false); }}>
              <Video /> Shopee Live Tracker
            </button>
            <button className={`tab-btn ${activeTab === 'tabShopeeVideo' ? 'active' : ''}`} onClick={() => { setActiveTab('tabShopeeVideo'); setSidebarOpen(false); }}>
              <Film /> Shopee Video Tracker
            </button>
            <button className={`tab-btn ${activeTab === 'tabFinance' ? 'active' : ''}`} onClick={() => { setActiveTab('tabFinance'); setSidebarOpen(false); }}>
              <DollarSign /> Keuangan (CAPEX/OPEX)
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
          <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: '#D32F2F' }} onClick={handleLogout}>
            <LogOut style={{ width: 14, height: 14 }} /> Keluar / Logout
          </button>
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
              <h2>Executive Dashboard & Studio Operations</h2>
              <p>Selamat datang kembali, <strong>Malikh</strong>! Ikhtisar aktivitas Paramara Studio.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Cloud Sync Status Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 600, padding: '5px 10px', borderRadius: 8, background: cloudSyncStatus === 'synced' ? 'rgba(5, 150, 105, 0.1)' : cloudSyncStatus === 'syncing' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(156, 163, 175, 0.15)', color: cloudSyncStatus === 'synced' ? '#059669' : cloudSyncStatus === 'syncing' ? '#b45309' : '#6b7280', border: `1px solid ${cloudSyncStatus === 'synced' ? 'rgba(5,150,105,0.25)' : cloudSyncStatus === 'syncing' ? 'rgba(234,179,8,0.25)' : 'rgba(156,163,175,0.25)'}` }}>
              {cloudSyncStatus === 'synced' && <><Cloud style={{ width: 13, height: 13 }} /> Synced</>}
              {cloudSyncStatus === 'syncing' && <><Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> Syncing...</>}
              {cloudSyncStatus === 'offline' && <><CloudOff style={{ width: 13, height: 13 }} /> Local Only</>}
              {cloudSyncStatus === 'idle' && <><Cloud style={{ width: 13, height: 13 }} /> ...</>}
            </div>

            <button className="btn btn-secondary" onClick={() => setViewMode('public')}>
              <Globe /> Homepage
            </button>
            
            {/* CONTEXTUAL ACTION BUTTONS */}
            {activeTab === 'tabShopeeTracker' && (
              <button className="btn btn-primary" onClick={() => { setFileSlot1(null); setFileSlot2(null); setPreviewUrl1(null); setPreviewUrl2(null); setScannedPreview(null); setModalType('scan'); }}>
                <Camera /> Input Shopee Live (2 Foto)
              </button>
            )}

            {activeTab === 'tabShopeeVideo' && (
              <button className="btn btn-primary" onClick={() => { setVideoFileSlot1(null); setVideoFileSlot2(null); setVideoPreviewUrl1(null); setVideoPreviewUrl2(null); setScannedVideoPreview(null); setModalType('scan_video'); }}>
                <Film /> Input Shopee Video (2 Foto)
              </button>
            )}

            {activeTab === 'tabFinance' && (
              <button className="btn btn-primary" onClick={() => { setItemName(""); setItemCategory(""); setItemAmount(""); setItemDate(""); setOpexFrequency("Once"); setFinancialType("capex"); setModalType('finance'); }}>
                <PlusCircle /> Tambah Transaksi Keuangan
              </button>
            )}

            {activeTab === 'tabProjects' && (
              <button className="btn btn-primary" onClick={() => setModalType('project')}>
                <PlusCircle /> Input Proyek Baru
              </button>
            )}

            {activeTab === 'tabSchedules' && (
              <button className="btn btn-primary" onClick={() => setModalType('schedule')}>
                <PlusCircle /> Input Jadwal Baru
              </button>
            )}

            {activeTab === 'tabAdminUsers' && (
              <button className="btn btn-primary" onClick={() => setModalType('addAdmin')}>
                <UserPlus /> Tambah Admin Baru
              </button>
            )}

            {activeTab === 'tabAnalytics' && (
              <button className="btn btn-primary" onClick={() => { setActiveTab('tabShopeeTracker'); setFileSlot1(null); setFileSlot2(null); setPreviewUrl1(null); setPreviewUrl2(null); setScannedPreview(null); setModalType('scan'); }}>
                <Camera /> Input Shopee Live (2 Foto)
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Executive Dashboard */}
        {activeTab === 'tabAnalytics' && (
          <div className="tab-content">
            
            {/* 4 Premium Executive KPI Cards */}
            <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="glass-card kpi-card" style={{ '--kpi-accent': netProfit >= 0 ? '#059669' : '#D32F2F' }}>
                <div className="kpi-title">Laba Bersih (Net Profit)</div>
                <div className="kpi-value" style={{ color: netProfit >= 0 ? '#059669' : '#D32F2F', fontWeight: 800 }}>
                  Rp {netProfit.toLocaleString('id-ID')}
                </div>
                <div className="kpi-subtext">Margin Bersih: {netProfitMarginPercent.toFixed(1)}%</div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': 'var(--primary)' }}>
                <div className="kpi-title">Pendapatan Kotor Studio</div>
                <div className="kpi-value text-success">
                  Rp {totalStudioGrossRevenue.toLocaleString('id-ID')}
                </div>
                <div className="kpi-subtext">Komisi Live/Video + Proyek</div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': '#B88E39' }}>
                <div className="kpi-title">Total Pengeluaran</div>
                <div className="kpi-value text-warning">
                  Rp {totalExpenses.toLocaleString('id-ID')}
                </div>
                <div className="kpi-subtext">CAPEX: Rp {totalCapex.toLocaleString('id-ID')} | OPEX: Rp {totalOpex.toLocaleString('id-ID')}</div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': '#082F26' }}>
                <div className="kpi-title">Total E-Commerce GMV</div>
                <div className="kpi-value">
                  Rp {totalCombinedGMV.toLocaleString('id-ID')}
                </div>
                <div className="kpi-subtext">Volume Penjualan Live + Video</div>
              </div>
            </div>

            {/* DYNAMIC EXECUTIVE INSIGHT CARD */}
            <div className="glass-card ai-summary-card" style={{ marginBottom: '1.5rem' }}>
              <div className="ai-badge"><Sparkles style={{ width: 14, height: 14 }} /> AI Executive Insight</div>
              <div className="ai-summary-text">
                {sessions.length > 0 || videoSessions.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <strong>Sesi Live Terbaru:</strong><br/>
                      {sessions.length > 0 ? (
                        <span>{sessions[0].aiSummary || `Sesi live berdurasi ${sessions[0].duration || '00:00:00'} menghasilkan Rp${(sessions[0].revenue || 0).toLocaleString('id-ID')} dengan Komisi Kotor Rp${(sessions[0].grossCommission || 0).toLocaleString('id-ID')}.`}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>Belum ada data live stream terbaru.</span>
                      )}
                    </div>
                    <div>
                      <strong>Analisis Video Terbaru:</strong><br/>
                      {videoSessions.length > 0 ? (
                        <span>{videoSessions[0].aiSummary || `Performa Video menghasilkan Rp${(videoSessions[0].revenue || 0).toLocaleString('id-ID')} GMV dari ${(videoSessions[0].productsSold || 0)} produk terjual.`}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>Belum ada data performa video terbaru.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  "Belum ada data sesi Shopee Live atau Shopee Video. Silakan klik tombol Input di atas untuk mengunggah screenshot HP laporan Anda."
                )}
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
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F8FAF9', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
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
                      <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F8FAF9', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem' }}>{v.title}</strong>
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: 2 }}>
                            📈 {v.productsSold} Produk Terjual | 💵 Komisi: <strong className="text-warning">Rp {(v.grossCommission || Math.round((v.revenue || 0) * 0.1)).toLocaleString('id-ID')}</strong>
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
        {activeTab === 'tabShopeeTracker' && (
          <div className="tab-content">
            {sessions.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {sessions.length} sesi live terekam
                </p>
                <button className="btn btn-sm btn-secondary" style={{ color: '#D32F2F' }} onClick={handleClearAllSessions}>
                  <Trash2 style={{ width: 14, height: 14 }} /> Bersihkan Seluruh Sesi
                </button>
              </div>
            )}

            {/* EXPANDABLE EXECUTIVE SESSION CARDS OR CLEAN ZERO STATE */}
            {sessions.length > 0 ? (
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
                            {s.screenshotUrlTop && (
                              <a href={s.screenshotUrlTop} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary-emerald)', textDecoration: 'none', fontWeight: 600 }}>
                                🔥 Firebase Cloud Screenshot 1 ↗
                              </a>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => setExpandedSessionId(isExpanded ? null : s.id)}>
                            {isExpanded ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}
                            {isExpanded ? "Tutup Detail" : "Lihat Metrik & Produk"}
                          </button>
                          
                          {/* EDIT BUTTON */}
                          <button className="btn btn-sm btn-secondary" style={{ color: 'var(--primary)' }} onClick={() => { setEditingSession(s); setModalType('editSession'); }}>
                            <Edit3 style={{ width: 14, height: 14 }} /> Edit Data
                          </button>

                          <button className="btn btn-sm btn-secondary" style={{ color: '#D32F2F' }} onClick={() => {
                            setStudioData(prev => ({ ...prev, shopeeSessions: prev.shopeeSessions.filter(item => item.id !== s.id) }));
                          }}>
                            <Trash2 style={{ width: 14, height: 14 }} /> Hapus
                          </button>
                        </div>
                      </div>

                      {/* DIRECT VISIBLE METRICS GRID */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                        gap: '0.75rem',
                        background: '#F8FAF9',
                        padding: '1rem',
                        borderRadius: 12,
                        border: '1px solid var(--border-color)'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>PENJUALAN (GMV)</span>
                          <strong className="text-success" style={{ fontSize: '1.05rem' }}>Rp {(s.revenue || 0).toLocaleString('id-ID')}</strong>
                        </div>
                        <div style={{ background: 'rgba(184, 142, 57, 0.08)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--accent-gold-border)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 700, display: 'block' }}>💵 KOMISI KOTOR</span>
                          <strong className="text-warning" style={{ fontSize: '1.05rem' }}>Rp {(s.grossCommission || 0).toLocaleString('id-ID')}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>PESANAN</span>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{s.totalOrders || 0} order</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>PENONTON AKTIF</span>
                          <strong style={{ fontSize: '1.05rem' }}>{s.activeViewers || 0} orang</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>KOMENTAR</span>
                          <strong style={{ fontSize: '1.05rem' }}>{s.commentsCount || 0} chat</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>KERANJANG</span>
                          <strong style={{ fontSize: '1.05rem' }}>{s.cartAdditions || 0} item</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>CTR KLIK</span>
                          <span className="brand-badge" style={{ fontSize: '0.75rem' }}>{s.clickRatePercent || 0}% CTR</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>TOTAL VIEWS</span>
                          <strong style={{ fontSize: '1.05rem' }}>{s.totalViews || 0} views</strong>
                        </div>
                      </div>

                      {/* EXPANDABLE ACCORDION CONTENT */}
                      {isExpanded && (
                        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
                            <div>
                              <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: 8 }}>🛒 Rincian Produk Terjual:</h4>
                              {(s.products || []).map((prod, idx) => (
                                <div key={idx} style={{ padding: '8px 12px', background: '#FFFFFF', borderRadius: 8, marginBottom: 6, border: '1px solid var(--border-color)', fontSize: '0.825rem' }}>
                                  <strong style={{ color: 'var(--primary)' }}>{prod.name}</strong>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', marginTop: 4 }}>
                                    <span>{prod.clicks} Klik | {prod.cartAdds} Keranjang</span>
                                    <strong className="text-success">Rp {(prod.revenue || 0).toLocaleString('id-ID')}</strong>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div>
                              <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: 8 }}>📊 Interaksi & Traffic:</h4>
                              <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.825rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                  <span>Penonton Terbanyak:</span>
                                  <strong>{s.peakConcurrentViewers || 0} orang</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                  <span>Disukai (Likes):</span>
                                  <strong>{s.likes || 0} likes</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Dibagikan (Shares):</span>
                                  <strong>{s.shares || 0} shares</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="ai-summary-text" style={{ background: 'rgba(184, 142, 57, 0.06)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--accent-gold-border)', fontSize: '0.85rem' }}>
                            <Sparkles style={{ width: 14, height: 14, color: 'var(--accent-gold)', verticalAlign: 'middle', marginRight: 6 }} />
                            {s.aiSummary}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
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
          <div className="tab-content">
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
          </div>
        )}

        {/* Tab 2b: Shopee Video Tracker */}
        {activeTab === 'tabShopeeVideo' && (
          <div className="tab-content">
            {videoSessions.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {videoSessions.length} performa video terekam
                </p>
                <button className="btn btn-sm btn-secondary" style={{ color: '#D32F2F' }} onClick={handleClearAllVideoSessions}>
                  <Trash2 style={{ width: 14, height: 14 }} /> Bersihkan Seluruh Video
                </button>
              </div>
            )}

            {/* EXPANDABLE VIDEO SESSION CARDS OR CLEAN ZERO STATE */}
            {videoSessions.length > 0 ? (
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
                            <span>📅 Analisis: <strong>{v.dateFormatted}</strong></span>
                            <span>👁️ Penonton: <strong>{(v.totalViews || 0).toLocaleString('id-ID')}</strong></span>
                            <span>🛍️ Terjual: <strong>{v.productsSold || 0} unit</strong></span>
                            <span>💵 GMV: <strong style={{ color: '#059669' }}>Rp {(v.revenue || 0).toLocaleString('id-ID')}</strong></span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => setExpandedVideoId(isExpanded ? null : v.id)}>
                            {isExpanded ? "Tutup Detail" : "Buka Detail"}
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setEditingVideoSession(v); setModalType('editVideoSession'); }}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-secondary" style={{ color: '#D32F2F' }} onClick={() => {
                            if (confirm("Hapus data video ini?")) {
                              setStudioData(prev => ({ ...prev, shopeeVideoSessions: prev.shopeeVideoSessions.filter(item => item.id !== v.id) }));
                            }
                          }}>
                            Hapus
                          </button>
                        </div>
                      </div>

                      {/* EXPANDED DETAILS */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '1rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                            
                            {/* TAB PENONTON */}
                            <div style={{ background: '#F8FAF9', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                              <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>👥 Data Utama: Penonton</h4>
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
                            <div style={{ background: '#F8FAF9', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                              <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>🛒 Data Utama: Penjualan</h4>
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
                              <strong>📝 Summary Insight:</strong> {v.aiSummary}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F4F8F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--text-dim)' }}>
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
          <div className="tab-content">
            
            {/* Keuangan KPI Headers */}
            <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="glass-card kpi-card" style={{ '--kpi-accent': '#B88E39' }}>
                <div className="kpi-title">Total Capital Expenditure (CAPEX)</div>
                <div className="kpi-value">Rp {totalCapex.toLocaleString('id-ID')}</div>
                <div className="kpi-subtext">Pengeluaran aset fisik & investasi studio</div>
              </div>
              <div className="glass-card kpi-card" style={{ '--kpi-accent': '#D32F2F' }}>
                <div className="kpi-title">Total Operational Expenditure (OPEX)</div>
                <div className="kpi-value text-danger">Rp {totalOpex.toLocaleString('id-ID')}</div>
                <div className="kpi-subtext">Biaya gaji, internet, sewa & operasional</div>
              </div>
              <div className="glass-card kpi-card" style={{ '--kpi-accent': 'var(--primary)' }}>
                <div className="kpi-title">Total Pengeluaran Bulan Ini</div>
                <div className="kpi-value text-warning">Rp {totalExpenses.toLocaleString('id-ID')}</div>
                <div className="kpi-subtext">Kombinasi CAPEX & OPEX</div>
              </div>
            </div>

            {/* CORPORATE PROFIT & LOSS BREAKDOWN TABLE */}
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign style={{ width: 18, height: 18 }} /> Laporan Laba Rugi & Arus Kas Studio (Profit & Loss Statement)
              </h3>
              
              <div className="table-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAF9', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Komponen Keuangan</th>
                      <th style={{ textAlign: 'right', padding: '10px' }}>Nilai Riil (Rp)</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Keterangan / Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>1. Pendapatan Komisi Shopee Live</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>Rp {totalGrossCommission.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>Hasil komisi 10% dari GMV Live Rp {totalShopeeRev.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>2. Pendapatan Komisi Shopee Video</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>Rp {totalGrossVideoCommission.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>Hasil komisi 10% dari GMV Video Rp {totalVideoRev.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>3. Pendapatan Kontrak Proyek & Klien</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>Rp {totalProjectRev.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>Total nilai anggaran kontrak jasa produksi/live klien aktif</td>
                    </tr>
                    <tr style={{ borderBottom: '2px solid var(--primary)', background: '#F4F8F6' }}>
                      <td style={{ padding: '10px', fontWeight: 800 }}>PENDAPATAN KOTOR (STUDIO REVENUE)</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#059669', fontWeight: 800 }}>Rp {totalStudioGrossRevenue.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: 'var(--primary)' }}>Total Pendapatan Terkombinasi</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>4. Pengeluaran Modal (CAPEX)</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#D32F2F', fontWeight: 700 }}>Rp {totalCapex.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>Investasi aset fisik, alat broadcast, kamera & dekorasi studio</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>5. Pengeluaran Operasional (OPEX)</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#D32F2F', fontWeight: 700 }}>Rp {totalOpex.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>Gaji host/talent, biaya internet, listrik, sewa tempat, operasional harian</td>
                    </tr>
                    <tr style={{ borderBottom: '2px solid var(--primary)', background: '#FAF6F6' }}>
                      <td style={{ padding: '10px', fontWeight: 800 }}>TOTAL PENGELUARAN (TOTAL EXPENSES)</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#D32F2F', fontWeight: 800 }}>Rp {totalExpenses.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: 'var(--primary)' }}>CAPEX + OPEX</td>
                    </tr>
                    <tr style={{ background: '#EAF5F0' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 900, fontSize: '0.95rem' }}>LABA BERSIH (NET PROFIT)</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', color: netProfit >= 0 ? '#059669' : '#D32F2F', fontWeight: 900, fontSize: '1rem' }}>
                        Rp {netProfit.toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: '#059669' }}>
                        Margin Operasional: {netProfitMarginPercent.toFixed(1)}% {netProfit >= 0 ? "📈 SURPLUS" : "📉 DEFISIT"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              {/* CAPEX Table */}
              <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📦 Pengeluaran Aset (CAPEX)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Investasi Jangka Panjang</span>
                </div>

                <div className="table-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAF9', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Nama Item</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Kategori</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Tanggal</th>
                        <th style={{ textAlign: 'right', padding: '8px' }}>Jumlah (Rp)</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capexList.length > 0 ? (
                        capexList.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px' }}><strong>{c.name}</strong></td>
                            <td style={{ padding: '8px' }}><span className="brand-badge" style={{ background: '#F0F4F2', color: 'var(--primary)' }}>{c.category}</span></td>
                            <td style={{ padding: '8px', color: 'var(--text-dim)' }}>{c.date}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>Rp {c.amount.toLocaleString('id-ID')}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button className="btn btn-sm btn-secondary" style={{ padding: '4px 8px', color: '#D32F2F' }} onClick={() => handleDeleteCapex(c.id)}>Hapus</button>
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

              {/* OPEX Table */}
              <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⚙️ Operasional Bulanan (OPEX)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Biaya Rutin / Berulang</span>
                </div>

                <div className="table-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAF9', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Nama Item</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Kategori</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Siklus</th>
                        <th style={{ textAlign: 'right', padding: '8px' }}>Jumlah (Rp)</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opexList.length > 0 ? (
                        opexList.map(o => (
                          <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px' }}><strong>{o.name}</strong></td>
                            <td style={{ padding: '8px' }}><span className="brand-badge" style={{ background: '#FAF6F0', color: 'var(--accent-gold)' }}>{o.category}</span></td>
                            <td style={{ padding: '8px', color: 'var(--text-dim)' }}>{o.frequency}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#D32F2F' }}>Rp {o.amount.toLocaleString('id-ID')}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button className="btn btn-sm btn-secondary" style={{ padding: '4px 8px', color: '#D32F2F' }} onClick={() => handleDeleteOpex(o.id)}>Hapus</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Belum ada data pengeluaran operasional (OPEX).</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}



        {/* Tab 4: Projects */}
        {activeTab === 'tabProjects' && (
          <div className="tab-content">
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
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Camera style={{ color: 'var(--primary)' }} /> Dual Screenshot Scanner</h3>
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
                  disabled={!fileSlot1 && !fileSlot2}
                >
                  <Sparkles /> Scan & Ekstrak Data Instan ([{[fileSlot1, fileSlot2].filter(Boolean).length}] Foto)
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Mengekstrak GMV, pesanan, CTR & produk terjual secara instan tanpa menunggu upload cloud.
                </p>
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
                    <input className="form-input" type="number" value={scannedPreview.grossCommission || Math.round((scannedPreview.revenue || 0) * 0.1)} onChange={e => setScannedPreview({ ...scannedPreview, grossCommission: parseInt(e.target.value) || 0 })} />
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
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} onClick={handleSaveEditedSession}>
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
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Camera style={{ color: 'var(--primary)' }} /> Dual Screenshot Video Scanner</h3>
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
                  disabled={!videoFileSlot1 && !videoFileSlot2}
                >
                  <Sparkles /> Scan & Ekstrak Data Video ([{[videoFileSlot1, videoFileSlot2].filter(Boolean).length}] Foto)
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Mengekstrak GMV, produk terjual, klik & interaksi video secara instan.
                </p>
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
                    <label className="form-label">Tanggal</label>
                    <input className="form-input" value={scannedVideoPreview.dateFormatted} onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, dateFormatted: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Penjualan GMV (Rp)</label>
                    <input className="form-input" type="number" value={scannedVideoPreview.revenue} onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, revenue: parseInt(e.target.value) || 0 })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">💵 Estimasi Komisi (Rp)</label>
                    <input className="form-input" type="number" value={scannedVideoPreview.grossCommission || Math.round((scannedVideoPreview.revenue || 0) * 0.1)} onChange={e => setScannedVideoPreview({ ...scannedVideoPreview, grossCommission: parseInt(e.target.value) || 0 })} />
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
                <label className="form-label">Tanggal</label>
                <input className="form-input" value={editingVideoSession.dateFormatted} onChange={e => setEditingVideoSession({ ...editingVideoSession, dateFormatted: e.target.value })} />
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
              
              {/* Type Switcher Toggle (CAPEX vs OPEX) */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem' }}>
                <button 
                  type="button" 
                  className={`btn ${financialType === 'capex' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setFinancialType('capex')}
                >
                  📦 CAPEX (Belanja Aset)
                </button>
                <button 
                  type="button" 
                  className={`btn ${financialType === 'opex' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setFinancialType('opex')}
                >
                  ⚙️ OPEX (Operasional)
                </button>
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

    </div>
  );
}
