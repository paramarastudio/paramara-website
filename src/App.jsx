import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Video, Briefcase, Calendar, Globe, GitBranch, 
  Terminal, Camera, Sparkles, TrendingUp, PieChart, PlusCircle, 
  UploadCloud, File, CheckCircle, Save, Menu, Lock, User, LogOut, Eye, EyeOff, Info, Trash2,
  ChevronDown, ChevronUp, ImagePlus, Edit3, UserCheck, UserPlus, ExternalLink, ArrowRight,
  ShoppingBag, Leaf, Compass, Shield, Award, Layers, Monitor
} from 'lucide-react';

import { INITIAL_STUDIO_DATA } from './data/sampleData';
import { analyzeShopeeScreenshots } from './services/geminiService';

export default function App() {
  // Authentication & View Mode State ('public' | 'admin')
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("paramara_auth_session") === "true";
  });
  
  const [viewMode, setViewMode] = useState('public'); // Default to Public Homepage
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Portal Navigation State
  const [activeTab, setActiveTab] = useState('tabAnalytics');
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  
  const [studioData, setStudioData] = useState(() => {
    const saved = localStorage.getItem("paramara_studio_admin_data");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_STUDIO_DATA;
  });
  
  // Secure Gemini API Key
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || "";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Modals state
  const [modalType, setModalType] = useState(null); // 'scan' | 'project' | 'schedule' | 'editSession' | 'addAdmin' | 'editAdmin'
  const [editingSession, setEditingSession] = useState(null);
  const [editingAdminUser, setEditingAdminUser] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannedPreview, setScannedPreview] = useState(null);

  // Admin User Form State
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminFullName, setNewAdminFullName] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("Admin Operasional");

  // Branding Settings State
  const [domainNameInput, setDomainNameInput] = useState("paramarastudio.com");

  // Dual Screenshot Files State
  const [fileSlot1, setFileSlot1] = useState(null);
  const [fileSlot2, setFileSlot2] = useState(null);

  // Save Studio Data to LocalStorage
  useEffect(() => {
    localStorage.setItem("paramara_studio_admin_data", JSON.stringify(studioData));
  }, [studioData]);

  // Handle Login Authentication
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginUsername.trim() === "abdumalikh" && loginPassword === "Ygj80kq91j!") {
      setIsAuthenticated(true);
      localStorage.setItem("paramara_auth_session", "true");
      setLoginError("");
      setShowLoginModal(false);
      setViewMode('admin'); // Switch to Admin Portal
    } else {
      setLoginError("Username atau password tidak cocok. Silakan coba lagi.");
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

  // Derived Calculations
  const sessions = studioData.shopeeSessions || [];
  const projects = studioData.clientProjects || [];
  const adminUsers = studioData.adminUsers || INITIAL_STUDIO_DATA.adminUsers;

  const totalShopeeRev = sessions.reduce((acc, s) => acc + (s.revenue || 0), 0);
  const totalGrossCommission = sessions.reduce((acc, s) => acc + (s.grossCommission || 0), 0);
  const totalProjectRev = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  const totalCombinedIncome = totalShopeeRev + totalProjectRev;
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

  // Dual File analysis handler
  const handleDualAnalysis = async () => {
    const filesToProcess = [fileSlot1, fileSlot2].filter(Boolean);
    if (filesToProcess.length === 0) {
      alert("Mohon pilih minimal 1 foto screenshot!");
      return;
    }

    setScanning(true);
    try {
      const result = await analyzeShopeeScreenshots(filesToProcess, apiKey);
      if (!result.grossCommission) {
        result.grossCommission = Math.round((result.revenue || 0) * 0.1);
      }
      setScannedPreview(result);
    } catch (err) {
      alert("Gagal membaca screenshot: " + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleSaveScannedSession = () => {
    if (!scannedPreview) return;
    setStudioData(prev => ({
      ...prev,
      shopeeSessions: [scannedPreview, ...prev.shopeeSessions]
    }));
    setScannedPreview(null);
    setFileSlot1(null);
    setFileSlot2(null);
    setModalType(null);
    alert("Semua data metrik & komisi kotor berhasil disimpan!");
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

  // =========================================================================
  // VIEW MODE 1: PUBLIC OFFICIAL HOMEPAGE (Paramara Studio Core Ecosystem)
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
          padding: '0.875rem 2rem'
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/assets/logo.png" alt="Paramara Studio" style={{ width: 42, height: 42, borderRadius: 10, border: '1px solid var(--accent-gold-border)', objectFit: 'cover' }} onError={(e) => { e.target.src = '/logo.png'; }} />
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>Paramara Studio</h1>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.04em' }}>DIGITAL VENTURES & MEDIA ENGINE</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <nav style={{ display: 'flex', gap: '1.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                <a href="#ventures" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Portfolio Ventures</a>
                <a href="#shopee" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Shopee Live</a>
                <a href="#lestari" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Lestari Ecosystem</a>
                <a href="#ijustfound" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>I Just Found (US)</a>
              </nav>

              {isAuthenticated ? (
                <button className="btn btn-primary btn-sm" onClick={() => setViewMode('admin')}>
                  <Monitor style={{ width: 15, height: 15 }} /> Buka Admin Portal
                </button>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowLoginModal(true)}>
                  <Lock style={{ width: 15, height: 15 }} /> Admin Login
                </button>
              )}
            </div>

          </div>
        </header>

        {/* HERO SECTION */}
        <section style={{ padding: '5rem 2rem 4rem', textAlign: 'center', maxWidth: 960, margin: '0 auto' }}>
          <div className="brand-badge" style={{ marginBottom: '1.25rem', padding: '6px 16px', fontSize: '0.75rem' }}>
            <Sparkles style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 6 }} /> Official Venture Ecosystem & Digital House
          </div>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2, marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>
            Driving High-Converting Live Commerce, Sustainable Platforms & US Media Engines.
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2.25rem', maxWidth: 780, margin: '0 auto 2.25rem' }}>
            <strong>Paramara Studio</strong> is a digital venture builder overseeing specialized media and technology operations: Shopee Live Commerce management, the Lestari app ecosystem, and viral US-market product discovery engines.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="#ventures" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
              Jelajahi Venture & Portfolio <ArrowRight style={{ width: 18, height: 18 }} />
            </a>
            {isAuthenticated ? (
              <button className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={() => setViewMode('admin')}>
                <Monitor style={{ width: 18, height: 18 }} /> Buka Portal Admin Studio
              </button>
            ) : (
              <button className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={() => setShowLoginModal(true)}>
                <Lock style={{ width: 18, height: 18 }} /> Portal Admin Login
              </button>
            )}
          </div>
        </section>

        {/* VENTURES GRID SECTION */}
        <section id="ventures" style={{ maxWidth: 1140, margin: '0 auto', padding: '2rem 2rem 6rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>Tiga Pilar Utama Paramara Studio</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>Operasi bisnis, riset platform digital, dan jaringan konten internasional.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* PILLAR 1: SHOPEE LIVE */}
            <div className="glass-card" id="shopee" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid var(--primary)' }}>
              <div>
                <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(8, 47, 38, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', color: 'var(--primary)' }}>
                  <Video style={{ width: 26, height: 26 }} />
                </div>
                <span className="brand-badge" style={{ marginBottom: 8 }}>E-Commerce Operations</span>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Shopee Live Streaming Management</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Operasi pemrosesan live streaming e-commerce berkinerja tinggi. Didukung oleh penyiaran host profesional, strategi GMV penjualan, dan integrasi presisi <strong>Gemini AI Vision Analytics</strong>.
                </p>
                
                <div style={{ background: '#F8FAF9', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                  <strong>📊 Capaian Metrik:</strong><br/>
                  <span style={{ color: 'var(--secondary-emerald)', fontWeight: 700 }}>• Rp 232.500+ GMV / Sesi</span><br/>
                  <span>• 32.1% CTR Klik Tinggi</span><br/>
                  <span>• Ekstraksi Presisi Screenshot AI</span>
                </div>
              </div>

              {isAuthenticated ? (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setViewMode('admin'); setActiveTab('tabShopeeTracker'); }}>
                  Buka AI Live Tracker <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              ) : (
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowLoginModal(true)}>
                  <Lock style={{ width: 15, height: 15 }} /> Login Admin Tracker
                </button>
              )}
            </div>

            {/* PILLAR 2: LESTARI APP */}
            <div className="glass-card" id="lestari" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid var(--secondary-emerald)' }}>
              <div>
                <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(5, 150, 105, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', color: 'var(--secondary-emerald)' }}>
                  <Leaf style={{ width: 26, height: 26 }} />
                </div>
                <span className="brand-badge" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', borderColor: 'rgba(5, 150, 105, 0.3)', marginBottom: 8 }}>
                  On-Going Platform
                </span>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Lestari App Ecosystem</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Platform aplikasi digital modern berfokus pada keberlanjutan (sustainability), solusi lingkungan, dan pemberdayaan ekosistem digital. Saat ini dalam tahap aktif iterasi pengembangan.
                </p>

                <div style={{ background: '#F8FAF9', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                  <strong>🚀 Status Pengembang:</strong><br/>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>• Deployment: lestari-app.vercel.app</span><br/>
                  <span>• Tahap: Active Product Iteration</span>
                </div>
              </div>

              <a href="https://lestari-app.vercel.app/" target="_blank" rel="noreferrer" className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }}>
                Kunjungi Lestari App <ExternalLink style={{ width: 16, height: 16 }} />
              </a>
            </div>

            {/* PILLAR 3: I JUST FOUND (US MARKET AMAZON AFFILIATE) */}
            <div className="glass-card" id="ijustfound" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid var(--accent-gold)' }}>
              <div>
                <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(184, 142, 57, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', color: 'var(--accent-gold)' }}>
                  <Compass style={{ width: 26, height: 26 }} />
                </div>
                <span className="brand-badge" style={{ marginBottom: 8 }}>US Market & Media Hub</span>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>@I Just Found (US Affiliate)</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Kanal kurasi produk viral dan jaringan media afiliasi Amazon yang ditargetkan secara khusus untuk pasar Amerika Serikat (US Market) melalui Pinterest & platform media sosial.
                </p>

                <div style={{ background: '#F8FAF9', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                  <strong>🇺🇸 Target Segment & Channel:</strong><br/>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>• Target Market: United States (US)</span><br/>
                  <span>• Amazon Affiliate Viral Product Engine</span>
                </div>
              </div>

              <a href="https://uk.pinterest.com/productijustfound/" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', color: 'var(--accent-gold)', borderColor: 'var(--accent-gold-border)' }}>
                Buka Channel Pinterest @productijustfound <ExternalLink style={{ width: 16, height: 16 }} />
              </a>
            </div>

          </div>
        </section>

        {/* PUBLIC FOOTER */}
        <footer style={{ background: '#FFFFFF', borderTop: '1px solid var(--border-color)', padding: '2.5rem 2rem', textAlign: 'center' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/assets/logo.png" alt="Paramara Studio" style={{ width: 32, height: 32, borderRadius: 8 }} onError={(e) => { e.target.src = '/logo.png'; }} />
              <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>Paramara Studio</strong>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-dim)' }}>
              © 2026 <strong>Paramara Studio</strong>. All rights reserved. Operating Digital Commerce & Media Ecosystem.
            </p>
          </div>
        </footer>

        {/* ADMIN LOGIN MODAL */}
        {showLoginModal && (
          <div className="modal-overlay active">
            <div className="modal-card" style={{ maxWidth: 420, padding: '2.25rem 2rem' }}>
              <div className="modal-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem' }}>
                  <Lock style={{ color: 'var(--primary)' }} /> Admin Portal Login
                </h3>
                <button className="close-btn" onClick={() => setShowLoginModal(false)}>&times;</button>
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

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  <Lock style={{ width: 16, height: 16 }} /> Masuk ke Admin Portal
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // VIEW MODE 2: AUTHENTICATED ADMIN PORTAL DASHBOARD
  // =========================================================================
  return (
    <div className="admin-layout">
      
      {/* Mobile Backdrop */}
      <div 
        className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`} 
        onClick={() => setSidebarOpen(false)} 
      />

      {/* Vertical Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div>
          <div className="sidebar-header">
            <div className="brand-wrapper">
              <img className="brand-logo-img" src="/assets/logo.png" alt="Paramara Studio Logo" onError={(e) => { e.target.src = '/logo.png'; }} />
              <div>
                <h1 className="brand-title" style={{ fontSize: '1.25rem' }}>Paramara Studio</h1>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 6 }}>
              <span className="brand-badge" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', borderColor: 'rgba(5, 150, 105, 0.3)' }}>
                Hi Malikh
              </span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button className={`tab-btn ${activeTab === 'tabAnalytics' ? 'active' : ''}`} onClick={() => { setActiveTab('tabAnalytics'); setSidebarOpen(false); }}>
              <LayoutDashboard /> Executive Dashboard
            </button>
            <button className={`tab-btn ${activeTab === 'tabShopeeTracker' ? 'active' : ''}`} onClick={() => { setActiveTab('tabShopeeTracker'); setSidebarOpen(false); }}>
              <Video /> Shopee Live AI Tracker
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
            <button className={`tab-btn ${activeTab === 'tabBranding' ? 'active' : ''}`} onClick={() => { setActiveTab('tabBranding'); setSidebarOpen(false); }}>
              <Globe /> Domain & Logo Studio
            </button>
            <button className={`tab-btn ${activeTab === 'tabGitGuide' ? 'active' : ''}`} onClick={() => { setActiveTab('tabGitGuide'); setSidebarOpen(false); }}>
              <GitBranch /> Deployment GitHub
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
      <main className="main-content">
        
        {/* Top Header */}
        <div className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="mobile-nav-toggle" onClick={() => setSidebarOpen(true)}>
              <Menu />
            </button>
            <div className="header-title">
              <h2>Executive Dashboard & Studio Operations</h2>
              <p>Selamat datang kembali, <strong>Malikh</strong>! Ikhtisar aktivitas Paramara Studio.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setViewMode('public')}>
              <Globe /> Homepage Publik
            </button>
            <button className="btn btn-primary" onClick={() => { setFileSlot1(null); setFileSlot2(null); setScannedPreview(null); setModalType('scan'); }}>
              <Camera /> Input Shopee Live AI (2 Foto)
            </button>
          </div>
        </div>

        {/* Tab 1: Executive Dashboard */}
        {activeTab === 'tabAnalytics' && (
          <div className="tab-content">
            <div className="kpi-grid">
              <div className="glass-card kpi-card" style={{ '--kpi-accent': '#059669' }}>
                <div className="kpi-title">Total Pendapatan Studio</div>
                <div className="kpi-value text-success">Rp {totalCombinedIncome.toLocaleString('id-ID')}</div>
                <div className="kpi-subtext">Live Stream + Proyek Studio</div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': '#B88E39' }}>
                <div className="kpi-title">Total Komisi Kotor Studio</div>
                <div className="kpi-value text-warning">Rp {totalGrossCommission.toLocaleString('id-ID')}</div>
                <div className="kpi-subtext">Hasil komisi dari Shopee Live</div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': '#082F26' }}>
                <div className="kpi-title">Proyek Klien Aktif</div>
                <div className="kpi-value">{activeProjectsCount} Proyek</div>
                <div className="kpi-subtext">Dalam pengerjaan tim studio</div>
              </div>

              <div className="glass-card kpi-card" style={{ '--kpi-accent': '#059669' }}>
                <div className="kpi-title">Total Sesi Live Terekam</div>
                <div className="kpi-value">{sessions.length} Sesi</div>
                <div className="kpi-subtext">Diproses oleh Gemini AI</div>
              </div>
            </div>

            {/* DYNAMIC GEMINI AI EXECUTIVE INSIGHT CARD */}
            <div className="glass-card ai-summary-card">
              <div className="ai-badge"><Sparkles style={{ width: 14, height: 14 }} /> Gemini AI Executive Insight (Paramara Studio)</div>
              <div className="ai-summary-text">
                {sessions.length > 0 ? (
                  <>
                    <strong>Insight Admin Sesi Live Terbaru ({sessions[0].title || 'Sesi Live'}):</strong><br/>
                    {sessions[0].aiSummary || `Sesi live berdurasi ${sessions[0].duration || '01:27:11'} menghasilkan Rp${(sessions[0].revenue || 232500).toLocaleString('id-ID')} (${sessions[0].products?.[1]?.name || 'MEGAMOVE'}) dengan Komisi Kotor Rp${(sessions[0].grossCommission || 23250).toLocaleString('id-ID')}. CTR tinggi di ${sessions[0].clickRatePercent || 32.1}%.`}
                  </>
                ) : (
                  "Belum ada data sesi Shopee Live. Silakan klik tombol 'Input Shopee Live AI' untuk mengunggah screenshot HP laporan live."
                )}
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="glass-card chart-card">
                <div className="chart-header">
                  <h3><TrendingUp style={{ color: 'var(--primary)' }} /> Tren Revenue Shopee Live Streaming</h3>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>Internal Studio Analytics</span>
                </div>
                <div className="chart-container" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sessions.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F8FAF9', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{s.title}</strong>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)', marginTop: 2 }}>
                          ⏱️ Durasi: <strong>{s.duration}</strong> | 💵 Komisi Kotor: <strong className="text-warning">Rp {(s.grossCommission || 0).toLocaleString('id-ID')}</strong>
                        </div>
                      </div>
                      <span className="text-success" style={{ fontWeight: 800, fontSize: '1.05rem' }}>Rp {(s.revenue || 0).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card chart-card">
                <div className="chart-header">
                  <h3><PieChart style={{ color: 'var(--primary)' }} /> Sumber Penonton Live</h3>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>Traffic Breakdown</span>
                </div>
                <div className="chart-container" style={{ padding: '1rem' }}>
                  {(sessions[0]?.trafficSources || [
                    { name: "Video", percent: 18.0 },
                    { name: "Tab Live & Video", percent: 14.0 },
                    { name: "Beranda", percent: 11.0 }
                  ]).map((t, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0', fontSize: '0.875rem' }}>
                      <span>{t.name}</span>
                      <strong>{t.percent}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Shopee Live AI Tracker */}
        {activeTab === 'tabShopeeTracker' && (
          <div className="tab-content">
            <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4 }}><Video style={{ color: 'var(--primary)' }} /> Modul Pemrosesan Data Shopee Live (Dual Screenshot AI)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Ekstraksi data otomatis laporan live streaming Shopee dari screenshot HP bagian atas (GMV & Interaksi) dan bagian bawah (Produk Terjual). Klik tombol <strong>"Input Shopee Live AI"</strong> di atas untuk menambah sesi baru.
              </p>
            </div>

            {/* EXPANDABLE EXECUTIVE SESSION CARDS */}
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
                        <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{s.totalOrders} order</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>PENONTON AKTIF</span>
                        <strong style={{ fontSize: '1.05rem' }}>{s.activeViewers || 7} orang</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>KOMENTAR</span>
                        <strong style={{ fontSize: '1.05rem' }}>{s.commentsCount || 1} chat</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>KERANJANG</span>
                        <strong style={{ fontSize: '1.05rem' }}>{s.cartAdditions || 5} item</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>CTR KLIK</span>
                        <span className="brand-badge" style={{ fontSize: '0.75rem' }}>{s.clickRatePercent}% CTR</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>TOTAL VIEWS</span>
                        <strong style={{ fontSize: '1.05rem' }}>{s.totalViews || 28} views</strong>
                      </div>
                    </div>

                    {/* EXPANDABLE ACCORDION CONTENT */}
                    {isExpanded && (
                      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
                          <div>
                            <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: 8 }}>🛒 Rincian Produk Terjual:</h4>
                            {(s.products || [
                              { name: "MEGAMOVE 100% ORIGINAL OBAT HERBAL NYERI SENDI", price: 250000, revenue: 232500, clicks: 2, cartAdds: 1 },
                              { name: "Ovisure Gold Susu Kesehatan Tulang", price: 300000, revenue: 0, clicks: 5, cartAdds: 2 }
                            ]).map((prod, idx) => (
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
                                <strong>{s.peakConcurrentViewers || 3} orang</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span>Disukai (Likes):</span>
                                <strong>{s.likes || 76} likes</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Dibagikan (Shares):</span>
                                <strong>{s.shares || 1} shares</strong>
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

        {/* TAB DOMAIN & LOGO STUDIO */}
        {activeTab === 'tabBranding' && (
          <div className="tab-content">
            <div className="glass-card" style={{ padding: '2rem', maxWidth: 680 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 6 }}>
                <Globe style={{ color: 'var(--primary)' }} /> Pengaturan Domain & Logo Paramara Studio
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Sesuaikan nama domain utama studio dan identitas logo official portal admin.
              </p>

              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <img src="/assets/logo.png" alt="Logo Paramara Studio" style={{ width: 110, height: 110, borderRadius: 20, border: '2px solid var(--accent-gold)', boxShadow: '0 8px 24px rgba(184, 142, 57, 0.2)', objectFit: 'cover' }} onError={(e) => { e.target.src = '/logo.png'; }} />
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 8 }}>Official Logo Emblem: Paramara Studio</p>
              </div>

              <div className="form-group">
                <label className="form-label">Domain Utama Studio</label>
                <input className="form-input" value={domainNameInput} onChange={e => setDomainNameInput(e.target.value)} />
              </div>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} onClick={() => alert("Pengaturan Domain & Logo Studio Berhasil Disimpan!")}>
                <Save /> Simpan Pengaturan Domain & Logo
              </button>
            </div>
          </div>
        )}

        {/* TAB DEPLOYMENT GITHUB */}
        {activeTab === 'tabGitGuide' && (
          <div className="tab-content">
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 8 }}>
                <GitBranch style={{ color: 'var(--primary)' }} /> Status Deployment GitHub & Vercel
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Portal admin <strong>Paramara Studio</strong> secara aktif terhubung dengan repository GitHub dan ter-deploy otomatis di Vercel.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#F8FAF9', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: 8 }}>octocat GitHub Repository:</h4>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    <strong>Repository:</strong> paramarastudio/paramara-website<br/>
                    <strong>Branch:</strong> main<br/>
                    <strong>Author Config:</strong> paramarastudio &lt;paramarastudio@gmail.com&gt;
                  </p>
                  <a href="https://github.com/paramarastudio/paramara-website" target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ marginTop: 6 }}>
                    Buka Repository GitHub &rarr;
                  </a>
                </div>

                <div style={{ background: '#F8FAF9', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: 8 }}>▲ Vercel Cloud Hosting:</h4>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    <strong>Status:</strong> <span className="brand-badge" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>Connected & Active</span><br/>
                    <strong>Live Domain:</strong> paramara-website.vercel.app<br/>
                    <strong>Auto Deployment:</strong> Aktif Setiap Commit Push
                  </p>
                  <a href="https://paramara-website.vercel.app" target="_blank" rel="noreferrer" className="btn btn-sm btn-primary" style={{ marginTop: 6 }}>
                    Buka Website Vercel &rarr;
                  </a>
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

      {/* Modal: DUAL SCREENSHOT SCANNER */}
      {modalType === 'scan' && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: 740 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Camera style={{ color: 'var(--primary)' }} /> Dual Screenshot AI Scanner</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            {!scannedPreview && !scanning && (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Unggah 2 foto screenshot HP sekaligus: <strong>Screenshot Atas</strong> (Data Utama GMV & Interaksi) + <strong>Screenshot Bawah</strong> (Detail Produk Terjual).
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  
                  {/* Slot 1 */}
                  <label className="dropzone" style={{ display: 'block', padding: '1.5rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                      <ImagePlus style={{ width: 36, height: 36, color: fileSlot1 ? 'var(--secondary-emerald)' : 'var(--primary)' }} />
                    </div>
                    <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>1. Screenshot Atas</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {fileSlot1 ? `✓ ${fileSlot1.name}` : "Data Utama GMV & Interaksi"}
                    </span>
                    <input type="file" accept="image/*" onChange={e => setFileSlot1(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  </label>

                  {/* Slot 2 */}
                  <label className="dropzone" style={{ display: 'block', padding: '1.5rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                      <ImagePlus style={{ width: 36, height: 36, color: fileSlot2 ? 'var(--secondary-emerald)' : 'var(--primary)' }} />
                    </div>
                    <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: 4 }}>2. Screenshot Bawah</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {fileSlot2 ? `✓ ${fileSlot2.name}` : "Scroll Down: Produk Terjual"}
                    </span>
                    <input type="file" accept="image/*" onChange={e => setFileSlot2(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  </label>

                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                  onClick={handleDualAnalysis}
                  disabled={!fileSlot1 && !fileSlot2}
                >
                  <Sparkles /> Proses & Gabungkan Data Screenshot dengan Gemini AI
                </button>
              </div>
            )}

            {scanning && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Sparkles style={{ width: 44, height: 44, color: 'var(--accent-gold)' }} /></div>
                <h4>Gemini Vision AI Sedang Menggabungkan Screenshot Atas & Bawah...</h4>
              </div>
            )}

            {scannedPreview && !scanning && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: 'var(--secondary-emerald)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle /> Periksa & Konfirmasi Data Sesi:</h4>
                
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

    </div>
  );
}
