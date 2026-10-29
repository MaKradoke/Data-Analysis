// ---------- State ----------
let deptChartInstance = null;
let ageChartInstance = null;

// Shared data store: rows from the uploaded file + reviews added by hand
const DATA = { file: [], manual: [], fileName: '' };
const allRows = () => DATA.file.concat(DATA.manual);

const AGE_BINS = [
    { label: '18-25 ปี', test: a => a <= 25 },
    { label: '26-35 ปี', test: a => a >= 26 && a <= 35 },
    { label: '36-50 ปี', test: a => a >= 36 && a <= 50 },
    { label: '51-65 ปี', test: a => a >= 51 && a <= 65 },
    { label: '65+ ปี',   test: a => a > 65 }
];

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', function () {
    initCharts();
    setupDragDrop();
    renderDashboard();
});

// ---------- Empty state <-> report ----------
function setHasData(has) {
    document.querySelectorAll('.data-report').forEach(el => el.classList.toggle('hidden', !has));
    document.querySelectorAll('.data-empty').forEach(el => el.classList.toggle('hidden', has));
    if (has) {
        // charts were created while hidden; make them re-measure
        [deptChartInstance, ageChartInstance].forEach(c => c && c.resize());
    }
}

function clearDashboard() {
    const d = deptChartInstance, a = ageChartInstance;
    d.data.labels = []; d.data.datasets[0].data = []; d.data.datasets[1].data = []; d.update();
    a.data.datasets[0].data = []; a.update();
    document.getElementById('dataTableBody').innerHTML = '';
    ['kpi-recommend', 'kpi-reviews', 'kpi-topdept'].forEach(id => { document.getElementById(id).textContent = '–'; });
    document.getElementById('kpi-rating').innerHTML = '– <span class="text-sm text-amber-400">★</span>';
    document.getElementById('kpi-topdept-pct').textContent = '–';
}

// Remove the uploaded file (reviews added by hand are kept)
function removeFile() {
    DATA.file = []; DATA.fileName = '';
    document.getElementById('excelFileInput').value = '';
    renderDashboard();
}

function updateStatus() {
    const box = document.getElementById('fileStatus');
    if (!DATA.file.length) { box.classList.add('hidden'); return; }
    document.getElementById('fileStatusName').textContent = DATA.fileName;
    document.getElementById('fileStatusInfo').textContent = `วิเคราะห์ข้อมูลแล้ว ${DATA.file.length.toLocaleString()} แถว` + (DATA.manual.length ? ` + รีวิวที่เพิ่มเอง ${DATA.manual.length} รายการ` : '');
    box.classList.remove('hidden');
}

// ---------- Helpers ----------
function escapeHTML(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

const normKey = k => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');

// Find a column by several possible header names (case/space/symbol-insensitive)
function pickKey(row, candidates) {
    const map = {};
    Object.keys(row).forEach(k => { map[normKey(k)] = k; });
    for (const c of candidates) if (map[c] !== undefined) return map[c];
    return null;
}

// ---------- Tabs ----------
function switchTab(tabId) {
    ['overview', 'reviews', 'stats', 'tableau'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.add('hidden');
        const btn = document.getElementById(`nav-${t}`);
        btn.classList.remove('bg-brand-600', 'text-white', 'shadow-md');
        btn.classList.add('text-slate-400');
    });
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    const activeBtn = document.getElementById(`nav-${tabId}`);
    activeBtn.classList.add('bg-brand-600', 'text-white', 'shadow-md');
    activeBtn.classList.remove('text-slate-400');
}

// ---------- Table (escaped to prevent XSS) ----------
function renderSampleTable(rows) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = rows.map(row => `
        <tr class="hover:bg-slate-800/40 transition-colors">
            <td class="px-4 py-2 font-mono text-xs text-brand-400">#${escapeHTML(row.id)}</td>
            <td class="px-4 py-2">${escapeHTML(row.age)}</td>
            <td class="px-4 py-2">${escapeHTML(row.dept)}</td>
            <td class="px-4 py-2">${escapeHTML(row.class)}</td>
            <td class="px-4 py-2 font-semibold text-amber-400">${escapeHTML(row.rating)} ★</td>
            <td class="px-4 py-2">
                <span class="px-2 py-0.5 rounded text-xs ${row.rec ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
                    ${row.rec ? 'Yes (1)' : 'No (0)'}
                </span>
            </td>
            <td class="px-4 py-2 text-slate-300 truncate max-w-xs">${escapeHTML(row.title)}</td>
        </tr>
    `).join('');
}

