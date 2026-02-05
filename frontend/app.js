const API_BASE = window.API_BASE || "/api";
const state = {
  jobs: [],
  activePhase: "ALL",
  query: "",
  selectedJob: null,
  activeInsurance: "",
  page: 1,
  numPages: 1,
  filters: {
    insurance: new Set(),
    phase: new Set(),
  },
};

const phaseCategory = (phase) => {
  if (!phase) return "approval";
  const prefix = phase.split("_")[0];
  return prefix.toLowerCase();
};

const badgeLabel = (phase) => {
  return phase
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);

const PHASE_CHOICES = [
  { value: "APPROVAL_ESTIMATE_DONE", label: "Approval - Estimate Done" },
  { value: "APPROVAL_LOA_PROCESSING", label: "Approval - LOA Processing" },
  { value: "APPROVAL_LOA_REVISING", label: "Approval - LOA Revising" },
  { value: "APPROVAL_LOA_REJECTED", label: "Approval - LOA Rejected" },
  { value: "APPROVAL_LOA_APPROVED", label: "Approval - LOA Approved" },
  { value: "APPROVAL_AWAITING_CUSTOMER", label: "Approval - Awaiting Customer Confirmation" },
  { value: "PARTS_AVAILABLE", label: "Parts - Available" },
  { value: "PARTS_ORDERED", label: "Parts - Ordered" },
  { value: "PARTS_PARTIAL_RECEIVED", label: "Parts - Partial Received" },
  { value: "PARTS_ARRIVED", label: "Parts - Arrived" },
  { value: "REPAIR_WAITING_SCHEDULING", label: "Repair - Waiting for Scheduling" },
  { value: "REPAIR_WAITING_PARTS", label: "Repair - Waiting for Parts" },
  { value: "REPAIR_ONGOING_REPAIR", label: "Repair - Ongoing Repair" },
  { value: "REPAIR_ONGOING_BODY_WORK", label: "Repair - Ongoing Body Work" },
  { value: "REPAIR_ONGOING_BODY_PAINT", label: "Repair - Ongoing Body Paint" },
  { value: "REPAIR_WAITING_DROPOFF", label: "Repair - Waiting for Drop-off" },
  { value: "REPAIR_INSPECTION_TESTING", label: "Repair - Inspection/Testing" },
  { value: "PICKUP_READY", label: "Pickup - Ready" },
  { value: "PICKUP_CONTACTED", label: "Pickup - Contacted" },
  { value: "PICKUP_RELEASED", label: "Pickup - Released" },
  { value: "BILLING_PENDING", label: "Billing - Pending" },
  { value: "BILLING_PAID", label: "Billing - Paid" },
  { value: "BILLING_RELEASED", label: "Billing - Released" },
  { value: "DISMANTLE_FOR_DISMANTLE", label: "Dismantle - For Dismantle" },
  { value: "CANCELLED", label: "Cancelled" },
];

const formatDate = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatDuration = (value) => {
  if (value === null || value === undefined || value === "") return "--";
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) {
    const hours = asNumber / 3600;
    if (hours >= 24) {
      const days = hours / 24;
      return `${days.toFixed(1)} days`;
    }
    return `${hours.toFixed(1)} hrs`;
  }
  if (typeof value === "string") {
    if (value.includes("day")) return value;
    if (value.includes(":")) {
      const parts = value.split(":").map((p) => Number(p));
      if (parts.length >= 2) {
        const hours = parts[0] + parts[1] / 60;
        return `${hours.toFixed(1)} hrs`;
      }
    }
  }
  return "--";
};

const toLocalInputValue = (value) => {
  if (!value) return "";
  // If value has no timezone info, assume it's already local.
  if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
    return value.slice(0, 16);
  }
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const el = (selector) => document.querySelector(selector);

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return "";
};

const animateEntrance = () => {
  if (!window.gsap) return;
  const items = document.querySelectorAll(".animate-in");
  gsap.set(items, { opacity: 0, y: 12 });
  gsap.to(items, {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: "power4.out",
    stagger: 0.08,
  });
};

let trendChart = null;

