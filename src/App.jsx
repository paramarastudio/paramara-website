import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Video, Briefcase, Calendar, Globe, GitBranch, 
  Key, Terminal, Camera, Sparkles, TrendingUp, PieChart, PlusCircle, 
  UploadCloud, File, CheckCircle, Save, Menu, Lock, User, LogOut, Eye, EyeOff
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
  const [studioData, setStudioData] = useState(() => {
    const saved = localStorage.getItem("paramara_studio_admin_data");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_STUDIO_DATA;
  });
  
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Modals state
  const [modalType, setModalType] = useState(null);
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
    alert("Data sesi Shopee Live berhasil diinput ke portal admin!");
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
          <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setModalType('apiKey')}>
            <Key /> Gemini API Key
          </button>
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
              <p>Selamat datang kembali, <strong>abdumalikh</strong>! Ikhtisar pendapatan dan aktivitas studio.</p>
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

            <div className="glass-card ai-summary-card">
              <div className="ai-badge"><Sparkles style={{ width: 14, height: 14 }} /> Gemini AI Executive Insight</div>
              <div className="ai-summary-text">
                {sessions[0]?.aiSummary || 'Sesi live berjalan optimal dengan omset Rp' + totalShopeeRev.toLocaleString('id-ID') + '. Pertahankan frekuensi streaming.'}
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="glass-card chart-card">
                <div className="chart-header">
                  <h3><TrendingUp style={{ color: 'var(--primary)' }} /> Tren Revenue Shopee Live Streaming</h3>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>Internal Studio Analytics</span>
                </div>
                <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  📊 Analytics Chart Active (Chart.js Module Ready)
                </div>
              </div>

              <div className="glass-card chart-card">
                <div className="chart-header">
                  <h3><PieChart style={{ color: 'var(--primary)' }} /> Sumber Penonton Live</h3>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>Traffic Breakdown</span>
                </div>
                <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  🍩 Traffic Source Breakdown Active
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Shopee Live AI Tracker */}
        {activeTab === 'tabShopeeTracker' && (
          <div className="tab-content">
            <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Video style={{ color: 'var(--primary)' }} /> Modul Pemrosesan Data Shopee Live Streaming (AI Scan)</h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Admin dapat mengunggah screenshot HP laporan live untuk diekstrak otomatis oleh Gemini AI.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setModalType('scan')}>
                  <Camera /> Scan Screenshot Baru
                </button>
              </div>
            </div>

            <div className="table-wrapper glass-card">
              <table>
                <thead>
                  <tr>
                    <th>Judul Sesi & Waktu</th>
                    <th>Durasi</th>
                    <th>Omset Live</th>
                    <th>Pesanan</th>
                    <th>Total Penonton</th>
                    <th>CTR (%)</th>
                    <th>Aksi Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.title}</strong><br/><small style={{ color: 'var(--text-dim)' }}>{s.dateFormatted || s.startTime}</small></td>
                      <td>{s.duration}</td>
                      <td className="text-success" style={{ fontWeight: 700 }}>Rp {(s.revenue || 0).toLocaleString('id-ID')}</td>
                      <td>{s.totalOrders} pesanan</td>
                      <td>{s.totalViews} penonton</td>
                      <td><span className="brand-badge">{s.clickRatePercent}% CTR</span></td>
                      <td>
                        <button className="btn btn-sm btn-secondary" style={{ color: '#D32F2F' }} onClick={() => {
                          setStudioData(prev => ({ ...prev, shopeeSessions: prev.shopeeSessions.filter(item => item.id !== s.id) }));
                        }}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Camera style={{ color: 'var(--primary)' }} /> Input & Scan Screenshot Shopee Live</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>

            {!scannedPreview && !scanning && (
              <label className="dropzone" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><UploadCloud style={{ width: 44, height: 44, color: 'var(--primary)' }} /></div>
                <h4 style={{ marginBottom: '6px' }}>Upload Screenshot HP Laporan Live di Sini</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Gemini AI akan membaca omset, pesanan, durasi, CTR, dan demografi</p>
                <span className="btn btn-primary btn-sm"><File /> Pilih Gambar Screenshot</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            )}

            {scanning && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Sparkles style={{ width: 44, height: 44, color: 'var(--accent-gold)' }} /></div>
                <h4>Gemini Vision AI Sedang Mengekstrak Data...</h4>
              </div>
            )}

            {scannedPreview && !scanning && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: 'var(--secondary-emerald)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle /> Periksa & Konfirmasi Data Laporan:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Judul Sesi Live</label>
                    <input className="form-input" value={scannedPreview.title} onChange={e => setScannedPreview({ ...scannedPreview, title: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Omset Penjualan (Rp)</label>
                    <input className="form-input" type="number" value={scannedPreview.revenue} onChange={e => setScannedPreview({ ...scannedPreview, revenue: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} onClick={handleSaveScannedSession}>
                  <Save /> Simpan Data ke Admin Portal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Gemini API Key */}
      {modalType === 'apiKey' && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Key style={{ color: 'var(--primary)' }} /> Pengaturan Gemini API Key</h3>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>
            <div className="form-group">
              <label className="form-label">Gemini API Key</label>
              <input className="form-input" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..." />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} onClick={() => { localStorage.setItem("gemini_api_key", apiKey); setModalType(null); }}>
              <Save /> Simpan API Key
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