// ---------- Charts ----------
function initCharts() {
    const ctxDept = document.getElementById('deptChart').getContext('2d');
    deptChartInstance = new Chart(ctxDept, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'คะแนนรีวิวเฉลี่ย (Avg Rating)',
                    data: [],
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'อัตราการแนะนำ % (Rec. Rate)',
                    data: [],
                    type: 'line',
                    borderColor: '#10b981',
                    backgroundColor: '#10b981',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { min: 3, max: 5, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y1: { position: 'right', min: 50, max: 100, ticks: { color: '#10b981' }, grid: { drawOnChartArea: false } }
            },
            plugins: { legend: { labels: { color: '#cbd5e1', font: { family: 'Prompt' } } } }
        }
    });

    const ctxAge = document.getElementById('ageChart').getContext('2d');
    ageChartInstance = new Chart(ctxAge, {
        type: 'line',
        data: {
            labels: AGE_BINS.map(b => b.label),
            datasets: [{
                label: 'อัตราความพึงพอใจในการแนะนำสินค้า (%)',
                data: [],
                fill: true,
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                borderColor: '#6366f1',
                borderWidth: 3,
                pointBackgroundColor: '#818cf8',
                pointRadius: 5,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { min: 70, max: 95, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            },
            plugins: { legend: { labels: { color: '#cbd5e1', font: { family: 'Prompt' } } } }
        }
    });
}

// ---------- Upload: parse -> compute -> update everything ----------
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) processFile(file);
    event.target.value = ''; // allow re-selecting the same file
}

function processFile(file) {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
        alert('รองรับเฉพาะไฟล์ .xlsx, .xls หรือ .csv');
        return;
    }
    const reader = new FileReader();
    reader.onerror = () => alert('อ่านไฟล์ไม่สำเร็จ');
    reader.onload = function (e) {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            if (!rows.length) { alert('ไฟล์ไม่มีข้อมูล'); return; }
            applyData(rows, file.name);
        } catch (err) {
            console.error(err);
            alert('ไม่สามารถประมวลผลไฟล์นี้ได้ กรุณาตรวจสอบรูปแบบไฟล์');
        }
    };
    reader.readAsArrayBuffer(file);
}

function applyData(rawRows, fileName) {
    const first = Object.assign({}, ...rawRows.slice(0, 300));
    const K = {
        name:   pickKey(first, ['reviewername', 'reviewer', 'customername', 'customer', 'name', 'username', 'user', 'author']),
        text:   pickKey(first, ['reviewtext', 'review', 'text', 'comment']),
        pf:     pickKey(first, ['positivefeedbackcount', 'positivefeedback']),
        id:     pickKey(first, ['clothingid', 'id']),
        age:    pickKey(first, ['age']),
        title:  pickKey(first, ['title', 'reviewtitle']),
        rating: pickKey(first, ['rating']),
        rec:    pickKey(first, ['recommendedind', 'recommended', 'recommend']),
        dept:   pickKey(first, ['departmentname', 'department']),
        div:    pickKey(first, ['divisionname', 'division']),
        cls:    pickKey(first, ['classname', 'class'])
    };

    const missing = ['rating', 'dept'].filter(k => !K[k]);
    if (missing.length) {
        alert('ไม่พบคอลัมน์ที่จำเป็น: ' + missing.join(', ') +
              '\n(ต้องมีอย่างน้อย Rating และ Department Name)');
        return;
    }

    const num = v => { const n = Number(v); return Number.isFinite(n) ? n : null; };
    const recVal = v => (v === 1 || v === '1' || String(v).toLowerCase() === 'yes' || v === true) ? 1 : 0;

    const rows = rawRows.map(r => ({
        _raw: r,
        id: K.id ? r[K.id] : '',
        age: K.age ? num(r[K.age]) : null,
        dept: String(r[K.dept] ?? '').trim(),
        division: K.div ? String(r[K.div] ?? '').trim() : '',
        class: K.cls ? String(r[K.cls] ?? '').trim() : '',
        rating: num(r[K.rating]),
        rec: K.rec ? recVal(r[K.rec]) : null,
        title: K.title ? String(r[K.title] ?? '') : '',
        text: K.text ? String(r[K.text] ?? '') : '',
        name: K.name ? String(r[K.name] ?? '').trim() : '',
        pf: K.pf ? num(r[K.pf]) : null
    }));

    rows.forEach((r, i) => { r.seq = i + 1; });
    DATA.cols = K;
    DATA.file = rows;
    DATA.fileName = fileName || 'uploaded file';
    renderDashboard();
}