const renderPhaseSteps = (currentPhase, container) => {
  const prefix = currentPhase ? currentPhase.split("_")[0] : "APPROVAL";
  const steps = ["APPROVAL", "PARTS", "REPAIR", "PICKUP", "BILLING", "DISMANTLE"];
  container.innerHTML = steps
    .map(
      (step) =>
        `<div class="phase-step ${step === prefix ? "active" : ""}" data-phase="${step}">${step
          .charAt(0)
          .toUpperCase()}${step.slice(1).toLowerCase()}</div>`
    )
    .join("");
};

const renderDetail = (job) => {
  state.selectedJob = job;
  el("#detailTitle").textContent = `Job #${job.id} • ${job.vehicle.model}`;
  el("#detailSubtitle").textContent = `${job.vehicle.plate_number} • ${job.customer.name}`;

  el("#detailCustomer").innerHTML = `
    <div class="detail-row"><span>Name</span><strong>${job.customer.name || "--"}</strong></div>
    <div class="detail-row"><span>Phone</span><strong>${job.customer.phone || "--"}</strong></div>
    <div class="detail-row"><span>Email</span><strong>${job.customer.email || "--"}</strong></div>
    <div class="detail-row"><span>Address</span><strong>${job.customer.address || "--"}</strong></div>
  `;

  const history = job.history || [];
  const historyContainer = el("#detailHistory");
  historyContainer.innerHTML =
    history.length === 0
      ? `<div class="detail-row"><span>No history yet.</span></div>`
      : history
          .map((entry) => {
            return `
              <div class="detail-row history-row">
                <span>${badgeLabel(entry.new_phase)}</span>
                <input class="history-input" type="datetime-local" data-history-id="${
                  entry.id
                }" data-original="${toLocalInputValue(entry.timestamp)}" value="${toLocalInputValue(
              entry.timestamp
            )}" />
              </div>`;
          })
          .join("");

  const statusSelect = el("#detailStatusSelect");
  if (statusSelect) {
    statusSelect.innerHTML = PHASE_CHOICES.map(
      (phase) => `<option value="${phase.value}">${phase.label}</option>`
    ).join("");
    statusSelect.value = job.phase;
  }

  const loaInput = el("#detailLoa");
  const partsInput = el("#detailParts");
  const laborInput = el("#detailLabor");
  const vatInput = el("#detailVat");
  if (loaInput) loaInput.value = job.approved_loa_amount || 0;
  if (partsInput) partsInput.value = job.parts_price || 0;
  if (laborInput) laborInput.value = job.labor_cost || 0;
  if (vatInput) vatInput.value = job.vat || 0;

  const modal = el("#detailModal");
  modal.classList.remove("hidden");
  if (window.gsap) {
    gsap.fromTo(
      modal,
      { opacity: 0, scale: 0.96, y: 10 },
      { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "power4.out" }
    );
  } else {
    modal.style.opacity = "1";
  }
};

const bindDetailClose = () => {
  const closeButtons = [el("#detailClose"), el("#detailCloseFooter")].filter(Boolean);
  closeButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      if (window.gsap) {
        gsap.to("#detailModal", {
          opacity: 0,
          scale: 0.96,
          duration: 0.6,
          onComplete: () => el("#detailModal").classList.add("hidden"),
        });
      } else {
        el("#detailModal").classList.add("hidden");
        el("#detailModal").style.opacity = "";
      }
      state.selectedJob = null;
    })
  );
};

const buildRow = (job) => {
  const row = document.createElement("div");
  row.className = `table-row${job.phase === "CANCELLED" ? " cancelled" : ""}`;
  row.dataset.jobId = job.id;

  const category = phaseCategory(job.phase);
  const badgeClass = `badge ${category}${job.phase === "APPROVAL_LOA_REJECTED" ? " pulse" : ""}`;

  row.innerHTML = `
    <span>#${job.id}</span>
    <span class="truncate">${job.vehicle.model} • ${job.vehicle.plate_number}</span>
    <span class="truncate">${job.customer.name}</span>
    <span class="truncate">${job.vehicle.insurance_company}</span>
    <span><span class="${badgeClass}">${badgeLabel(job.phase)}</span></span>
    <span>${formatCurrency(job.total_estimate || 0)}</span>
    <span>${formatCurrency(job.approved_loa_amount || 0)}</span>
    <span>${formatDate(job.phase_started_at || job.updated_at)}</span>
    <span>${job.days_in_current_phase != null ? job.days_in_current_phase : "--"}</span>
    <span>${job.total_days != null ? job.total_days : "--"}</span>
  `;
  return row;
};

