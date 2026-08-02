import { INITIAL_SESSIONS } from './sample-data.js';
import { analyzeShopeeScreenshot } from './gemini-service.js';
import { renderDashboardCharts } from './charts.js';

// ==========================================
// Application State
// ==========================================
let sessions = [];
let apiKey = localStorage.getItem("gemini_api_key") || "";
let brandConfig = JSON.parse(localStorage.getItem("brand_config") || JSON.stringify({
  storeName: "Paramara Studio",
  logoUrl: "",
  primaryColor: "#FF5722",
  themeMode: "dark"
}));

let currentScannedData = null; // Temporary scanned data before user saves

// ==========================================
// Initialization
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  initSessionsData();
  applyBrandConfig();
  initTheme();
  setupEventListeners();
  renderAllViews();
});

function initSessionsData() {
  const saved = localStorage.getItem("shopee_live_sessions");
  if (saved) {
    try {
      sessions = JSON.parse(saved);
    } catch (e) {
      sessions = INITIAL_SESSIONS;
    }
  } else {
    sessions = INITIAL_SESSIONS;
    saveSessions();
  }
}

function saveSessions() {
  localStorage.setItem("shopee_live_sessions", JSON.stringify(sessions));
}

function applyBrandConfig() {
  // Update Brand Title
  const brandTitleEl = document.getElementById("brandTitleText");
  if (brandTitleEl) brandTitleEl.textContent = brandConfig.storeName;

  // Update Brand Logo
  const logoImgEl = document.getElementById("brandLogoImg");
  const logoFallbackEl = document.getElementById("brandLogoFallback");

  if (brandConfig.logoUrl) {
    if (logoImgEl) {
      logoImgEl.src = brandConfig.logoUrl;
      logoImgEl.style.display = "block";
    }
    if (logoFallbackEl) logoFallbackEl.style.display = "none";
  } else {
    if (logoImgEl) logoImgEl.style.display = "none";
    if (logoFallbackEl) {
      logoFallbackEl.style.display = "flex";
      logoFallbackEl.textContent = (brandConfig.storeName[0] || "P").toUpperCase();
    }
  }

  // Update CSS Variables for Primary Color
  document.documentElement.style.setProperty("--primary", brandConfig.primaryColor);
  document.documentElement.style.setProperty("--primary-hover", brandConfig.primaryColor);
  document.documentElement.style.setProperty("--primary-glow", `${brandConfig.primaryColor}40`);

  // Fill Branding Settings Form Inputs
  const inputStoreName = document.getElementById("settingStoreName");
  if (inputStoreName) inputStoreName.value = brandConfig.storeName;
}

function initTheme() {
  document.documentElement.setAttribute("data-theme", brandConfig.themeMode || "dark");
}

// ==========================================
// Render Logic
// ==========================================
function renderAllViews() {
  renderKPICards();
  renderDashboardCharts(sessions);
  renderAISummary();
  renderDataTable();
  renderDemographicsView();
}

function renderKPICards() {
  const totalRev = sessions.reduce((acc, s) => acc + (s.revenue || 0), 0);
  const totalLive = sessions.length;
  const avgRev = totalLive > 0 ? Math.round(totalRev / totalLive) : 0;
  const totalViews = sessions.reduce((acc, s) => acc + (s.totalViews || 0), 0);
  const totalOrders = sessions.reduce((acc, s) => acc + (s.totalOrders || 0), 0);

  document.getElementById("kpiTotalRevenue").textContent = `Rp ${totalRev.toLocaleString('id-ID')}`;
  document.getElementById("kpiTotalSessions").textContent = `${totalLive} Sesi`;
  document.getElementById("kpiAvgRevenue").textContent = `Rp ${avgRev.toLocaleString('id-ID')}`;
  document.getElementById("kpiTotalViews").textContent = `${totalViews.toLocaleString('id-ID')}`;
  document.getElementById("kpiTotalOrders").textContent = `${totalOrders} Pesanan`;
}

