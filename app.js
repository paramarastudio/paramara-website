import { INITIAL_STUDIO_DATA } from './sample-data.js';
import { analyzeShopeeScreenshot } from './gemini-service.js';
import { renderDashboardCharts } from './charts.js';

// ==========================================
// Paramara Studio Admin Portal State
// ==========================================
let studioData = {};
let apiKey = localStorage.getItem("gemini_api_key") || "";
let currentScannedData = null;

// ==========================================
// Initialization
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  initStudioData();
  applyStudioBranding();
  initTheme();
  setupEventListeners();
  renderAllViews();
});

function initStudioData() {
  const saved = localStorage.getItem("paramara_studio_admin_data");
  if (saved) {
    try {
      studioData = JSON.parse(saved);
    } catch (e) {
      studioData = INITIAL_STUDIO_DATA;
    }
  } else {
    studioData = INITIAL_STUDIO_DATA;
    saveStudioData();
  }

  // Ensure default arrays exist
  if (!studioData.shopeeSessions) studioData.shopeeSessions = INITIAL_STUDIO_DATA.shopeeSessions;
  if (!studioData.clientProjects) studioData.clientProjects = INITIAL_STUDIO_DATA.clientProjects;
  if (!studioData.liveSchedules) studioData.liveSchedules = INITIAL_STUDIO_DATA.liveSchedules;
  if (!studioData.studioInfo) studioData.studioInfo = INITIAL_STUDIO_DATA.studioInfo;
}

function saveStudioData() {
  localStorage.setItem("paramara_studio_admin_data", JSON.stringify(studioData));
}

function applyStudioBranding() {
  const info = studioData.studioInfo || INITIAL_STUDIO_DATA.studioInfo;

  // Title & Tagline
  const brandTitleEl = document.getElementById("brandTitleText");
  if (brandTitleEl) brandTitleEl.textContent = info.name || "Paramara Studio";

  const brandTaglineEl = document.getElementById("brandTaglineText");
  if (brandTaglineEl) brandTaglineEl.textContent = info.tagline || "Internal Admin Portal";

  // Logo Preview
  const logoImgEl = document.getElementById("brandLogoImg");
  const logoFallbackEl = document.getElementById("brandLogoFallback");

  if (info.logoUrl) {
    if (logoImgEl) {
      logoImgEl.src = info.logoUrl;
      logoImgEl.style.display = "block";
    }
    if (logoFallbackEl) logoFallbackEl.style.display = "none";
  } else {
    if (logoImgEl) logoImgEl.style.display = "none";
    if (logoFallbackEl) {
      logoFallbackEl.style.display = "flex";
      logoFallbackEl.textContent = (info.name[0] || "P").toUpperCase();
    }
  }

  // CSS Colors
  document.documentElement.style.setProperty("--primary", info.primaryColor || "#FF5722");
  document.documentElement.style.setProperty("--primary-glow", `${info.primaryColor || '#FF5722'}40`);

  // Fill Settings Inputs
  const inputName = document.getElementById("settingStoreName");
  if (inputName) inputName.value = info.name;
}

function initTheme() {
  const theme = studioData.studioInfo?.themeMode || "dark";
  document.documentElement.setAttribute("data-theme", theme);
}

// ==========================================
// Render Logic
// ==========================================
function renderAllViews() {
  renderKPICards();
  renderDashboardCharts(studioData.shopeeSessions);
  renderAISummary();
  renderShopeeSessionsTable();
  renderProjectsTable();
  renderSchedulesTable();
}

function renderKPICards() {
  const sessions = studioData.shopeeSessions || [];
  const projects = studioData.clientProjects || [];

  const totalShopeeRev = sessions.reduce((acc, s) => acc + (s.revenue || 0), 0);
  const totalProjectRev = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  const totalCombinedIncome = totalShopeeRev + totalProjectRev;
  const activeProjectsCount = projects.filter(p => p.status === "Aktif").length;

  document.getElementById("kpiTotalCombinedIncome").textContent = `Rp ${totalCombinedIncome.toLocaleString('id-ID')}`;
  document.getElementById("kpiShopeeRevenue").textContent = `Rp ${totalShopeeRev.toLocaleString('id-ID')}`;
  document.getElementById("kpiActiveProjects").textContent = `${activeProjectsCount} Proyek`;
  document.getElementById("kpiTotalLiveSessions").textContent = `${sessions.length} Sesi`;
}

function renderAISummary() {
  const container = document.getElementById("aiExecutiveSummaryText");
  if (!container) return;

  const sessions = studioData.shopeeSessions || [];
  if (sessions.length === 0) {
    container.textContent = "Belum ada data laporan live streaming. Silakan unggah screenshot melalui portal admin internal ini.";
    return;
  }

  const latest = sessions[0];
  container.innerHTML = `
    <strong>Insight Admin Sesi Live Terbaru (${latest.title || 'Sesi Live'}):</strong><br/>
    ${latest.aiSummary || 'Sesi live berjalan optimal dengan total omset Rp' + (latest.revenue || 0).toLocaleString('id-ID') + '. Pertahankan frekuensi live streaming studio.'}
  `;
}