const flipAnimate = (row, expanded) => {
  const first = row.getBoundingClientRect();
  expanded();
  const last = row.getBoundingClientRect();
  const invertX = first.left - last.left;
  const invertY = first.top - last.top;
  const scaleX = first.width / last.width;
  const scaleY = first.height / last.height;

  gsap.fromTo(
    row,
    {
      x: invertX,
      y: invertY,
      scaleX,
      scaleY,
    },
    {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 0.5,
      ease: "power4.out",
    }
  );
};

const renderJobs = (jobs) => {
  state.jobs = jobs;
  const table = el("#jobsTable");
  table.innerHTML = "";
  jobs.forEach((job) => {
    const row = buildRow(job);
    row.addEventListener("click", async () => {
      const response = await fetch(`${API_BASE}/jobs/${job.id}/`);
      if (!response.ok) return;
      const detail = await response.json();
      flipAnimate(row, () => renderDetail(detail));
    });
    table.appendChild(row);
  });
};

const updateKPIs = (stats) => {
  el("#kpiActive").textContent = stats.active.toString();
  el("#kpiCycle").textContent = stats.avgCycle;
  el("#kpiAlerts").textContent = stats.alerts.toString();
  const throughputEl = el("#kpiThroughput");
  if (throughputEl) {
    throughputEl.textContent = stats.throughput.toString();
  }
  el("#kpiRevenue").textContent = formatCurrency(stats.revenue);
  if (trendChart && stats.trendLabels) {
    trendChart.data.labels = stats.trendLabels;
    trendChart.data.datasets[0].data = stats.trendValues || [];
    trendChart.update();
  }
};

const updatePagination = () => {
  el("#pageInfo").textContent = `Page ${state.page} of ${state.numPages}`;
  el("#prevPage").disabled = state.page <= 1;
  el("#nextPage").disabled = state.page >= state.numPages;
};

const fetchJobs = async (params = {}) => {
  const query = new URLSearchParams(params);
  const response = await fetch(`${API_BASE}/jobs/?${query.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load jobs");
  }
  return response.json();
};

const fetchStats = async () => {
  const response = await fetch(`${API_BASE}/jobs/stats/`);
  if (!response.ok) {
    throw new Error("Failed to load stats");
  }
  return response.json();
};

const hydrate = async () => {
  const [jobsRes, statsRes, analyticsRes] = await Promise.allSettled([
    fetchJobs({ page: state.page }),
    fetchStats(),
    fetchAnalytics(),
  ]);

  if (jobsRes.status === "fulfilled") {
    const jobs = jobsRes.value;
    renderJobs(jobs.results || jobs);
    state.numPages = jobs.num_pages || 1;
    updatePagination();
  } else {
    renderJobs([]);
  }

  if (statsRes.status === "fulfilled") {
    updateKPIs(statsRes.value);
  }

  if (analyticsRes.status === "fulfilled") {
    updateAnalytics(analyticsRes.value);
  }
};

const bindSidebar = () => {
  const sidebar = el("#sidebar");
  const sidebarToggle = el("#sidebarToggle");
  if (sidebar && sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("expanded");
      sidebarToggle.textContent = sidebar.classList.contains("expanded") ? "Collapse" : "Expand";
    });
  }
};

const bindFilters = () => {
  document.querySelectorAll(".table-filters .chip").forEach((chip) => {
    chip.addEventListener("click", async () => {
      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.activePhase = chip.dataset.phase || "ALL";
      state.page = 1;
      const jobs = await fetchJobs({
        phase_prefix: state.activePhase,
        q: state.query || "",
        insurance: state.activeInsurance || "",
        page: state.page,
      });
      renderJobs(jobs.results || jobs);
      state.numPages = jobs.num_pages || 1;
      updatePagination();
    });
  });
};

const bindSearch = () => {
  const input = document.querySelector(".search");
  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      state.query = input.value.trim();
      state.page = 1;
      const jobs = await fetchJobs({
        phase_prefix: state.activePhase,
        q: state.query,
        insurance: state.activeInsurance || "",
        page: state.page,
      });
      renderJobs(jobs.results || jobs);
      state.numPages = jobs.num_pages || 1;
      updatePagination();
    }, 300);
  });
};

const bindNewJob = () => {
  const button = el("#newJobBtn");
  if (!button) return;
  const modal = el("#jobModal");
  const form = el("#jobForm");
  const closeButtons = [el("#modalClose"), el("#modalCancel")].filter(Boolean);

  const openModal = () => {
    modal.classList.remove("hidden");
    if (window.gsap) {
      gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power4.out" });
    } else {
      modal.style.opacity = "1";
    }
  };

  const closeModal = () => {
    if (window.gsap) {
      gsap.to(modal, {
        opacity: 0,
        duration: 0.4,
        onComplete: () => modal.classList.add("hidden"),
      });
    } else {
      modal.classList.add("hidden");
      modal.style.opacity = "";
    }
  };

  button.addEventListener("click", openModal);
  closeButtons.forEach((btn) => btn.addEventListener("click", closeModal));

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      customer: { name: formData.get("customer_name") },
      vehicle: {
        model: formData.get("vehicle_model"),
        plate_number: formData.get("plate_number"),
        insurance_company: formData.get("insurance_company"),
      },
      description: formData.get("description") || "",
      total_estimate: Number(formData.get("total_estimate") || 0),
    };

    const response = await fetch(`${API_BASE}/jobs/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      alert("Failed to create job.");
      return;
    }
    const job = await response.json();
    renderJobs([job, ...state.jobs]);
    form.reset();
    closeModal();
  });
};

