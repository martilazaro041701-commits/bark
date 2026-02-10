const API_BASE_CHARTS = window.API_BASE || "/api";

const chartEl = (selector) => document.querySelector(selector);

const chartFormatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);

const chartFormatCount = (value, label) => `${value || 0} ${label}`;

const setDefaultDates = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  chartEl("#chartStartDate").value = start.toISOString().slice(0, 10);
  chartEl("#chartEndDate").value = end.toISOString().slice(0, 10);
};

const buildUrl = () => {
  const start = chartEl("#chartStartDate").value;
  const end = chartEl("#chartEndDate").value;
  const params = new URLSearchParams();
  if (start) params.append("start_date", start);
  if (end) params.append("end_date", end);
  return `${API_BASE_CHARTS}/charts/?${params.toString()}`;
};

let mainChart = null;

const createChart = (ctx, config, existing) => {
  if (existing) existing.destroy();
  return new Chart(ctx, config);
};

const renderPhaseConcentration = (items) => {
  const list = chartEl("#phaseConcentrationList");
  if (!list) return;
  if (!items || items.length === 0) {
    list.innerHTML = "<div class=\"subtitle\">No data</div>";
    return;
  }
  list.innerHTML = items
    .slice(0, 6)
    .map(
      (item) =>
        `<div class="metric-row"><span>${item.label}</span><strong>${item.value}</strong></div>`
    )
    .join("");
};

const getDayCount = (data) => {
  if (!data?.range?.start_date || !data?.range?.end_date) return 0;
  const start = new Date(`${data.range.start_date}T00:00:00`);
  const end = new Date(`${data.range.end_date}T00:00:00`);
  const diff = Math.floor((end - start) / 86400000) + 1;
  return Math.max(diff, 0);
};

const aggregateMonthly = (labels, values, startDate) => {
  if (!labels.length || !values.length) return { labels: [], values: [] };
  const buckets = new Map();
  const start = new Date(`${startDate}T00:00:00`);
  values.forEach((value, idx) => {
    const date = new Date(start);
    date.setDate(start.getDate() + idx);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) || 0) + (value || 0));
  });
  const outLabels = [];
  const outValues = [];
  Array.from(buckets.keys())
    .sort()
    .forEach((key) => {
      const [year, month] = key.split("-");
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      outLabels.push(label);
      outValues.push(buckets.get(key));
    });
  return { labels: outLabels, values: outValues };
};

const buildDailyFallback = (data) => {
  const dayCount = getDayCount(data);
  if (!dayCount || !data?.range?.start_date) return { labels: [], values: [] };
  const labels = [];
  const values = [];
  const start = new Date(`${data.range.start_date}T00:00:00`);
  for (let i = 0; i < dayCount; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    labels.push(
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    );
    values.push(0);
  }
  return { labels, values };
};

const buildTimeSeries = (series, data) => {
  const dayCount = getDayCount(data);
  const safeSeries = series?.labels?.length ? series : buildDailyFallback(data);
  if (dayCount > 90) {
    return aggregateMonthly(safeSeries.labels, safeSeries.values, data.range.start_date);
  }
  return safeSeries;
};

const buildMainChartConfig = (metric, data) => {
  const palette = ["#1f6cff", "#12b981", "#f59e0b", "#ef4444", "#7c3aed", "#10b981"];

  if (metric === "repairsIn") {
    const series = buildTimeSeries(data.repairsIn, data);
    return {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Repairs In",
            data: series.values,
            borderColor: "#1f6cff",
            backgroundColor: "rgba(31,108,255,0.2)",
            tension: 0.35,
            fill: true,
          },
        ],
      },
    };
  }
  if (metric === "repairsOut") {
    const series = buildTimeSeries(data.repairsOut, data);
    return {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Repairs Out",
            data: series.values,
            borderColor: "#12b981",
            backgroundColor: "rgba(18,185,129,0.2)",
            tension: 0.35,
            fill: true,
          },
        ],
      },
    };
  }
  if (metric === "estimatesMade") {
    const series = buildTimeSeries(data.estimatesMade, data);
    return {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Estimates Made",
            data: series.values,
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245,158,11,0.2)",
            tension: 0.35,
            fill: true,
          },
        ],
      },
    };
  }
  if (metric === "insuranceDistribution") {
    return {
      type: "bar",
      data: {
        labels: data.insuranceDistribution.map((d) => d.label),
        datasets: [
          {
            data: data.insuranceDistribution.map((d) => d.value),
            backgroundColor: "rgba(193, 59, 90, 0.65)",
            borderRadius: 10,
          },
        ],
      },
    };
  }
  if (metric === "carModelDistribution") {
    return {
      type: "bar",
      data: {
        labels: data.carModelDistribution.map((d) => d.label),
        datasets: [
          {
            data: data.carModelDistribution.map((d) => d.value),
            backgroundColor: "rgba(249, 112, 62, 0.65)",
            borderRadius: 10,
          },
        ],
      },
    };
  }
  return {
    type: "bar",
    data: {
      labels: data.phaseConcentration.map((d) => d.label),
      datasets: [
        {
          label: "Current Jobs",
          data: data.phaseConcentration.map((d) => d.value),
          backgroundColor: "rgba(31,108,255,0.6)",
          borderRadius: 8,
        },
      ],
    },
  };
};