function renderShopeeSessionsTable() {
  const tbody = document.getElementById("sessionsTableBody");
  if (!tbody) return;

  const sessions = studioData.shopeeSessions || [];
  if (sessions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">Belum ada data Shopee Live.</td></tr>`;
    return;
  }

  tbody.innerHTML = sessions.map(s => `
    <tr>
      <td><strong>${s.title || 'Sesi Live'}</strong><br/><small style="color: var(--text-dim);">${s.dateFormatted || s.startTime || '-'}</small></td>
      <td>${s.duration || '-'}</td>
      <td class="text-success" style="font-weight: 700;">Rp ${(s.revenue || 0).toLocaleString('id-ID')}</td>
      <td>${s.totalOrders || 0} pesanan</td>
      <td>${s.totalViews || 0} penonton</td>
      <td><span class="brand-badge">${s.clickRatePercent || 0}% CTR</span></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="window.viewSessionDetails('${s.id}')">Detail</button>
        <button class="btn btn-sm btn-secondary" style="color: #FF5252;" onclick="window.deleteShopeeSession('${s.id}')">Hapus</button>
      </td>
    </tr>
  `).join("");
}

function renderProjectsTable() {
  const tbody = document.getElementById("projectsTableBody");
  if (!tbody) return;

  const projects = studioData.clientProjects || [];
  if (projects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">Belum ada data proyek studio.</td></tr>`;
    return;
  }

  tbody.innerHTML = projects.map(p => `
    <tr>
      <td><strong>${p.clientName}</strong></td>
      <td>${p.projectTitle}<br/><small style="color: var(--text-dim);">${p.category}</small></td>
      <td class="text-success" style="font-weight: 700;">Rp ${(p.budget || 0).toLocaleString('id-ID')}</td>
      <td><span class="brand-badge" style="background: ${p.status === 'Aktif' ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.08)'}; color: ${p.status === 'Aktif' ? '#00E676' : 'var(--text-muted)'};">${p.status}</span></td>
      <td>${p.deadline}</td>
      <td>
        <button class="btn btn-sm btn-secondary" style="color: #FF5252;" onclick="window.deleteStudioProject('${p.id}')">Hapus</button>
      </td>
    </tr>
  `).join("");
}

function renderSchedulesTable() {
  const tbody = document.getElementById("schedulesTableBody");
  if (!tbody) return;

  const schedules = studioData.liveSchedules || [];
  if (schedules.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">Belum ada jadwal stream host.</td></tr>`;
    return;
  }

  tbody.innerHTML = schedules.map(sch => `
    <tr>
      <td><strong>${sch.title}</strong></td>
      <td>${sch.hostName}</td>
      <td>${sch.scheduleTime}</td>
      <td><span class="brand-badge">${sch.status}</span></td>
      <td>
        <button class="btn btn-sm btn-secondary" style="color: #FF5252;" onclick="window.deleteLiveSchedule('${sch.id}')">Hapus</button>
      </td>
    </tr>
  `).join("");
}