const mapCategoryToPhase = (category) => {
  switch (category) {
    case "APPROVAL":
      return "APPROVAL_ESTIMATE_DONE";
    case "PARTS":
      return "PARTS_AVAILABLE";
    case "REPAIR":
      return "REPAIR_WAITING_SCHEDULING";
    case "PICKUP":
      return "PICKUP_READY";
    case "BILLING":
      return "BILLING_PENDING";
    case "DISMANTLE":
      return "DISMANTLE_FOR_DISMANTLE";
    default:
      return null;
  }
};

const bindPhaseStepper = () => {
  document.querySelectorAll(".phase-step").forEach((step) => {
    step.addEventListener("click", async () => {
      if (!state.selectedJob) return;
      const newPhase = mapCategoryToPhase(step.dataset.phase);
      if (!newPhase) return;
      const response = await fetch(`${API_BASE}/jobs/${state.selectedJob.id}/phase/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ phase: newPhase }),
      });
      if (!response.ok) {
        alert("Failed to update phase.");
        return;
      }
      const updated = await response.json();
      renderDetail(updated);
      const jobs = await fetchJobs({
        phase_prefix: state.activePhase,
        q: state.query,
      });
      renderJobs(jobs.results || jobs);
    });
  });
};

const bindFilterMenus = () => {
  const menu = el("#filterMenu");
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const filterType = btn.dataset.filter;
      const values =
        filterType === "insurance"
          ? [...new Set(state.jobs.map((job) => job.vehicle.insurance_company))].filter(Boolean)
          : [...new Set(state.jobs.map((job) => job.phase))].filter(Boolean);
      menu.innerHTML = `
        <div class="filter-header">${filterType}</div>
        ${values
          .map(
            (value) => `
          <label class="filter-checkbox">
            <input type="checkbox" data-value="${value}" ${
              state.filters[filterType].has(value) ? "checked" : ""
            } />
            <span>${filterType === "phase" ? badgeLabel(value) : value}</span>
          </label>`
          )
          .join("")}
        <div class="filter-actions">
          <button class="btn-secondary" data-action="clear">Clear</button>
          <button class="btn-primary" data-action="apply">Apply</button>
        </div>
      `;
      menu.classList.remove("hidden");
      if (window.gsap) {
        gsap.fromTo(menu, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.2 });
      }
      const rect = btn.getBoundingClientRect();
      const parentRect = btn.closest(".table-card")?.getBoundingClientRect();
      const offsetLeft = parentRect ? rect.left - parentRect.left : rect.left;
      const offsetTop = parentRect ? rect.bottom - parentRect.top : rect.bottom;
      menu.style.top = `${offsetTop + 6}px`;
      menu.style.left = `${offsetLeft}px`;

      menu.querySelector('[data-action="clear"]').addEventListener("click", () => {
        state.filters[filterType].clear();
        menu.classList.add("hidden");
      });

      menu.querySelector('[data-action="apply"]').addEventListener("click", async () => {
        const checked = [...menu.querySelectorAll("input[type='checkbox']:checked")].map(
          (input) => input.dataset.value
        );
        state.filters[filterType] = new Set(checked);
        state.page = 1;
        const jobs = await fetchJobs({
          phase_in: [...state.filters.phase].join(","),
          insurance_in: [...state.filters.insurance].join(","),
          q: state.query || "",
          page: state.page,
        });
        renderJobs(jobs.results || jobs);
        state.numPages = jobs.num_pages || 1;
        updatePagination();
        btn.classList.toggle("active", checked.length > 0);
        menu.classList.add("hidden");
      });
    });
  });

  document.addEventListener("click", () => menu.classList.add("hidden"));
};

const bindDetailSave = () => {
  const button = el("#detailSave");
  const statusSelect = el("#detailStatusSelect");
  if (!button || !statusSelect) return;

  button.addEventListener("click", async () => {
    if (!state.selectedJob) return;
    const payload = {
      approved_loa_amount: Number(el("#detailLoa")?.value || 0),
      parts_price: Number(el("#detailParts")?.value || 0),
      labor_cost: Number(el("#detailLabor")?.value || 0),
      vat: Number(el("#detailVat")?.value || 0),
    };
    const detailResponse = await fetch(`${API_BASE}/jobs/${state.selectedJob.id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(payload),
    });
    if (!detailResponse.ok) {
      alert("Failed to save changes.");
      return;
    }
    if (statusSelect.value !== state.selectedJob.phase) {
      const phaseResponse = await fetch(`${API_BASE}/jobs/${state.selectedJob.id}/phase/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ phase: statusSelect.value }),
      });
      if (!phaseResponse.ok) {
        alert("Failed to update status.");
        return;
      }
    }

    const historyInputs = document.querySelectorAll(".history-input");
    if (historyInputs.length > 0) {
      for (const input of historyInputs) {
        const historyId = input.dataset.historyId;
        if (!historyId || !input.value) continue;
        if (input.dataset.original === input.value) continue;
        const response = await fetch(`${API_BASE}/status-history/${historyId}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
          },
          body: JSON.stringify({ timestamp: new Date(input.value).toISOString() }),
        });
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          alert(detail.detail || "Failed to update history timestamps.");
          return;
        }
      }
    }
    const refreshed = await fetch(`${API_BASE}/jobs/${state.selectedJob.id}/`);
    if (refreshed.ok) {
      const detail = await refreshed.json();
      renderDetail(detail);
    }
    const jobs = await fetchJobs({
      phase_prefix: state.activePhase,
      q: state.query,
      insurance: state.activeInsurance || "",
    });
    renderJobs(jobs.results || jobs);
    const modal = el("#detailModal");
    if (modal) {
      if (window.gsap) {
        gsap.to(modal, {
          opacity: 0,
          scale: 0.96,
          duration: 0.6,
          onComplete: () => modal.classList.add("hidden"),
        });
      } else {
        modal.classList.add("hidden");
        modal.style.opacity = "";
      }
    }
  });
};

