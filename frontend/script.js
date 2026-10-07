const API = "http://127.0.0.1:5000/api/opportunities";

let items = [];
let pending = null; // { type: "close" | "delete", item }

const $ = (id) => document.getElementById(id);
const modal = (id) => bootstrap.Modal.getOrCreateInstance($(id));

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- API helper ----------
async function api(path = "", options = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw { message: "Cannot reach the server. Check that the backend is running on port 5000.", details: [] };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw { message: data.error || `Request failed (${res.status})`, details: data.details || [] };
  }
  return data;
}

// ---------- Messages ----------
function toast(message, type = "success", details = []) {
  const color = { success: "text-bg-success", danger: "text-bg-danger" }[type];
  const el = document.createElement("div");
  el.className = `toast align-items-center border-0 ${color}`;
  el.innerHTML = `<div class="d-flex"><div class="toast-body"><div>${esc(message)}</div>
    ${(Array.isArray(details) ? details : [details]).map((d) => `<div class="small">- ${esc(d)}</div>`).join("")}
    </div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
  $("toasts").appendChild(el);
  const t = new bootstrap.Toast(el, { delay: type === "danger" ? 6000 : 3500 });
  el.addEventListener("hidden.bs.toast", () => el.remove());
  t.show();
}

// ---------- Loading and rendering ----------
async function load() {
  $("loading").classList.remove("d-none");
  $("errorState").classList.add("d-none");
  $("emptyState").classList.add("d-none");
  $("grid").innerHTML = "";
  try {
    items = await api();
    render();
  } catch (e) {
    items = [];
    updateStats();
    $("errorText").textContent = e.message;
    $("errorState").classList.remove("d-none");
  } finally {
    $("loading").classList.add("d-none");
  }
}

function updateStats() {
  $("statTotal").textContent = items.length;
  $("statOpen").textContent = items.filter((i) => i.status === "Open").length;
  $("statClosed").textContent = items.filter((i) => i.status === "Closed").length;
}

function isOverdue(item) {
  return item.status === "Open" && new Date(item.deadline + "T23:59:59") < new Date();
}

function skillTags(text) {
  return String(text || "").split(",").map((s) => s.trim()).filter(Boolean)
    .map((s) => `<span class="skill">${esc(s)}</span>`).join("");
}

function render() {
  updateStats();
  const q = $("search").value.toLowerCase().trim();
  const f = $("filter").value;
  const shown = items.filter((i) =>
    (f === "All" || i.status === f) &&
    (!q || [i.title, i.faculty_name, i.department, i.research_area].some((v) => String(v).toLowerCase().includes(q)))
  );

  $("grid").innerHTML = shown.map((i) => `
    <div class="col-md-6 col-lg-4">
      <article class="opp-card p-3 ${i.status === "Closed" ? "is-closed" : ""}">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="text-muted small">${esc(i.research_area)}</span>
          <span class="badge ${i.status === "Open" ? "text-bg-success" : "text-bg-secondary"}">${esc(i.status)}</span>
        </div>
        <h2 class="clamp">${esc(i.title)}</h2>
        <div class="small text-muted mb-2">${esc(i.faculty_name)}, ${esc(i.department)}</div>
        <p class="clamp small mb-2">${esc(i.description)}</p>
        <div class="mb-2">${skillTags(i.required_skills)}</div>
        <div class="small mt-auto mb-3 d-flex justify-content-between">
          <span><i class="bi bi-people me-1"></i>${i.positions} ${i.positions === 1 ? "position" : "positions"}</span>
          <span class="${isOverdue(i) ? "overdue" : ""}"><i class="bi bi-calendar-event me-1"></i>${esc(i.deadline)}${isOverdue(i) ? " (past)" : ""}</span>
        </div>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-primary flex-fill" data-action="view" data-id="${i.id}">View details</button>
          <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${i.id}" title="Edit"><i class="bi bi-pencil"></i></button>
          ${i.status === "Open" ? `<button class="btn btn-sm btn-outline-warning" data-action="close" data-id="${i.id}" title="Close opportunity"><i class="bi bi-lock"></i></button>` : ""}
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${i.id}" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </article>
    </div>`).join("");

  const empty = shown.length === 0;
  $("emptyState").classList.toggle("d-none", !empty);
  if (empty) {
    const filtered = items.length > 0;
    $("emptyTitle").textContent = filtered ? "No matching opportunities" : "No opportunities yet";
    $("emptyText").textContent = filtered ? "Try a different search or status filter." : "Add the first research opportunity to get started.";
  }
}

// ---------- View details ----------
async function showDetails(id) {
  try {
    const o = await api(`/${id}`);
    $("detailsTitle").textContent = o.title;
    $("detailsBody").innerHTML = `
      <p><span class="badge ${o.status === "Open" ? "text-bg-success" : "text-bg-secondary"}">${esc(o.status)}</span></p>
      <p>${esc(o.description).replace(/\n/g, "<br>")}</p>
      <dl class="row mb-2">
        <dt class="col-sm-4">Research area</dt><dd class="col-sm-8">${esc(o.research_area)}</dd>
        <dt class="col-sm-4">Faculty member</dt><dd class="col-sm-8">${esc(o.faculty_name)}</dd>
        <dt class="col-sm-4">Department</dt><dd class="col-sm-8">${esc(o.department)}</dd>
        <dt class="col-sm-4">Positions</dt><dd class="col-sm-8">${o.positions}</dd>
        <dt class="col-sm-4">Deadline</dt><dd class="col-sm-8">${esc(o.deadline)}</dd>
        <dt class="col-sm-4">Required skills</dt><dd class="col-sm-8">${skillTags(o.required_skills)}</dd>
        <dt class="col-sm-4">ID</dt><dd class="col-sm-8">#${o.id}</dd>
      </dl>`;
    modal("detailsModal").show();
  } catch (e) {
    toast(e.message, "danger", e.details);
    load();
  }
}

// ---------- Create / edit ----------
function openForm(item) {
  const form = $("oppForm");
  form.reset();
  form.classList.remove("was-validated");
  $("formError").classList.add("d-none");
  $("fId").value = item ? item.id : "";
  $("formTitle").textContent = item ? "Edit opportunity" : "Add opportunity";
  $("saveText").textContent = item ? "Save changes" : "Create opportunity";
  if (item) {
    $("fTitle").value = item.title;
    $("fFaculty").value = item.faculty_name;
    $("fDept").value = item.department;
    $("fArea").value = item.research_area;
    $("fPositions").value = item.positions;
    $("fStatus").value = item.status;
    $("fDeadline").value = item.deadline;
    $("fSkills").value = item.required_skills;
    $("fDesc").value = item.description;
  }
  modal("formModal").show();
}

async function saveForm(e) {
  e.preventDefault();
  const form = $("oppForm");
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;

  const id = $("fId").value;
  const body = {
    title: $("fTitle").value.trim(),
    faculty_name: $("fFaculty").value.trim(),
    department: $("fDept").value.trim(),
    research_area: $("fArea").value.trim(),
    positions: Number($("fPositions").value),
    status: $("fStatus").value,
    deadline: $("fDeadline").value,
    required_skills: $("fSkills").value.trim(),
    description: $("fDesc").value.trim(),
  };

  $("btnSave").disabled = true;
  $("saveSpin").classList.remove("d-none");
  try {
    await api(id ? `/${id}` : "", { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
    modal("formModal").hide();
    toast(id ? "Opportunity updated." : "Opportunity created.");
    await load();
  } catch (err) {
    $("formError").innerHTML = `<div>${esc(err.message)}</div>` + err.details.map((d) => `<div class="small">- ${esc(d)}</div>`).join("");
    $("formError").classList.remove("d-none");
  } finally {
    $("btnSave").disabled = false;
    $("saveSpin").classList.add("d-none");
  }
}

// ---------- Close / delete ----------
function askConfirm(type, item) {
  pending = { type, item };
  const isDelete = type === "delete";
  $("confirmTitle").textContent = isDelete ? "Delete opportunity" : "Close opportunity";
  $("confirmBody").innerHTML = isDelete
    ? `Delete <strong>${esc(item.title)}</strong>? This cannot be undone.`
    : `Close <strong>${esc(item.title)}</strong>? It will be marked Closed.`;
  const btn = $("btnConfirm");
  btn.textContent = isDelete ? "Delete" : "Close opportunity";
  btn.className = `btn ${isDelete ? "btn-danger" : "btn-warning"}`;
  modal("confirmModal").show();
}

async function runConfirm() {
  if (!pending) return;
  const { type, item } = pending;
  $("btnConfirm").disabled = true;
  try {
    if (type === "delete") {
      await api(`/${item.id}`, { method: "DELETE" });
      toast("Opportunity deleted.");
    } else {
      await api(`/${item.id}`, { method: "PUT", body: JSON.stringify({ status: "Closed" }) });
      toast("Opportunity closed.");
    }
    modal("confirmModal").hide();
  } catch (e) {
    modal("confirmModal").hide();
    toast(e.message, "danger", e.details);
  } finally {
    $("btnConfirm").disabled = false;
    pending = null;
    load();
  }
}

// ---------- Events ----------
$("grid").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const item = items.find((i) => i.id === Number(btn.dataset.id));
  if (!item) return;
  const a = btn.dataset.action;
  if (a === "view") showDetails(item.id);
  else if (a === "edit") openForm(item);
  else askConfirm(a, item);
});
$("btnAdd").addEventListener("click", () => openForm(null));
$("btnEmptyAdd").addEventListener("click", () => openForm(null));
$("btnRetry").addEventListener("click", load);
$("oppForm").addEventListener("submit", saveForm);
$("btnConfirm").addEventListener("click", runConfirm);
$("search").addEventListener("input", render);
$("filter").addEventListener("change", render);

load();