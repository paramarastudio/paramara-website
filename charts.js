/**
 * Chart.js Integration Module for Shopee Live AI Tracker
 */

let revenueChartInstance = null;
let trafficChartInstance = null;
let viewerGenderChartInstance = null;
let ageDistributionChartInstance = null;

export function renderDashboardCharts(sessions) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js belum dimuat.");
    return;
  }

  // 1. Revenue & Views Trend Chart
  renderRevenueTrendChart(sessions);

  // 2. Traffic Sources Breakdown Chart (Aggregate or latest session)
  renderTrafficChart(sessions);

  // 3. Demographics Charts
  renderDemographicCharts(sessions[0]); // latest session demo
}

function renderRevenueTrendChart(sessions) {
  const ctx = document.getElementById("revenueTrendChart")?.getContext("2d");
  if (!ctx) return;

  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  const sortedSessions = [...sessions].reverse(); // oldest to newest
  const labels = sortedSessions.map(s => s.dateFormatted || s.startTime || "Live");
  const revenues = sortedSessions.map(s => s.revenue || 0);
  const orders = sortedSessions.map(s => s.totalOrders || 0);

  revenueChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Omset Penjualan (Rp)',
          data: revenues,
          borderColor: '#FF5722',
          backgroundColor: 'rgba(255, 87, 34, 0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          yAxisID: 'y'
        },
        {
          label: 'Total Pesanan',
          data: orders,
          borderColor: '#00E676',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 5,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          labels: { color: '#94A3B8', font: { family: 'Inter', size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.dataset.yAxisID === 'y') {
                return ` Omset: Rp ${context.raw.toLocaleString('id-ID')}`;
              }
              return ` Pesanan: ${context.raw} order`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748B' },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: {
            color: '#FF5722',
            callback: (val) => 'Rp ' + val.toLocaleString('id-ID')
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: { color: '#00E676', precision: 0 },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

function renderTrafficChart(sessions) {
  const ctx = document.getElementById("trafficSourceChart")?.getContext("2d");
  if (!ctx) return;

  if (trafficChartInstance) {
    trafficChartInstance.destroy();
  }

  const latestSession = sessions[0] || {};
  const sources = latestSession.trafficSources || [
    { name: "Video", percent: 18.0 },
    { name: "Tab Live & Video", percent: 14.0 },
    { name: "Beranda", percent: 11.0 },
    { name: "Lainnya", percent: 57.0 }
  ];

  trafficChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sources.map(s => s.name),
      datasets: [{
        data: sources.map(s => s.percent),
        backgroundColor: ['#2979FF', '#7C4DFF', '#00E676', '#FF5722'],
        borderWidth: 2,
        borderColor: '#0B0E14'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94A3B8', font: { family: 'Inter', size: 11 } }
        }
      },
      cutout: '70%'
    }
  });
}

function renderDemographicCharts(session) {
  if (!session) return;

  // Viewer Gender Chart
  const ctxGender = document.getElementById("viewerGenderChart")?.getContext("2d");
  if (ctxGender) {
    if (viewerGenderChartInstance) viewerGenderChartInstance.destroy();
    const g = session.viewerProfile?.gender || { male: 47.1, female: 41.2, unknown: 11.8 };
    viewerGenderChartInstance = new Chart(ctxGender, {
      type: 'pie',
      data: {
        labels: ['Laki-laki', 'Perempuan', 'Tidak Diketahui'],
        datasets: [{
          data: [g.male, g.female, g.unknown],
          backgroundColor: ['#FF5252', '#00E676', '#2979FF']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94A3B8' } } }
      }
    });
  }

  // Age Distribution Chart
  const ctxAge = document.getElementById("ageDistributionChart")?.getContext("2d");
  if (ctxAge) {
    if (ageDistributionChartInstance) ageDistributionChartInstance.destroy();
    const ages = session.viewerProfile?.ageDistribution || [
      { range: "18-24", percent: 6 },
      { range: "25-34", percent: 29 },
      { range: "35-44", percent: 29 },
      { range: "45+", percent: 6 },
      { range: "Tdk Diketahui", percent: 29 }
    ];
    ageDistributionChartInstance = new Chart(ctxAge, {
      type: 'bar',
      data: {
        labels: ages.map(a => a.range),
        datasets: [{
          label: 'Persentase Umur (%)',
          data: ages.map(a => a.percent),
          backgroundColor: '#FFC107',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94A3B8' } },
          y: { ticks: { color: '#94A3B8', callback: v => v + '%' } }
        }
      }
    });
  }
}
