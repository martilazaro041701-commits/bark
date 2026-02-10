const API_BASE = window.API_BASE || "/api";

const el = (selector) => document.querySelector(selector);

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return "";
};

const toggleAll = (checked) => {
  document.querySelectorAll("#columnGrid input[type=checkbox]").forEach((box) => {
    box.checked = checked;
  });
};

const submitImport = async (event) => {
  event.preventDefault();
  const statusEl = el("#importStatus");
  statusEl.textContent = "Importing...";

  const fileInput = el("#importFile");
  if (!fileInput.files.length) {
    statusEl.textContent = "Please select a CSV file.";
    return;
  }

  const columns = Array.from(
    document.querySelectorAll("#columnGrid input[type=checkbox]:checked")
  ).map((box) => box.value);

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("start_date", el("#importStartDate").value || "");
  formData.append("end_date", el("#importEndDate").value || "");
  if (columns.length) {
    formData.append("columns", columns.join(","));
  }

  const response = await fetch(`${API_BASE}/import/csv/`, {
    method: "POST",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: formData,
  });

  if (!response.ok) {
    statusEl.textContent = "Import failed. Please check the CSV and try again.";
    return;
  }

  const data = await response.json();
  statusEl.textContent = `Imported ${data.created} rows. Skipped ${data.skipped}.`;
};

const init = () => {
  el("#selectAllColumns").addEventListener("click", () => toggleAll(true));
  el("#clearColumns").addEventListener("click", () => toggleAll(false));
  el("#importForm").addEventListener("submit", submitImport);
};

document.addEventListener("DOMContentLoaded", init);
