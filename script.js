const $ = (s) => document.querySelector(s);
const KEY = "kharcha-diary-v1";
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const money = (n) => "Rs " + Math.round(n).toLocaleString("en-PK");
const esc = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const ym = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
const today = () => {
  const d = new Date();
  return ym(d) + "-" + String(d.getDate()).padStart(2, "0");
};

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.ledgers.length) return d;
  } catch (e) {}
  const id = uid();
  return {
    active: id,
    ledgers: [{ id, name: "Hostel", budgets: {}, items: [] }],
  };
}
let db = load();
let month = ym(new Date());
let editId = null;
let dlgMode = "add";

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {}
};
const ledger = () =>
  db.ledgers.find((l) => l.id === db.active) ||
  ((db.active = db.ledgers[0].id), db.ledgers[0]);
function render() {
  const L = ledger();
  // sidebar
  $("#ledgerList").innerHTML = db.ledgers
    .map(
      (l) =>
        `<li class="${l.id === L.id ? "on" : ""}"><button data-id="${l.id}">${esc(l.name)}<small>${l.items.length}</small></button></li>`,
    )
    .join("");
  $("#ledgerName").textContent = L.name;

  $("#monthPick").value = month;
  const [y, m] = month.split("-").map(Number);
  $("#monthLabel").textContent = new Date(y, m - 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  // month data
  const items = L.items
    .filter((i) => i.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = items.reduce((s, i) => s + i.amt, 0);
  const now = new Date(),
    cur = ym(now);
  const dim = new Date(y, m, 0).getDate();
  const days = month === cur ? now.getDate() : month < cur ? dim : 1;

  $("#total").textContent = money(total);
  $("#footTotal").textContent = money(total);
  $("#count").textContent = items.length;
  $("#avg").textContent = money(total / days);
  $("#max").textContent = money(items.reduce((a, i) => Math.max(a, i.amt), 0));

  // budget
  const b = L.budgets[month] || 0;
  $("#budget").value = b || "";
  const bar = $("#budgetBar");
  if (b > 0) {
    bar.style.width = Math.min(100, (total / b) * 100) + "%";
    bar.classList.toggle("over", total > b);
    $("#budgetNote").textContent =
      total > b
        ? `Budget se ${money(total - b)} zyada kharch ho gaye`
        : `${money(b - total)} bacha hai`;
  } else {
    bar.style.width = "0";
    $("#budgetNote").textContent = "Set your Budget";
  }

  const by = {};
  items.forEach((i) => (by[i.cat] = (by[i.cat] || 0) + i.amt));
  const cats = Object.entries(by).sort((a, b) => b[1] - a[1]);
  $("#cats").innerHTML = cats.length
    ? cats
        .map(
          ([c, v]) =>
            `<div class="cat"><div class="cat-top"><span>${esc(c)}</span><b>${money(v)} (${Math.round((v / total) * 100)}%)</b></div><div class="bar"><i style="width:${(v / total) * 100}%"></i></div></div>`,
        )
        .join("")
    : '<p class="empty">Your category summary will appear here.</p>';

  // rows
  $("#rows").innerHTML = items
    .map(
      (i) =>
        `<tr><td>${i.date.split("-").reverse().join("/")}</td><td>${esc(i.title)}</td><td><span class="tag">${esc(i.cat)}</span></td><td class="num">${money(i.amt)}</td>
     <td class="acts noprint"><button data-edit="${i.id}">Edit</button><button class="del" data-del="${i.id}">Delete</button></td></tr>`,
    )
    .join("");
  $("#empty").hidden = items.length > 0;
  renderLoans(L);
}

// qarza section
let loanEdit = null;
function renderLoans(L) {
  const loans = L.loans || [];
  $("#loanTotal").textContent = money(loans.reduce((s, x) => s + x.amt, 0));
  $("#loanList").innerHTML = loans
    .map(
      (x) =>
        `<li><div><span class="who">${esc(x.name)}</span><small>${x.date.split("-").reverse().join("/")}${x.note ? " · " + esc(x.note) : ""}</small></div>
     <span class="amt">${money(x.amt)}</span>
     <span class="acts"><button data-ledit="${x.id}">Edit</button><button class="ok" data-ldone="${x.id}">Mark as Repaid</button></span></li>`,
    )
    .join("");
  $("#loanEmpty").hidden = loans.length > 0;
}
function resetLoan() {
  loanEdit = null;
  $("#loanForm").reset();
  $("#lDate").value = today();
  $("#lSave").textContent = "Add Loans";
  $("#lCancel").hidden = true;
}
$("#loanForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const L = ledger();
  L.loans = L.loans || [];
  const d = {
    name: $("#lName").value.trim(),
    amt: parseFloat($("#lAmt").value),
    date: $("#lDate").value,
    note: $("#lNote").value.trim(),
  };
  if (!d.name || !(d.amt > 0)) return;
  if (loanEdit)
    Object.assign(
      L.loans.find((x) => x.id === loanEdit),
      d,
    );
  else L.loans.push({ id: uid(), ...d });
  save();
  resetLoan();
  render();
});
$("#loanList").addEventListener("click", (e) => {
  const L = ledger();
  L.loans = L.loans || [];
  const ed = e.target.dataset.ledit,
    done = e.target.dataset.ldone;
  if (ed) {
    const x = L.loans.find((v) => v.id === ed);
    loanEdit = ed;
    $("#lName").value = x.name;
    $("#lAmt").value = x.amt;
    $("#lDate").value = x.date;
    $("#lNote").value = x.note || "";
    $("#lSave").textContent = "Update karo";
    $("#lCancel").hidden = false;
    $("#loanForm").scrollIntoView({ behavior: "smooth", block: "center" });
    $("#lName").focus();
  }
  if (done) {
    const x = L.loans.find((v) => v.id === done);
    if (
      confirm(
        `${x.name} ne ${money(x.amt)} wapas de diye? Ye entry delete ho jayegi.`,
      )
    ) {
      L.loans = L.loans.filter((v) => v.id !== done);
      if (loanEdit === done) resetLoan();
      save();
      render();
    }
  }
});
$("#lCancel").onclick = resetLoan;

function resetForm() {
  if (typeof resetLoan === "function") resetLoan();
  editId = null;
  $("#expForm").reset();
  $("#fDate").value = month === ym(new Date()) ? today() : month + "-01";
  $("#formTitle").textContent = "Add New Expense";
  $("#saveBtn").textContent = "Add Expense";
  $("#cancelBtn").hidden = true;
}

function shiftMonth(n) {
  const [y, m] = month.split("-").map(Number);
  month = ym(new Date(y, m - 1 + n, 1));
  resetForm();
  render();
}

// kharcha add / update
$("#expForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const L = ledger();
  const data = {
    date: $("#fDate").value,
    title: $("#fTitle").value.trim(),
    cat: $("#fCat").value,
    amt: parseFloat($("#fAmt").value),
  };
  if (!data.title || !(data.amt > 0)) return;
  if (editId)
    Object.assign(
      L.items.find((i) => i.id === editId),
      data,
    );
  else L.items.push({ id: uid(), ...data });
  month = data.date.slice(0, 7);
  save();
  resetForm();
  render();
});

