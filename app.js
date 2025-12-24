let CATEGORY_RULES = JSON.parse(localStorage.getItem("myRules")) || {
  Şikayət: ["gecikmə", "problem", "narazı", "zəif", "pis", "səhv"],
  Sual: ["necə", "qiymət", "məlumat", "harada", "nə qədər"],
  Təklif: ["təklif", "yaxşı olar", "tövsiyə", "istərdim"],
};

let rawData = [];
let processedData = []; // Axtarış üçün emal edilmiş data

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
                <button onclick="removeCategory('${cat}')" class="text-slate-400 hover:text-red-500 transition">×</button>
            </div>
            <div class="flex flex-wrap gap-1.5 mb-2">
                ${words
                  .map(
                    (
                      w
                    ) => `<span class="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 shadow-sm font-medium">
                    ${w} <button onclick="removeWord('${cat}', '${w}')" class="text-slate-400 hover:text-red-500">×</button>
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
      if (rawData.length > 0) analyzeData();
    }
  }
}

function highlightText(text, category) {
  if (category === "Digər" || !CATEGORY_RULES[category]) return text;
  let highlighted = text;
  CATEGORY_RULES[category].forEach((word) => {
    const regex = new RegExp(
      `(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    highlighted = highlighted.replace(
      regex,
      `<span class="highlight">$1</span>`
    );
  });
  return highlighted;
}

function analyzeData() {
  if (rawData.length === 0) return;
  const colKey =
    Object.keys(rawData[0]).find((k) => k.toLowerCase().includes("məzmunu")) ||
    Object.keys(rawData[0])[0];

  let stats = {};
  Object.keys(CATEGORY_RULES).forEach((c) => (stats[c] = 0));
  stats["Digər"] = 0;

  processedData = rawData.map((row) => {
    const content = String(row[colKey] || "");
    const contentLower = content.toLowerCase();
    let bestCat = "Digər";
    let foundWords = [];

    for (const [cat, words] of Object.entries(CATEGORY_RULES)) {
      const matches = words.filter((w) => contentLower.includes(w));
      if (matches.length > 0) {
        bestCat = cat;
        foundWords = matches;
        break; // İlk tapılan kateqoriyanı götürürük
      }
    }
    stats[bestCat]++;
    // Eksport üçün sütunlar əlavə edirik
    return {
      ...row,
      Analiz_Nəticəsi: bestCat,
      Tapılan_Açar_Sözlər: foundWords.join(", "),
      _searchStr: contentLower,
    };
  });

  renderTable(processedData);
  renderChart(stats);
  updateStatsSummary(stats, rawData.length);
  document.getElementById("downloadBtn").classList.remove("hidden");
}

function renderTable(data) {
  const tbody = document.getElementById("tableBody");
  // Performans üçün ilk 200 sətiri göstəririk
  tbody.innerHTML = data
    .slice(0, 200)
    .map(
      (row) => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-4 text-slate-600 leading-relaxed">${highlightText(
              row._searchStr,
              row.Analiz_Nəticəsi
            )}</td>
            <td class="p-4 text-center">
                <span class="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(
                  row.Analiz_Nəticəsi
                )}">
                    ${row.Analiz_Nəticəsi}
                </span>
            </td>
        </tr>
    `
    )
    .join("");
}

function filterTable() {
  const term = document.getElementById("searchInput").value.toLowerCase();
  if (!term) {
    renderTable(processedData);
    return;
  }
  const filtered = processedData.filter((r) => r._searchStr.includes(term));
  renderTable(filtered);
}

function startAnalysis() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files[0]) return alert("Fayl seçin!");
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    analyzeData();
  };
  reader.readAsArrayBuffer(fileInput.files[0]);
}

function renderChart(stats) {
  const options = {
    series: Object.values(stats),
    labels: Object.keys(stats),
    chart: {
      type: "donut",
      height: 350,
      toolbar: { show: true, tools: { download: true } }, // Chart UI alətləri
    },
    colors: ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6", "#94a3b8"],
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: { show: true, total: { show: true, label: "Cəmi" } },
        },
      },
    },
    legend: { position: "bottom" },
  };
  document.querySelector("#chart").innerHTML = "";
  new ApexCharts(document.querySelector("#chart"), options).render();
}

function exportExcel() {
  // Eksport edərkən axtarış üçün istifadə etdiyimiz müvəqqəti sütunu silirik
  const exportData = processedData.map(({ _searchStr, ...rest }) => rest);
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Analiz Nəticələri");
  XLSX.writeFile(wb, "DataProcessor_Eksport.xlsx");
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

function updateStatsSummary(stats, total) {
  const container = document.getElementById("statsSummary");
  container.innerHTML = Object.entries(stats)
    .map(
      ([cat, count]) => `
        <div class="flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-0">
            <span class="text-slate-500">${cat}</span>
            <span class="font-bold">${count} (${((count / total) * 100).toFixed(
        1
      )}%)</span>
        </div>
    `
    )
    .join("");
}

function resetAll() {
  if (confirm("Bütün məlumatlar təmizlənsin?")) {
    rawData = [];
    processedData = [];
    document.getElementById("tableBody").innerHTML = "";
    document.getElementById("chart").innerHTML = "";
    document.getElementById("statsSummary").innerHTML = "";
    document.getElementById("searchInput").value = "";
    document.getElementById("downloadBtn").classList.add("hidden");
  }
}

function removeCategory(cat) {
  delete CATEGORY_RULES[cat];
  initRulesUI();
  if (rawData.length > 0) analyzeData();
}
function removeWord(cat, word) {
  CATEGORY_RULES[cat] = CATEGORY_RULES[cat].filter((w) => w !== word);
  initRulesUI();
  if (rawData.length > 0) analyzeData();
}
function addNewCategory() {
  const name = prompt("Yeni kateqoriya adı:");
  if (name && !CATEGORY_RULES[name]) {
    CATEGORY_RULES[name] = [];
    initRulesUI();
  }
}

initRulesUI();