// ==========================================
// Event Listeners & Modals Logic
// ==========================================
function setupEventListeners() {
  // Navigation Tabs
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

  // Modal Openers
  document.getElementById("btnOpenScanModal")?.addEventListener("click", () => openModal("scanModalOverlay"));
  document.getElementById("btnOpenApiKeyModal")?.addEventListener("click", () => {
    document.getElementById("inputApiKey").value = apiKey;
    openModal("apiKeyModalOverlay");
  });
  document.getElementById("btnOpenGitGuideModal")?.addEventListener("click", () => openModal("gitGuideModalOverlay"));
  document.getElementById("btnOpenAddProjectModal")?.addEventListener("click", () => openModal("projectModalOverlay"));
  document.getElementById("btnOpenAddScheduleModal")?.addEventListener("click", () => openModal("scheduleModalOverlay"));

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
      statusEl.textContent = apiKey ? "Gemini API Active" : "Demo Mode";
      statusEl.className = apiKey ? "brand-badge text-success" : "brand-badge";
    }
    closeModal("apiKeyModalOverlay");
  });

  // Add Studio Project Form
  document.getElementById("btnSaveProject")?.addEventListener("click", () => {
    const clientName = document.getElementById("projClientName").value.trim();
    const projectTitle = document.getElementById("projTitle").value.trim();
    const category = document.getElementById("projCategory").value;
    const budget = parseInt(document.getElementById("projBudget").value) || 0;
    const deadline = document.getElementById("projDeadline").value || "2026-08-31";

    if (!clientName || !projectTitle) {
      alert("Mohon isi Nama Klien dan Judul Proyek!");
      return;
    }

    const newProject = {
      id: "proj_" + Date.now(),
      clientName,
      projectTitle,
      category,
      budget,
      status: "Aktif",
      deadline,
      notes: "Proyek baru diinput via admin portal"
    };

    studioData.clientProjects.unshift(newProject);
    saveStudioData();
    renderAllViews();
    closeModal("projectModalOverlay");
  });

  // Add Live Schedule Form
  document.getElementById("btnSaveSchedule")?.addEventListener("click", () => {
    const title = document.getElementById("schedTitle").value.trim();
    const hostName = document.getElementById("schedHostName").value.trim();
    const scheduleTime = document.getElementById("schedTime").value || "Hari ini 19:00";

    if (!title || !hostName) {
      alert("Mohon isi Judul Sesi Stream dan Nama Host!");
      return;
    }

    const newSched = {
      id: "sched_" + Date.now(),
      title,
      hostName,
      platform: "Shopee Live",
      scheduleTime,
      status: "Terjadwal"
    };

    studioData.liveSchedules.unshift(newSched);
    saveStudioData();
    renderAllViews();
    closeModal("scheduleModalOverlay");
  });

  // Screenshot Scanner File Upload
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
      if (e.dataTransfer.files.length > 0) handleFileAnalysis(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) handleFileAnalysis(e.target.files[0]);
    });
  }

  // Save Scanned Shopee Live Session
  document.getElementById("btnSaveScannedSession")?.addEventListener("click", () => {
    if (!currentScannedData) return;

    currentScannedData.title = document.getElementById("previewTitle").value || currentScannedData.title;
    currentScannedData.revenue = parseInt(document.getElementById("previewRevenue").value) || currentScannedData.revenue;
    currentScannedData.totalOrders = parseInt(document.getElementById("previewOrders").value) || currentScannedData.totalOrders;

    studioData.shopeeSessions.unshift(currentScannedData);
    saveStudioData();
    renderAllViews();
    closeModal("scanModalOverlay");
    alert("Data sesi Shopee Live berhasil diinput ke portal admin!");
  });

  // Save Branding Settings
  document.getElementById("btnSaveBranding")?.addEventListener("click", () => {
    studioData.studioInfo.name = document.getElementById("settingStoreName").value || "Paramara Studio";
    studioData.studioInfo.primaryColor = document.getElementById("settingPrimaryColor").value || "#FF5722";
    
    saveStudioData();
    applyStudioBranding();
    alert("Pengaturan Admin Portal Berhasil Disimpan!");
  });

  // Logo File Change
  document.getElementById("inputLogoFile")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        studioData.studioInfo.logoUrl = evt.target.result;
        saveStudioData();
        applyStudioBranding();
      };
      reader.readAsDataURL(file);
    }
  });

  // Theme Toggle Button
  document.getElementById("btnToggleTheme")?.addEventListener("click", () => {
    studioData.studioInfo.themeMode = studioData.studioInfo.themeMode === "dark" ? "light" : "dark";
    saveStudioData();
    initTheme();
  });
}

// AI File Scanner Processor
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

    document.getElementById("previewTitle").value = parsedData.title || "";
    document.getElementById("previewRevenue").value = parsedData.revenue || 0;
    document.getElementById("previewOrders").value = parsedData.totalOrders || 0;
    document.getElementById("previewViews").value = parsedData.totalViews || 0;
    document.getElementById("previewDuration").value = parsedData.duration || "";
    document.getElementById("previewAISummary").textContent = parsedData.aiSummary || "";

    if (loadingEl) loadingEl.style.display = "none";
    if (formEl) formEl.style.display = "block";

  } catch (error) {
    alert("Gagal membaca screenshot: " + error.message);
    if (loadingEl) loadingEl.style.display = "none";
    if (dropzone) dropzone.style.display = "block";
  }
}

// Global Actions
window.deleteShopeeSession = function(id) {
  if (confirm("Hapus data sesi Shopee Live ini dari admin portal?")) {
    studioData.shopeeSessions = studioData.shopeeSessions.filter(s => s.id !== id);
    saveStudioData();
    renderAllViews();
  }
};

window.deleteStudioProject = function(id) {
  if (confirm("Hapus data proyek studio ini?")) {
    studioData.clientProjects = studioData.clientProjects.filter(p => p.id !== id);
    saveStudioData();
    renderAllViews();
  }
};

window.deleteLiveSchedule = function(id) {
  if (confirm("Hapus jadwal stream ini?")) {
    studioData.liveSchedules = studioData.liveSchedules.filter(s => s.id !== id);
    saveStudioData();
    renderAllViews();
  }
};

window.viewSessionDetails = function(sessionId) {
  const session = studioData.shopeeSessions.find(s => s.id === sessionId);
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
    `;
  }

  openModal("detailModalOverlay");
};

function openModal(id) {
  document.getElementById(id)?.classList.add("active");
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("active");
}