function renderAISummary() {
  const container = document.getElementById("aiExecutiveSummaryText");
  if (!container) return;

  if (sessions.length === 0) {
    container.textContent = "Belum ada data sesi live. Unggah screenshot laporan Shopee Live untuk mendapatkan rekomendasi otomatis dari Gemini AI.";
    return;
  }

  const latest = sessions[0];
  container.innerHTML = `
    <strong>Insight Sesi Terbaru (${latest.title || 'Live'}):</strong><br/>
    ${latest.aiSummary || 'Sesi ini berjalan baik dengan total omset Rp' + (latest.revenue || 0).toLocaleString('id-ID') + '. Disarankan untuk mempertahankan durasi dan meningkatkan jumlah produk rekomendasi.'}
  `;
}

function renderDataTable() {
  const tbody = document.getElementById("sessionsTableBody");
  if (!tbody) return;

  if (sessions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">Belum ada data sesi live. Klik "Scan Screenshot AI" untuk memasukkan data.</td></tr>`;
    return;
  }

  const searchTerm = (document.getElementById("tableSearchInput")?.value || "").toLowerCase();

  const filtered = sessions.filter(s => 
    (s.title || "").toLowerCase().includes(searchTerm) || 
    (s.host || "").toLowerCase().includes(searchTerm)
  );

  tbody.innerHTML = filtered.map((s, index) => `
    <tr>
      <td><strong>${s.title || 'Sesi Live'}</strong><br/><small style="color: var(--text-dim);">${s.dateFormatted || s.startTime || '-'}</small></td>
      <td>${s.duration || '-'}</td>
      <td class="text-success" style="font-weight: 700;">Rp ${(s.revenue || 0).toLocaleString('id-ID')}</td>
      <td>${s.totalOrders || 0} pesanan</td>
      <td>${s.totalViews || 0} penonton</td>
      <td><span class="brand-badge">${s.clickRatePercent || 0}% CTR</span></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="window.viewSessionDetails('${s.id}')">Detail</button>
        <button class="btn btn-sm btn-secondary" style="color: #FF5252;" onclick="window.deleteSession('${s.id}')">Hapus</button>
      </td>
    </tr>
  `).join("");
}

function renderDemographicsView() {
  const container = document.getElementById("demographicsDetailsContainer");
  if (!container) return;

  const latest = sessions[0];
  if (!latest) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 3rem;">Data demografi penonton & pembeli belum tersedia.</div>`;
    return;
  }

  const vp = latest.viewerProfile || {};
  const bp = latest.buyerProfile || {};

  container.innerHTML = `
    <div class="demographics-grid">
      <!-- Penonton Gender & Follower -->
      <div class="glass-card chart-card">
        <h3>👀 Profil Penonton</h3>
        <div class="stat-bar-group">
          <div class="stat-bar-item">
            <div class="stat-bar-label"><span>Bukan Pengikut (Non-Followers)</span><span>${vp.identity?.nonFollowers || 0}%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width: ${vp.identity?.nonFollowers || 0}%;"></div></div>
          </div>
          <div class="stat-bar-item">
            <div class="stat-bar-label"><span>Pengikut (Followers)</span><span>${vp.identity?.followers || 0}%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width: ${vp.identity?.followers || 0}%; background: var(--secondary);"></div></div>
          </div>
        </div>
      </div>

      <!-- Pembeli Demografi -->
      <div class="glass-card chart-card">
        <h3>🛍️ Profil Pembeli</h3>
        <div class="stat-bar-group">
          <div class="stat-bar-item">
            <div class="stat-bar-label"><span>Laki-Laki</span><span>${bp.gender?.male || 0}%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width: ${bp.gender?.male || 0}%;"></div></div>
          </div>
          <div class="stat-bar-item">
            <div class="stat-bar-label"><span>Perempuan</span><span>${bp.gender?.female || 0}%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width: ${bp.gender?.female || 0}%; background: #FF5252;"></div></div>
          </div>
        </div>
        <div style="margin-top: 1rem;">
          <h4 style="font-size: 0.85rem; color: var(--text-muted);">Lokasi Pembeli Terbanyak:</h4>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
            ${(bp.locations || [{city: "Kota Tangerang", percent: 50}, {city: "Kota Surabaya", percent: 50}]).map(loc => `
              <span class="brand-badge" style="background: rgba(255,255,255,0.05); color: var(--text-main); border-color: var(--border-color);">
                ${loc.city} (${loc.percent}%)
              </span>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// Event Listeners & Modals Logic