const renderCharts = (data) => {
  const metric = chartEl("#chartMetric").value;
  const metricTitleMap = {
    repairsIn: "Repairs In (Daily)",
    repairsOut: "Repairs Out (Daily)",
    estimatesMade: "Estimates Made (Daily)",
    insuranceDistribution: "Insurance Claim Distribution",
    carModelDistribution: "Cars Repaired Distribution",
    phaseConcentration: "Job Phase Concentration",
  };
  chartEl("#chartTitle").textContent = metricTitleMap[metric] || "Chart";

  const mainConfig = buildMainChartConfig(metric, data);
  mainConfig.options = {
    responsive: true,
    plugins: { legend: { display: metric !== "repairsIn" && metric !== "repairsOut" && metric !== "estimatesMade" } },
  };

  requestAnimationFrame(() => {
    mainChart = createChart(chartEl("#mainChart"), mainConfig, mainChart);
    requestAnimationFrame(() => {
      if (mainChart) mainChart.resize();
    });
  });


  const pendingBilledValue = chartEl("#pendingBilledValue");
  const pendingBilledCount = chartEl("#pendingBilledCount");
  const approvedLoaValue = chartEl("#approvedLoaValue");
  const approvedLoaCount = chartEl("#approvedLoaCount");

  if (pendingBilledValue) pendingBilledValue.textContent = chartFormatCurrency(data.pendingBilled.total);
  if (pendingBilledCount) pendingBilledCount.textContent = chartFormatCount(data.pendingBilled.count, "jobs");
  if (approvedLoaValue) approvedLoaValue.textContent = chartFormatCurrency(data.approvedLoa.total);
  if (approvedLoaCount) approvedLoaCount.textContent = chartFormatCount(data.approvedLoa.count, "approvals");

  renderPhaseConcentration(data.phaseConcentration);

  requestAnimationFrame(() => {
    if (mainChart) mainChart.resize();
    // main chart only now
  });
};

const loadCharts = async () => {
  const chartsView = document.getElementById("chartsView");
  if (chartsView && !chartsView.classList.contains("active-view")) return;
  const response = await fetch(buildUrl());
  if (!response.ok) return;
  const data = await response.json();
  renderCharts(data);
};

const filterOptions = () => {
  const query = chartEl("#chartSearch").value.trim().toLowerCase();
  const options = Array.from(chartEl("#chartMetric").options);
  options.forEach((opt) => {
    opt.hidden = query && !opt.textContent.toLowerCase().includes(query);
  });
};

const init = () => {
  setDefaultDates();
  const chartsView = document.getElementById("chartsView");
  if (chartsView && chartsView.classList.contains("active-view")) {
    loadCharts();
  }
  chartEl("#chartApply").addEventListener("click", loadCharts);
  chartEl("#chartMetric").addEventListener("change", loadCharts);
  chartEl("#chartSearch").addEventListener("input", filterOptions);
  if (window.gsap) {
    const items = document.querySelectorAll(".animate-in, .pop-in");
    gsap.set(items, { opacity: 0, y: 18, scale: 0.98 });
    gsap.to(items, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      ease: "power4.out",
      stagger: 0.08,
    });
  }
};

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("view:charts", loadCharts);
