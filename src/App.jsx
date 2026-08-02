import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Video, Briefcase, Calendar, Globe, GitBranch, 
  Terminal, Camera, Sparkles, TrendingUp, PieChart, PlusCircle, 
  UploadCloud, File, CheckCircle, Save, Menu, Lock, User, LogOut, Eye, EyeOff, Info, Trash2,
  ChevronDown, ChevronUp
} from 'lucide-react';

import { INITIAL_STUDIO_DATA } from './data/sampleData';
import { analyzeShopeeScreenshot } from './services/geminiService';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("paramara_auth_session") === "true";
  });
  
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
  const [modalType, setModalType] = useState(null); // 'scan' | 'project' | 'schedule' | 'detail'
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannedPreview, setScannedPreview] = useState(null);

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
  };

  // Derived Calculations
  const sessions = studioData.shopeeSessions || [];
  const projects = studioData.clientProjects || [];

  const totalShopeeRev = sessions.reduce((acc, s) => acc + (s.revenue || 0), 0);
  const totalProjectRev = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  const totalCombinedIncome = totalShopeeRev + totalProjectRev;
  const activeProjectsCount = projects.filter(p => p.status === "Aktif").length;

  // File analysis handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const result = await analyzeShopeeScreenshot(file, apiKey);
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
    setModalType(null);
    alert("Semua data metrik Shopee Live berhasil disimpan!");
  };

  // ==========================================
  // UNAUTHENTICATED LOGIN SCREEN
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'var(--bg-main)',
        padding: '1.5rem'
      }}>
        <div className="glass-card" style={{ 
          maxWidth: 420, 
          width: '100%', 
          padding: '2.5rem 2rem',
          borderRadius: 20,
          boxShadow: '0 20px 40px rgba(8, 47, 38, 0.08)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/assets/logo.png" alt="Paramara Studio" style={{ 
              width: 84, 
              height: 84, 
              borderRadius: 16, 
              border: '2px solid var(--accent-gold)', 
              boxShadow: '0 8px 20px rgba(184, 142, 57, 0.2)',
              marginBottom: '1rem',
              objectFit: 'cover'
            }} onError={(e) => { e.target.src = '/logo.png'; }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>paramarastudio.com</h1>
            <span className="brand-badge" style={{ fontSize: '0.65rem' }}>INTERNAL ADMIN PORTAL ACCESS</span>
          </div>

          <form onSubmit={handleLoginSubmit}>
            {loginError && (
              <div style={{ 
                background: 'rgba(211, 47, 47, 0.08)', 
                color: '#D32F2F', 
                padding: '10px 14px', 
                borderRadius: 10, 
                fontSize: '0.825rem', 
                marginBottom: '1.25rem',
                border: '1px solid rgba(211, 47, 47, 0.2)',
                fontWeight: 600
              }}>
                {loginError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User style={{ width: 15, height: 15 }} /> Username
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Masukkan username admin"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock style={{ width: 15, height: 15 }} /> Password
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"}
                  className="form-input" 
                  placeholder="Masukkan password admin"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem' }}>
              <Lock style={{ width: 18, height: 18 }} /> Masuk ke Admin Portal
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.775rem', color: 'var(--text-dim)', marginTop: '2rem' }}>
            © 2026 <strong>paramarastudio.com</strong> — Authorized Access Only
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // AUTHENTICATED ADMIN PORTAL DASHBOARD
  // ==========================================
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
                <h1 className="brand-title">paramarastudio</h1>
                <p style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>.com admin portal</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span className="brand-badge" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', borderColor: 'rgba(5, 150, 105, 0.3)' }}>
                User: abdumalikh
              </span>
              <span className="brand-badge" style={{ background: 'rgba(5, 150, 105, 0.08)', color: '#059669', borderColor: 'rgba(5, 150, 105, 0.25)' }}>
                Gemini AI Vision Active
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
            <button className={`tab-btn ${activeTab === 'tabBranding' ? 'active' : ''}`} onClick={() => { setActiveTab('tabBranding'); setSidebarOpen(false); }}>
              <Globe /> Domain & Logo Studio
            </button>
            <button className={`tab-btn ${activeTab === 'tabGitGuide' ? 'active' : ''}`} onClick={() => { setActiveTab('tabGitGuide'); setSidebarOpen(false); }}>
              <GitBranch /> Deployment GitHub
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: '#D32F2F' }} onClick={handleLogout}>
            <LogOut /> Keluar / Logout
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
              <p>Selamat datang kembali, <strong>abdumalikh</strong>! Seluruh metrik tampil tanpa perlu scroll horizontal.</p>
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => setModalType('scan')}>
            <Camera /> Input Shopee Live AI
          </button>
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
                <div className="kpi-title">Omset Shopee Live</div>
                <div className="kpi-value text-warning">Rp {totalShopeeRev.toLocaleString('id-ID')}</div>
                <div className="kpi-subtext">Dari hasil scan screenshot AI</div>
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
              <div className="ai-badge"><Sparkles style={{ width: 14, height: 14 }} /> Gemini AI Executive Insight (paramarastudio.com)</div>
              <div className="ai-summary-text">
                {sessions.length > 0 ? (
                  <>
                    <strong>Insight Admin Sesi Live Terbaru ({sessions[0].title || 'Sesi Live'}):</strong><br/>
                    {sessions[0].aiSummary || `Sesi live berdurasi ${sessions[0].duration || '01:27:11'} menghasilkan Rp${(sessions[0].revenue || 232500).toLocaleString('id-ID')} (${sessions[0].products?.[1]?.name || 'MEGAMOVE'}). CTR tinggi di ${sessions[0].clickRatePercent || 32.1}%. ${sessions[0].totalViews || 28} total penonton dengan rata-rata durasi ${sessions[0].avgWatchDuration || '00:00:50'}.`}
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
                          ⏱️ Durasi: <strong>{s.duration}</strong> | 🛒 Orders: <strong>{s.totalOrders}</strong> | 👁️ Views: <strong>{s.totalViews}</strong> | 🎯 CTR: <strong>{s.clickRatePercent}%</strong>
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

        {/* Tab 2: Shopee Live AI Tracker - EXPANDABLE CARDS (NO HORIZONTAL SCROLL) */}
        {activeTab === 'tabShopeeTracker' && (
          <div className="tab-content">
            <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Video style={{ color: 'var(--primary)' }} /> Modul Pemrosesan Data Shopee Live Streaming (AI Scan)</h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Seluruh metrik langsung terlihat lengkap di layar tanpa scroll ke kanan.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setModalType('scan')}>
                  <Camera /> Scan Screenshot Baru
                </button>
              </div>
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

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => setExpandedSessionId(isExpanded ? null : s.id)}>
                          {isExpanded ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}
                          {isExpanded ? "Tutup Ringkasan" : "Lihat Metrik Lengkap"}
                        </button>
                        <button className="btn btn-sm btn-secondary" style={{ color: '#D32F2F' }} onClick={() => {
                          setStudioData(prev => ({ ...prev, shopeeSessions: prev.shopeeSessions.filter(item => item.id !== s.id) }));
                        }}>
                          <Trash2 style={{ width: 14, height: 14 }} /> Hapus
                        </button>
                      </div>
                    </div>

                    {/* DIRECT VISIBLE METRICS GRID (ALL IN 1 SCREEN) */}
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
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block' }}>RATA-RATA MENONTON</span>
                        <strong style={{ fontSize: '1.05rem' }}>{s.avgWatchDuration || "00:00:50"}</strong>
                      </div>
                    </div>

                    {/* EXPANDABLE ACCORDION CONTENT */}
                    {isExpanded && (
                      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
                          <div>
                            <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: 8 }}>🛒 Performa Produk Terjual:</h4>
                            {(s.products || [
                              { name: "MEGAMOVE 100% ORIGINAL OBAT HERBAL", price: 250000, revenue: 232500, clicks: 2, cartAdds: 1 },
                              { name: "Ovisure Gold Susu Kesehatan Tulang", price: 300000, revenue: 0, clicks: 5, cartAdds: 2 }
                            ]).map((prod, idx) => (
                              <div key={idx} style={{ padding: '6px 10px', background: '#FFFFFF', borderRadius: 8, marginBottom: 6, border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                                <strong>{prod.name}</strong>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', marginTop: 2 }}>
                                  <span>{prod.clicks} Klik | {prod.cartAdds} Keranjang</span>
                                  <strong className="text-success">Rp {(prod.revenue || 0).toLocaleString('id-ID')}</strong>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div>
                            <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: 8 }}>📊 Interaksi & Traffic:</h4>
                            <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>Penonton Terbanyak:</span>
                                <strong>{s.peakConcurrentViewers || 3} orang</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
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

        {/* Tab 3: Projects */}
        {activeTab === 'tabProjects' && (
          <div className="tab-content">
            <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Briefcase style={{ color: 'var(--primary)' }} /> Manajemen Proyek & Klien paramarastudio.com</h3>
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
          <p>© 2026 <strong>paramarastudio.com</strong> — Authorized Admin Portal for abdumalikh</p>
        </footer>
      </main>

      {/* Modal: Screenshot Scan */}
      {modalType === 'scan' && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Camera style={{ color: 'var(--primary)' }} /> Input & Scan Screenshot Shopee Live</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            {!scannedPreview && !scanning && (
              <label className="dropzone" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><UploadCloud style={{ width: 44, height: 44, color: 'var(--primary)' }} /></div>
                <h4 style={{ marginBottom: '6px' }}>Upload Screenshot HP Laporan Live di Sini</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Gemini AI akan membaca seluruh metrik (Penjualan, Pesanan, Komentar, CTR, Interaksi, Produk & Traffic)</p>
                <span className="btn btn-primary btn-sm"><File /> Pilih Gambar Screenshot</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            )}

            {scanning && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Sparkles style={{ width: 44, height: 44, color: 'var(--accent-gold)' }} /></div>
                <h4>Gemini Vision AI Sedang Mengekstrak Seluruh Metrik Screenshot...</h4>
              </div>
            )}

            {scannedPreview && !scanning && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: 'var(--secondary-emerald)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle /> Periksa & Konfirmasi Seluruh Metrik Ter-Scan:</h4>
                
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
                  <div className="form-group">
                    <label className="form-label">Total Pesanan</label>
                    <input className="form-input" type="number" value={scannedPreview.totalOrders} onChange={e => setScannedPreview({ ...scannedPreview, totalOrders: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Penonton Aktif</label>
                    <input className="form-input" type="number" value={scannedPreview.activeViewers || 7} onChange={e => setScannedPreview({ ...scannedPreview, activeViewers: parseInt(e.target.value) || 0 })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Persentase Klik (CTR %)</label>
                    <input className="form-input" type="number" step="0.1" value={scannedPreview.clickRatePercent} onChange={e => setScannedPreview({ ...scannedPreview, clickRatePercent: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pesanan per Klik (%)</label>
                    <input className="form-input" type="number" step="0.1" value={scannedPreview.ordersPerClickPercent || 11.1} onChange={e => setScannedPreview({ ...scannedPreview, ordersPerClickPercent: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Masuk Keranjang</label>
                    <input className="form-input" type="number" value={scannedPreview.cartAdditions || 5} onChange={e => setScannedPreview({ ...scannedPreview, cartAdditions: parseInt(e.target.value) || 0 })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ditonton (Total Views)</label>
                    <input className="form-input" type="number" value={scannedPreview.totalViews || 28} onChange={e => setScannedPreview({ ...scannedPreview, totalViews: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rata-Rata Menonton</label>
                    <input className="form-input" value={scannedPreview.avgWatchDuration || "00:00:50"} onChange={e => setScannedPreview({ ...scannedPreview, avgWatchDuration: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Disukai (Likes)</label>
                    <input className="form-input" type="number" value={scannedPreview.likes || 76} onChange={e => setScannedPreview({ ...scannedPreview, likes: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} onClick={handleSaveScannedSession}>
                  <Save /> Simpan Seluruh Metrik Data ke Admin Portal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
