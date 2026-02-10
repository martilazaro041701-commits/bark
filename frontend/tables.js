const API_BASE_TABLES = window.API_BASE || "/api";

const tableEl = (selector) => document.querySelector(selector);

const setTableDefaultDates = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  tableEl("#tableStartDate").value = start.toISOString().slice(0, 10);
  tableEl("#tableEndDate").value = end.toISOString().slice(0, 10);
};

const buildTableUrl = () => {
  const start = tableEl("#tableStartDate").value;
  const end = tableEl("#tableEndDate").value;
  const params = new URLSearchParams();
  if (start) params.append("start_date", start);
  if (end) params.append("end_date", end);
  return `${API_BASE_TABLES}/tables/?${params.toString()}`;
};

const tableFormatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return "--";
  const hours = seconds / 3600;
  if (hours >= 24) {
    return `${(hours / 24).toFixed(1)} days`;
  }
  return `${hours.toFixed(1)} hrs`;
};

const renderTable = (columns, rows) => {
  const head = tableEl("#tableHead");
  const body = tableEl("#tableBody");
  if (!head || !body) return;
  head.innerHTML = columns.map((col) => `<span>${col}</span>`).join("");
  body.innerHTML = rows
    .map(
      (row) =>
        `<div class="table-row">${row.map((cell) => `<span>${cell}</span>`).join("")}</div>`
    )
    .join("");
};

const renderMetric = (metric, data) => {
  if (!data) return;
  const titleMap = {
    phaseCycleTimes: "Average Time by Phase",
    loaApprovalByInsurance: "LOA Approval Time by Insurance",
    paymentSpeedByInsurance: "Payment Speed by Insurance",
    repairTimeByPriceRange: "Repair Time by Price Range",
    repairTimeByModel: "Repair Time by Car Model",
    repairTimeByModelPrice: "Repair Time by Model + Price Range",
  };
  const titleEl = tableEl("#tableTitle");
  if (titleEl) titleEl.textContent = titleMap[metric] || "Table";

  if (metric === "phaseCycleTimes") {
    renderTable(
      ["Phase", "Average Time"],
      data.phaseCycleTimes.map((item) => [item.phase, tableFormatDuration(item.avg_seconds)])
    );
    return;
  }
  if (metric === "loaApprovalByInsurance") {
    renderTable(
      ["Insurance", "Average Time"],
      data.loaApprovalByInsurance.map((item) => [
        item.insurance,
        tableFormatDuration(item.avg_seconds),
      ])
    );
    return;
  }
  if (metric === "paymentSpeedByInsurance") {
    renderTable(
      ["Insurance", "Average Time"],
      data.paymentSpeedByInsurance.map((item) => [
        item.insurance,
        tableFormatDuration(item.avg_seconds),
      ])
    );
    return;
  }
  if (metric === "repairTimeByPriceRange") {
    renderTable(
      ["Price Range", "Average Time"],
      data.repairTimeByPriceRange.map((item) => [
        item.range,
        tableFormatDuration(item.avg_seconds),
      ])
    );
    return;
  }
  if (metric === "repairTimeByModel") {
    renderTable(
      ["Car Model", "Average Time"],
      data.repairTimeByModel.map((item) => [item.model, tableFormatDuration(item.avg_seconds)])
    );
    return;
  }

  renderTable(
    ["Car Model", "Price Range", "Average Time"],
    data.repairTimeByModelPrice.map((item) => [
      item.model,
      item.range,
      tableFormatDuration(item.avg_seconds),
    ])
  );
};

const renderEmpty = (message) => {
  const head = tableEl("#tableHead");
  const body = tableEl("#tableBody");
  if (head) head.innerHTML = "";
  if (body) body.innerHTML = `<div class="table-row"><span>${message}</span></div>`;
};

const loadTables = async () => {
  const tablesView = document.getElementById("tablesView");
  if (tablesView && !tablesView.classList.contains("active-view")) return;

  const response = await fetch(buildTableUrl());
  if (!response.ok) {
    renderEmpty("No data available for this range.");
    return;
  }
  const data = await response.json();
  const metricSelect = tableEl("#tableMetric");
  const metric = metricSelect ? metricSelect.value : "phaseCycleTimes";
  renderMetric(metric, data);
  const pendingCount = tableEl("#pendingRepairCount");
  const pendingAvg = tableEl("#pendingRepairAvg");
  if (pendingCount) pendingCount.textContent = data?.pendingRepair?.count || 0;
  if (pendingAvg) {
    pendingAvg.textContent = `Average wait: ${tableFormatDuration(
      data?.pendingRepair?.avg_seconds
    )}`;
  }
};

const filterTableOptions = () => {
  const query = tableEl("#tableSearch").value.trim().toLowerCase();
  const options = Array.from(tableEl("#tableMetric").options);
  options.forEach((opt) => {
    opt.hidden = query && !opt.textContent.toLowerCase().includes(query);
  });
};

const initTables = () => {
  setTableDefaultDates();
  const tablesView = document.getElementById("tablesView");
  if (tablesView && tablesView.classList.contains("active-view")) {
    loadTables();
  }
  const applyBtn = tableEl("#tableApply");
  const metricSelect = tableEl("#tableMetric");
  const searchInput = tableEl("#tableSearch");
  if (applyBtn) applyBtn.addEventListener("click", loadTables);
  if (metricSelect) metricSelect.addEventListener("change", loadTables);
  if (searchInput) searchInput.addEventListener("input", filterTableOptions);
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

document.addEventListener("DOMContentLoaded", initTables);
document.addEventListener("view:tables", loadTables);