const initChart = () => {
  const ctx = el("#jobTrendChart");
  if (!ctx) return;
  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Jobs Updated",
          data: [],
          borderColor: "#1f6cff",
          backgroundColor: "rgba(31, 108, 255, 0.15)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "rgba(15, 23, 42, 0.06)" } },
      },
    },
  });
};

const bindPagination = () => {
  const prev = el("#prevPage");
  const next = el("#nextPage");
  if (!prev || !next) return;

  prev.addEventListener("click", async () => {
    if (state.page <= 1) return;
    state.page -= 1;
    const jobs = await fetchJobs({
      phase_in: [...state.filters.phase].join(","),
      insurance_in: [...state.filters.insurance].join(","),
      q: state.query || "",
      page: state.page,
    });
    renderJobs(jobs.results || jobs);
    state.numPages = jobs.num_pages || 1;
    updatePagination();
  });

  next.addEventListener("click", async () => {
    if (state.page >= state.numPages) return;
    state.page += 1;
    const jobs = await fetchJobs({
      phase_in: [...state.filters.phase].join(","),
      insurance_in: [...state.filters.insurance].join(","),
      q: state.query || "",
      page: state.page,
    });
    renderJobs(jobs.results || jobs);
    state.numPages = jobs.num_pages || 1;
    updatePagination();
  });
};

