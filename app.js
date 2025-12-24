let CATEGORY_RULES = JSON.parse(localStorage.getItem("myRules")) || {
  Şikayət: ["gecikmə", "problem", "narazı", "zəif", "pis", "səhv"],
  Sual: ["necə", "qiymət", "məlumat", "harada", "nə qədər"],
  Təklif: ["təklif", "yaxşı olar", "tövsiyə", "istərdim"],
};

let rawData = [];

function initRulesUI() {
  const container = document.getElementById("rulesContainer");
  container.innerHTML = "";
  for (const [cat, words] of Object.entries(CATEGORY_RULES)) {
    const catDiv = document.createElement("div");
    catDiv.className =
      "p-3 bg-slate-50 rounded-xl border border-slate-100 group transition-all hover:border-indigo-200";
    catDiv.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="font-bold text-[13px] text-slate-700">${cat}</span>
                <button onclick="removeCategory('${cat}')" class="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                </button>
            </div>
            <div class="flex flex-wrap gap-1.5 mb-2" id="chips_${cat}">
                ${words
                  .map(
                    (
                      w
                    ) => `<span class="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 shadow-sm font-medium">
                    ${w} <button onclick="removeWord('${cat}', '${w}')" class="text-slate-400 hover:text-red-500 font-bold">×</button>
                </span>`
                  )
                  .join("")}
            </div>
            <input type="text" placeholder="+ söz" class="w-full p-1 text-[11px] bg-transparent border-b border-dashed border-slate-300 outline-none focus:border-indigo-500" onkeydown="handleKey(event, '${cat}')">
        `;
    container.appendChild(catDiv);
  }
  localStorage.setItem("myRules", JSON.stringify(CATEGORY_RULES));
}

function handleKey(e, cat) {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const val = e.target.value.trim().toLowerCase();
    if (val && !CATEGORY_RULES[cat].includes(val)) {
      CATEGORY_RULES[cat].push(val);
      e.target.value = "";
      initRulesUI();
      if (rawData.length > 0) processAndDisplay();
    }
  }
}

// Mətndə açar sözləri rəngli vurğulamaq üçün funksiya
function highlightText(text, category) {
  if (category === "Digər" || !CATEGORY_RULES[category]) return text;
  let highlighted = text;
  CATEGORY_RULES[category].forEach((word) => {
    const regex = new RegExp(`(${word})`, "gi");
    highlighted = highlighted.replace(
      regex,
      `<span class="highlight">$1</span>`
    );
  });
  return highlighted;
}

function processAndDisplay() {
  if (rawData.length === 0) return;
  const colKey =
    Object.keys(rawData[0]).find((k) => k.toLowerCase().includes("məzmunu")) ||
    Object.keys(rawData[0])[0];
  let stats = {};
  Object.keys(CATEGORY_RULES).forEach((c) => (stats[c] = 0));
  stats["Digər"] = 0;

  const processed = rawData.map((row) => {
    const content = String(row[colKey] || "").toLowerCase();
    let bestCat = "Digər";
    let maxScore = 0;

    for (const [cat, words] of Object.entries(CATEGORY_RULES)) {
      const score = words.filter((w) => content.includes(w)).length;
      if (score > maxScore) {
        maxScore = score;
        bestCat = cat;
      }
    }
    stats[bestCat]++;
    return { ...row, Sistem_Kateqoriya: bestCat, searchStr: content };
  });

  renderTable(processed);
  renderChart(stats);
  updateStatsSummary(stats, rawData.length);
}

function renderTable(data) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = data
    .slice(0, 100)
    .map(
      (row) => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-4 text-slate-600 leading-relaxed">${highlightText(
              row.searchStr,
              row.Sistem_Kateqoriya
            )}</td>
            <td class="p-4 text-center">
                <span class="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(
                  row.Sistem_Kateqoriya
                )}">
                    ${row.Sistem_Kateqoriya}
                </span>
            </td>
        </tr>
    `
    )
    .join("");
}

function getBadgeColor(cat) {
  const colors = {
    Şikayət: "bg-red-100 text-red-600",
    Sual: "bg-blue-100 text-blue-600",
    Təklif: "bg-emerald-100 text-emerald-600",
    Digər: "bg-slate-100 text-slate-500",
  };
  return colors[cat] || "bg-indigo-100 text-indigo-600";
}

function startAnalysis() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files[0]) return alert("Fayl seçin!");
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    processAndDisplay();
    document.getElementById("downloadBtn").classList.remove("hidden");
  };
  reader.readAsArrayBuffer(fileInput.files[0]);
}

function renderChart(stats) {
  const options = {
    series: Object.values(stats),
    labels: Object.keys(stats),
    chart: { type: "donut", height: 280, animations: { enabled: true } },
    colors: ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#94a3b8"],
    dataLabels: { enabled: false },
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: "75%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Cəmi",
              fontSize: "12px",
              fontWeight: 600,
            },
          },
        },
      },
    },
  };
  document.querySelector("#chart").innerHTML = "";
  new ApexCharts(document.querySelector("#chart"), options).render();
}

function updateStatsSummary(stats, total) {
  const container = document.getElementById("statsSummary");
  container.innerHTML = Object.entries(stats)
    .map(
      ([cat, count]) => `
        <div class="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
            <span class="text-slate-500">${cat}</span>
            <span class="font-bold text-slate-700">${count} <span class="text-[10px] text-slate-400">(${(
        (count / total) *
        100
      ).toFixed(1)}%)</span></span>
        </div>
    `
    )
    .join("");
}

// Digər köməkçi funksiyalar (reset, filter, export, removeWord, removeCategory, addNewCategory) əvvəlki kimi qalır...
// (Onlar üçün yuxarıda artıq tam məntiq verilib)

function filterTable() {
  const term = document.getElementById("searchInput").value.toLowerCase();
  const filtered = rawData.filter((r) => r.searchStr.includes(term));
  renderTable(filtered);
}

function resetAll() {
  if (confirm("Sıfırlansın?")) {
    rawData = [];
    document.getElementById("tableBody").innerHTML = "";
    document.getElementById("chart").innerHTML = "";
    document.getElementById("statsSummary").innerHTML = "";
    document.getElementById("downloadBtn").classList.add("hidden");
  }
}

function exportExcel() {
  const ws = XLSX.utils.json_to_sheet(rawData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Nəticələr");
  XLSX.writeFile(wb, "Analiz_Netice.xlsx");
}

function removeCategory(cat) {
  delete CATEGORY_RULES[cat];
  initRulesUI();
  if (rawData.length > 0) processAndDisplay();
}
function removeWord(cat, word) {
  CATEGORY_RULES[cat] = CATEGORY_RULES[cat].filter((w) => w !== word);
  initRulesUI();
  if (rawData.length > 0) processAndDisplay();
}
function addNewCategory() {
  const name = prompt("Ad:");
  if (name && !CATEGORY_RULES[name]) {
    CATEGORY_RULES[name] = [];
    initRulesUI();
  }
}

initRulesUI();