// ==========================================
function setupEventListeners() {
  // Tab Switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-target");
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.style.display = "block";
    });
  });

  // Modal Openers & Closers
  document.getElementById("btnOpenScanModal")?.addEventListener("click", () => openModal("scanModalOverlay"));
  document.getElementById("btnOpenApiKeyModal")?.addEventListener("click", () => {
    document.getElementById("inputApiKey").value = apiKey;
    openModal("apiKeyModalOverlay");
  });
  document.getElementById("btnOpenGitGuideModal")?.addEventListener("click", () => openModal("gitGuideModalOverlay"));

  document.querySelectorAll(".close-modal-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const overlay = e.target.closest(".modal-overlay");
      if (overlay) overlay.classList.remove("active");
    });
  });

  // Save API Key
  document.getElementById("btnSaveApiKey")?.addEventListener("click", () => {
    apiKey = document.getElementById("inputApiKey").value.trim();
    localStorage.setItem("gemini_api_key", apiKey);
    const statusEl = document.getElementById("apiKeyStatusBadge");
    if (statusEl) {
      statusEl.textContent = apiKey ? "API Key Aktif" : "Demo Mode";
      statusEl.className = apiKey ? "brand-badge text-success" : "brand-badge";
    }
    closeModal("apiKeyModalOverlay");
  });

  // Drag & Drop Screenshot Scanner
  const dropzone = document.getElementById("screenshotDropzone");
  const fileInput = document.getElementById("screenshotFileInput");

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        handleFileAnalysis(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleFileAnalysis(e.target.files[0]);
      }
    });
  }

  // Save Scanned Session Button
  document.getElementById("btnSaveScannedSession")?.addEventListener("click", () => {
    if (!currentScannedData) return;

    // Collect values from preview form
    currentScannedData.title = document.getElementById("previewTitle").value || currentScannedData.title;
    currentScannedData.revenue = parseInt(document.getElementById("previewRevenue").value) || currentScannedData.revenue;
    currentScannedData.totalOrders = parseInt(document.getElementById("previewOrders").value) || currentScannedData.totalOrders;
    currentScannedData.totalViews = parseInt(document.getElementById("previewViews").value) || currentScannedData.totalViews;
    currentScannedData.duration = document.getElementById("previewDuration").value || currentScannedData.duration;

    sessions.unshift(currentScannedData);
    saveSessions();
    renderAllViews();
    closeModal("scanModalOverlay");
    alert("Data sesi Shopee Live berhasil disimpan!");
  });

  // Table Search Input
  document.getElementById("tableSearchInput")?.addEventListener("input", renderDataTable);

  // Save Custom Branding Settings
  document.getElementById("btnSaveBranding")?.addEventListener("click", () => {
    brandConfig.storeName = document.getElementById("settingStoreName").value || "Paramara Studio";
    brandConfig.primaryColor = document.getElementById("settingPrimaryColor").value || "#FF5722";
    
    localStorage.setItem("brand_config", JSON.stringify(brandConfig));
    applyBrandConfig();
    alert("Pengaturan Branding Toko Berhasil Diperbarui!");
  });

  // Custom Logo Upload
  document.getElementById("inputLogoFile")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        brandConfig.logoUrl = evt.target.result;
        localStorage.setItem("brand_config", JSON.stringify(brandConfig));
        applyBrandConfig();
      };
      reader.readAsDataURL(file);
    }
  });

  // Theme Toggle Button
  document.getElementById("btnToggleTheme")?.addEventListener("click", () => {
    brandConfig.themeMode = brandConfig.themeMode === "dark" ? "light" : "dark";
    localStorage.setItem("brand_config", JSON.stringify(brandConfig));
    initTheme();
  });

  // Export CSV Button
  document.getElementById("btnExportCSV")?.addEventListener("click", exportSessionsToCSV);
}