function renderDashboard() {
    const rows = allRows();
    if (!rows.length) { clearDashboard(); setHasData(false); updateStatus(); document.dispatchEvent(new Event('data:changed')); return; }
    setHasData(true);

    // --- KPIs ---
    const rated = rows.filter(r => r.rating !== null);
    const avgRating = rated.reduce((s, r) => s + r.rating, 0) / (rated.length || 1);
    document.getElementById('kpi-rating').innerHTML =
        `${avgRating.toFixed(2)} <span class="text-sm text-amber-400">★</span>`;

    const recRows = rows.filter(r => r.rec !== null);
    document.getElementById('kpi-recommend').textContent = recRows.length
        ? (recRows.reduce((s, r) => s + r.rec, 0) / recRows.length * 100).toFixed(1) + '%'
        : 'N/A';

    document.getElementById('kpi-reviews').textContent = rows.length.toLocaleString();

    // --- Department stats ---
    const dept = {};
    rows.forEach(r => {
        if (!r.dept) return;
        const d = dept[r.dept] || (dept[r.dept] = { n: 0, rs: 0, rn: 0, recS: 0, recN: 0 });
        d.n++;
        if (r.rating !== null) { d.rs += r.rating; d.rn++; }
        if (r.rec !== null) { d.recS += r.rec; d.recN++; }
    });
    const deptNames = Object.keys(dept).sort((a, b) => dept[b].n - dept[a].n);
    if (deptNames.length) {
        document.getElementById('kpi-topdept').textContent = deptNames[0];
        document.getElementById('kpi-topdept-pct').textContent =
            (dept[deptNames[0]].n / rows.length * 100).toFixed(1) + '% ของรีวิวมวลรวม';
    }
    const deptAvg = deptNames.map(n => +(dept[n].rs / (dept[n].rn || 1)).toFixed(2));
    const deptRec = deptNames.map(n => +(dept[n].recS / (dept[n].recN || 1) * 100).toFixed(1));

    deptChartInstance.data.labels = deptNames;
    deptChartInstance.data.datasets[0].data = deptAvg;
    deptChartInstance.data.datasets[1].data = deptRec;
    deptChartInstance.options.scales.y.min = Math.min(3, Math.floor(Math.min(...deptAvg)));
    deptChartInstance.options.scales.y1.min = Math.min(50, Math.floor(Math.min(...deptRec) / 10) * 10);
    deptChartInstance.update();

    // --- Age chart ---
    const ageRec = AGE_BINS.map(bin => {
        const g = rows.filter(r => r.age !== null && r.rec !== null && bin.test(r.age));
        return g.length ? +(g.reduce((s, r) => s + r.rec, 0) / g.length * 100).toFixed(1) : null;
    });
    const valid = ageRec.filter(v => v !== null);
    ageChartInstance.data.datasets[0].data = ageRec;
    if (valid.length) {
        ageChartInstance.options.scales.y.min = Math.floor(Math.min(...valid) / 5) * 5 - 5;
        ageChartInstance.options.scales.y.max = Math.min(100, Math.ceil(Math.max(...valid) / 5) * 5 + 5);
    }
    ageChartInstance.update();

    // --- Table preview (first 10 rows) ---
    renderSampleTable(rows.slice(0, 10).map(r => ({
        ...r, dept: r.division || r.dept
    })));

    updateStatus();
    document.dispatchEvent(new Event('data:changed'));
}

// ---------- Drag & drop ----------
function setupDragDrop() {
    const box = document.getElementById('uploadBox');
    ['dragenter', 'dragover'].forEach(ev => box.addEventListener(ev, e => {
        e.preventDefault();
        box.classList.add('border-brand-500');
    }));
    ['dragleave', 'drop'].forEach(ev => box.addEventListener(ev, e => {
        e.preventDefault();
        box.classList.remove('border-brand-500');
    }));
    box.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    });
}

// ---------- Tableau embed (validated) ----------
function updateTableauEmbed() {
    const raw = document.getElementById('tableauUrlInput').value.trim();
    const iframe = document.getElementById('tableauIframe');
    const placeholder = document.getElementById('tableauPlaceholder');

    if (!raw) { alert('กรุณากรอก URL ลิงก์ Dashboard จาก Tableau Public'); return; }

    let u;
    try { u = new URL(raw); } catch { alert('รูปแบบ URL ไม่ถูกต้อง'); return; }

    const okHost = u.hostname === 'public.tableau.com' || u.hostname.endsWith('.tableau.com');
    if (u.protocol !== 'https:' || !okHost) {
        alert('รองรับเฉพาะลิงก์ https จากโดเมน tableau.com เท่านั้น');
        return;
    }
    iframe.src = u.href;
    showTableau('iframe');
}