$("#rows").addEventListener("click", (e) => {
  const L = ledger();
  const ed = e.target.dataset.edit,
    del = e.target.dataset.del;
  if (ed) {
    const i = L.items.find((x) => x.id === ed);
    editId = ed;
    $("#fDate").value = i.date;
    $("#fTitle").value = i.title;
    $("#fCat").value = i.cat;
    $("#fAmt").value = i.amt;
    $("#formTitle").textContent = "Kharcha edit karo";
    $("#saveBtn").textContent = "Update karo";
    $("#cancelBtn").hidden = false;
    $("#expForm").scrollIntoView({ behavior: "smooth", block: "center" });
    $("#fTitle").focus();
  }
  if (del && confirm("Ye kharcha delete kar du?")) {
    L.items = L.items.filter((x) => x.id !== del);
    if (editId === del) resetForm();
    save();
    render();
  }
});

$("#cancelBtn").onclick = resetForm;
$("#budget").addEventListener("input", (e) => {
  ledger().budgets[month] = parseFloat(e.target.value) || 0;
  save();
  render2();
});
function render2() {
  const v = $("#budget").value;
  render();
  $("#budget").value = v;
}

// month nav
$("#prevM").onclick = () => shiftMonth(-1);
$("#nextM").onclick = () => shiftMonth(1);
$("#monthPick").onchange = (e) => {
  if (e.target.value) {
    month = e.target.value;
    resetForm();
    render();
  }
};
$("#printBtn").onclick = () => window.print();

// khaate (ledgers) CRUD
const dlg = $("#ledgerDlg");
function openDlg(mode) {
  dlgMode = mode;
  $("#dlgTitle").textContent =
    mode === "add" ? "Naya khaata" : "Khaate ka naam badlo";
  $("#ledgerInput").value = mode === "add" ? "" : ledger().name;
  dlg.showModal();
  $("#ledgerInput").focus();
}
$("#addLedger").onclick = () => openDlg("add");
$("#renameLedger").onclick = () => openDlg("rename");
$("#dlgCancel").onclick = () => dlg.close();
$("#ledgerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#ledgerInput").value.trim();
  if (!name) return;
  if (dlgMode === "add") {
    const id = uid();
    db.ledgers.push({ id, name, budgets: {}, items: [] });
    db.active = id;
  } else ledger().name = name;
  dlg.close();
  save();
  resetForm();
  render();
});
$("#deleteLedger").onclick = () => {
  if (db.ledgers.length === 1)
    return alert("Kam az kam ek khaata hona zaroori hai.");
  if (confirm(`"${ledger().name}" aur is ke sare kharche delete kar du?`)) {
    db.ledgers = db.ledgers.filter((l) => l.id !== db.active);
    db.active = db.ledgers[0].id;
    save();
    resetForm();
    render();
  }
};
$("#ledgerList").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  db.active = b.dataset.id;
  save();
  resetForm();
  render();
});

resetForm();
render();