const fetchAnalytics = async (range = "30d", extraParams = {}) => {
  const params = new URLSearchParams({ range, ...extraParams });
  const response = await fetch(`${API_BASE}/analytics/?${params.toString()}`);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Failed to load analytics");
  }
  return response.json();
};

const updateAnalytics = (data) => {
  if (!data) return;
  if (trendChart) {
    trendChart.data.labels = data.trendLabels || [];
    trendChart.data.datasets[0].data = data.trendValues || [];
    trendChart.update();
  }
  if (data.pendingParts != null && el("#kpiPendingParts")) el("#kpiPendingParts").textContent = data.pendingParts;
  if (data.pendingLoa != null && el("#kpiPendingLoa")) el("#kpiPendingLoa").textContent = data.pendingLoa;
  if (data.inRepair != null && el("#kpiInRepair")) el("#kpiInRepair").textContent = data.inRepair;
  if (data.billingPendingTotal != null) {
    const billingEl = el("#kpiBillingPending");
    if (billingEl) billingEl.textContent = formatCurrency(data.billingPendingTotal);
  }
  const cycle = data.cycleTimes || {};
  if (el("#kpiLoaEfficiency")) el("#kpiLoaEfficiency").textContent = formatDuration(cycle.loaEfficiency);
  if (el("#kpiLogisticsFlow")) el("#kpiLogisticsFlow").textContent = formatDuration(cycle.logisticsFlow);
  if (el("#kpiProductionSpeed")) el("#kpiProductionSpeed").textContent = formatDuration(cycle.productionSpeed);
  if (el("#kpiBillingVelocity")) el("#kpiBillingVelocity").textContent = formatDuration(cycle.billingVelocity);
};

const bindRangeButtons = () => {
  const buttons = document.querySelectorAll("#rangeButtons .chip");
  let customControls = el("#customRangeControls");
  let customStart = el("#customStartDate");
  let customEnd = el("#customEndDate");
  let applyCustom = el("#applyCustomRange");

  if (!customControls) {
    const host = el("#rangeButtons");
    if (host) {
      const wrapper = document.createElement("div");
      wrapper.id = "customRangeControls";
      wrapper.className = "hidden flex gap-2 items-center";
      wrapper.innerHTML = `
        <input id="customStartDate" type="date" class="search !min-w-[140px] !px-3 !py-2" />
        <input id="customEndDate" type="date" class="search !min-w-[140px] !px-3 !py-2" />
        <button id="applyCustomRange" class="btn-secondary">Apply</button>
      `;
      host.parentElement?.appendChild(wrapper);
      customControls = wrapper;
      customStart = wrapper.querySelector("#customStartDate");
      customEnd = wrapper.querySelector("#customEndDate");
      applyCustom = wrapper.querySelector("#applyCustomRange");
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const range = btn.dataset.range;
      if (range === "custom") {
        if (customControls) {
          customControls.classList.remove("hidden");
          customControls.style.display = "flex";
        }
        return;
      }
      if (customControls) {
        customControls.classList.add("hidden");
        customControls.style.display = "";
      }
      try {
        const analytics = await fetchAnalytics(range);
        updateAnalytics(analytics);
      } catch (error) {
        console.error("Analytics range error:", error);
        alert("Failed to update analytics for selected range.");
      }
    });
  });

  applyCustom?.addEventListener("click", async () => {
    const startDate = customStart?.value;
    const endDate = customEnd?.value;
    if (!startDate || !endDate) {
      alert("Please select both start and end date.");
      return;
    }
    try {
      const analytics = await fetchAnalytics("custom", {
        start_date: startDate,
        end_date: endDate,
      });
      updateAnalytics(analytics);
    } catch (error) {
      console.error("Custom range analytics error:", error);
      alert("Failed to load custom range analytics.");
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  try {
    bindSidebar();
    bindDetailClose();
    bindFilters();
    bindSearch();
    bindNewJob();
    bindFilterMenus();
    bindDetailSave();
    bindPagination();
    bindRangeButtons();
    initChart();
    hydrate();
    animateEntrance();
  } catch (error) {
    console.error("Dashboard initialization error:", error);
  }
});
