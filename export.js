// ---- Export: original file rows (all original columns) + reviews added by hand ----
(function () {
    const $ = id => document.getElementById(id);
    const STD = { id: 'Clothing ID', age: 'Age', title: 'Title', text: 'Review Text', rating: 'Rating', rec: 'Recommended IND',
        pf: 'Positive Feedback Count', division: 'Division Name', dept: 'Department Name', class: 'Class Name', name: 'Reviewer Name' };
    const KMAP = { division: 'div', class: 'cls' };           // field -> key used by script.js column detection
    const colName = f => (DATA.cols && DATA.cols[KMAP[f] || f]) || STD[f];

    function toObj(r) {                                       // a hand-added review -> row using the file's own column names
        const o = {};
        Object.keys(STD).forEach(f => { const v = r[f]; if (v != null && v !== '') o[colName(f)] = v; });
        return o;
    }
    function build(onlyManual) {
        const src = onlyManual ? DATA.manual : allRows(), rows = src.map(r => r.manual || !r._raw ? toObj(r) : r._raw), cols = [];
        const seen = new Set(); rows.forEach(o => Object.keys(o).forEach(k => { if (!seen.has(k)) { seen.add(k); cols.push(k); } }));
        return { rows, cols };
    }
    const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fname = ext => ((DATA.fileName || 'reviews').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_')) + '_updated_' + stamp() + '.' + ext;
    const cell = v => {
        if (v == null) return '';
        let s = String(v); if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;   // stop spreadsheet formula injection
        return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    function save(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    const msg = t => { $('ex-msg').textContent = t; if (t) setTimeout(() => { $('ex-msg').textContent = ''; }, 4000); };

    function exportAs(kind) {
        const only = $('ex-only').checked, { rows, cols } = build(only);
        if (!rows.length) return msg(only ? 'ยังไม่มีรีวิวที่เพิ่มเอง' : 'ยังไม่มีข้อมูลให้ Export');
        if (kind === 'csv') {
            const csv = [cols.map(cell).join(','), ...rows.map(o => cols.map(c => cell(o[c])).join(','))].join('\r\n');
            save(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), fname('csv'));
        } else {
            if (typeof XLSX === 'undefined' || !XLSX.utils || !XLSX.utils.json_to_sheet) return msg('โหลดไลบรารี Excel ไม่สำเร็จ — ลอง Export เป็น CSV แทน');
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { header: cols }), 'Reviews');
            XLSX.writeFile(wb, fname('xlsx'));
        }
        msg(`Export ${rows.length.toLocaleString()} แถวแล้ว`);
    }

    document.addEventListener('DOMContentLoaded', () => { $('ex-xlsx').onclick = () => exportAs('xlsx'); $('ex-csv').onclick = () => exportAs('csv'); });
})();