// File Analysis Handler
async function handleFileAnalysis(file) {
  const loadingEl = document.getElementById("scanLoadingState");
  const formEl = document.getElementById("scanPreviewForm");
  const dropzone = document.getElementById("screenshotDropzone");

  if (dropzone) dropzone.style.display = "none";
  if (loadingEl) loadingEl.style.display = "block";
  if (formEl) formEl.style.display = "none";

  try {
    const parsedData = await analyzeShopeeScreenshot(file, apiKey);
    currentScannedData = parsedData;

    // Populate preview fields
    document.getElementById("previewTitle").value = parsedData.title || "";
    document.getElementById("previewRevenue").value = parsedData.revenue || 0;
    document.getElementById("previewOrders").value = parsedData.totalOrders || 0;
    document.getElementById("previewViews").value = parsedData.totalViews || 0;
    document.getElementById("previewDuration").value = parsedData.duration || "";
    document.getElementById("previewAISummary").textContent = parsedData.aiSummary || "";

    if (loadingEl) loadingEl.style.display = "none";
    if (formEl) formEl.style.display = "block";

  } catch (error) {
    alert("Gagal menganalisis screenshot: " + error.message);
    if (loadingEl) loadingEl.style.display = "none";
    if (dropzone) dropzone.style.display = "block";
  }
}

// Global Actions
window.viewSessionDetails = function(sessionId) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  const content = document.getElementById("detailModalContent");
  if (content) {
    content.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>${session.title || 'Sesi Live'}</h2>
        <p style="color: var(--text-dim);">Waktu: ${session.dateFormatted || session.startTime} | Durasi: ${session.duration}</p>
      </div>

      <div class="kpi-grid">
        <div class="glass-card kpi-card">
          <div class="kpi-title">Penjualan (Rp)</div>
          <div class="kpi-value text-success">Rp ${(session.revenue || 0).toLocaleString('id-ID')}</div>
        </div>
        <div class="glass-card kpi-card">
          <div class="kpi-title">Pesanan</div>
          <div class="kpi-value">${session.totalOrders || 0}</div>
        </div>
        <div class="glass-card kpi-card">
          <div class="kpi-title">Total Ditonton</div>
          <div class="kpi-value">${session.totalViews || 0}</div>
        </div>
        <div class="glass-card kpi-card">
          <div class="kpi-title">CTR Klik</div>
          <div class="kpi-value text-primary">${session.clickRatePercent || 0}%</div>
        </div>
      </div>

      <div style="margin-top: 1.5rem;">
        <h3>🛍️ Produk Terlaris</h3>
        <div class="table-wrapper" style="margin-top: 0.5rem;">
          <table>
            <thead>
              <tr>
                <th>Nama Produk</th>
                <th>Harga (Rp)</th>
                <th>Omset (Rp)</th>
                <th>Klik</th>
                <th>Masuk Keranjang</th>
              </tr>
            </thead>
            <tbody>
              ${(session.products || []).map(p => `
                <tr>
                  <td>${p.name}</td>
                  <td>Rp ${(p.price || 0).toLocaleString('id-ID')}</td>
                  <td class="text-success">Rp ${(p.revenue || 0).toLocaleString('id-ID')}</td>
                  <td>${p.clicks || 0}</td>
                  <td>${p.cartAdds || 0}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  openModal("detailModalOverlay");
};

window.deleteSession = function(sessionId) {
  if (confirm("Apakah Anda yakin ingin menghapus data sesi live ini?")) {
    sessions = sessions.filter(s => s.id !== sessionId);
    saveSessions();
    renderAllViews();
  }
};

function exportSessionsToCSV() {
  if (sessions.length === 0) {
    alert("Tidak ada data sesi untuk diekspor.");
    return;
  }

  const headers = ["Judul", "Waktu", "Durasi", "Omset (Rp)", "Pesanan", "Total Views", "CTR (%)", "Likes"];
  const rows = sessions.map(s => [
    `"${s.title || ''}"`,
    `"${s.dateFormatted || s.startTime || ''}"`,
    `"${s.duration || ''}"`,
    s.revenue || 0,
    s.totalOrders || 0,
    s.totalViews || 0,
    s.clickRatePercent || 0,
    s.likes || 0
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Shopee_Live_Report_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function openModal(id) {
  document.getElementById(id)?.classList.add("active");
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("active");
}
