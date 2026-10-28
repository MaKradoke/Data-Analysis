// ---- Reviews tab: browse / search / add reviews ----
(function () {
    const $ = id => document.getElementById(id), esc = escapeHTML;
    const IN = 'bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 w-full';
    const stars = n => n == null ? '–' : '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
    const nm = r => r.name || `ผู้รีวิว #${r.seq}`;
    const key = r => r.manual ? 'm' + r.uid : 'f' + r.seq;
    let page = 1, hl = null; const open = new Set();

    function saveManual() { try { localStorage.setItem('wh_manual', JSON.stringify(DATA.manual)); } catch (e) {} }
    function loadManual() { try { DATA.manual = JSON.parse(localStorage.getItem('wh_manual') || '[]'); } catch (e) { DATA.manual = []; } }

    function build() {
        $('tab-reviews').innerHTML = `
        <div class="glass-panel p-5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div><h2 class="text-lg font-bold text-white"><i class="fa-solid fa-comments text-brand-500 mr-2"></i>รีวิวลูกค้า</h2>
            <p id="rv-count" class="text-xs text-slate-400 mt-1"></p></div>
            <div class="flex flex-wrap items-center gap-2"><span id="ex-msg" class="text-xs text-emerald-400"></span>
            <label class="text-xs text-slate-400 flex items-center gap-1.5"><input id="ex-only" type="checkbox">เฉพาะที่เพิ่มเอง</label>
            <button id="ex-xlsx" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-medium"><i class="fa-solid fa-file-excel mr-1 text-emerald-400"></i>Export .xlsx</button>
            <button id="ex-csv" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-medium"><i class="fa-solid fa-file-csv mr-1 text-sky-400"></i>Export .csv</button>
            <button id="rv-toggle" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs md:text-sm font-medium"><i class="fa-solid fa-plus mr-1"></i>เพิ่มรีวิวใหม่</button></div>
        </div>
        <div id="rv-form" class="hidden glass-panel p-5 rounded-2xl space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <label class="text-xs text-slate-400">ชื่อผู้รีวิว *<input id="rn" class="${IN}" maxlength="60"></label>
                <label class="text-xs text-slate-400">อายุ<input id="ra" type="number" min="10" max="120" class="${IN}"></label>
                <label class="text-xs text-slate-400">Department *<input id="rd" list="dl-dept" class="${IN}"><datalist id="dl-dept"></datalist></label>
                <label class="text-xs text-slate-400">Class Name<input id="rc" list="dl-class" class="${IN}"><datalist id="dl-class"></datalist></label>
                <label class="text-xs text-slate-400">คะแนน *<select id="rr" class="${IN}"><option value="">เลือก</option>${[5,4,3,2,1].map(n=>`<option value="${n}">${n} ★</option>`).join('')}</select></label>
                <label class="text-xs text-slate-400">แนะนำสินค้า? *<select id="rrec" class="${IN}"><option value="">เลือก</option><option value="1">แนะนำ (1)</option><option value="0">ไม่แนะนำ (0)</option></select></label>
                <label class="text-xs text-slate-400 md:col-span-2">หัวข้อรีวิว<input id="rt" class="${IN}" maxlength="120"></label>
            </div>
            <label class="text-xs text-slate-400 block">เนื้อหารีวิว<textarea id="rx" rows="3" class="${IN}"></textarea></label>
            <div class="flex items-center gap-3"><button id="rv-save" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-medium">บันทึกรีวิว</button><span id="rv-msg" class="text-xs text-rose-400"></span></div>
        </div>
        <div class="glass-panel p-4 rounded-2xl grid grid-cols-2 md:grid-cols-6 gap-3">
            <input id="rf-q" placeholder="ค้นหา ชื่อ/หัวข้อ/เนื้อหา" class="${IN} col-span-2">
            <select id="rf-dept" class="${IN}"></select>
            <select id="rf-rating" class="${IN}"><option value="">ทุกคะแนน</option>${[5,4,3,2,1].map(n=>`<option value="${n}">${n} ★</option>`).join('')}</select>
            <select id="rf-rec" class="${IN}"><option value="">แนะนำ: ทั้งหมด</option><option value="1">แนะนำ</option><option value="0">ไม่แนะนำ</option></select>
            <select id="rf-sort" class="${IN}"><option value="orig">ลำดับเดิม</option><option value="newest">เพิ่มล่าสุดก่อน</option><option value="hi">คะแนนสูง→ต่ำ</option><option value="lo">คะแนนต่ำ→สูง</option><option value="name">ชื่อ A→Z</option></select>
        </div>
        <div class="glass-panel p-4 rounded-2xl space-y-3">
            <div class="overflow-x-auto rounded-xl border border-slate-800"><table class="w-full text-xs md:text-sm text-left text-slate-300">
            <thead class="text-xs uppercase bg-slate-950/80 text-slate-400"><tr><th class="px-3 py-2">ผู้รีวิว</th><th class="px-3 py-2">อายุ</th><th class="px-3 py-2">Department</th><th class="px-3 py-2">Class</th><th class="px-3 py-2">คะแนน</th><th class="px-3 py-2">แนะนำ</th><th class="px-3 py-2">หัวข้อ</th><th></th></tr></thead>
            <tbody id="rv-body" class="divide-y divide-slate-800/50"></tbody></table></div>
            <div class="flex items-center justify-between text-xs text-slate-400"><span id="rv-info"></span>
            <div class="flex items-center gap-2"><button id="rv-prev" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700">ก่อนหน้า</button><span id="rv-page"></span><button id="rv-next" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700">ถัดไป</button></div></div>
        </div>`;
        $('rv-toggle').onclick = () => $('rv-form').classList.toggle('hidden');
        $('rv-save').onclick = addReview;
        ['rf-q', 'rf-dept', 'rf-rating', 'rf-rec', 'rf-sort'].forEach(id => $(id).oninput = () => { page = 1; render(); });
        $('rv-prev').onclick = () => { page--; render(); };
        $('rv-next').onclick = () => { page++; render(); };
        $('rv-body').onclick = e => {
            const del = e.target.closest('[data-del]');
            if (del) { DATA.manual = DATA.manual.filter(r => 'm' + r.uid !== del.dataset.del); saveManual(); renderDashboard(); return; }
            const tr = e.target.closest('tr[data-k]'); if (!tr) return;
            open.has(tr.dataset.k) ? open.delete(tr.dataset.k) : open.add(tr.dataset.k); render();
        };
    }

    function addReview() {
        const v = id => $(id).value.trim(), msg = t => { $('rv-msg').textContent = t; };
        const age = v('ra') === '' ? null : Number(v('ra'));
        if (!v('rn') || !v('rd') || !v('rr') || v('rrec') === '') return msg('กรุณากรอกช่องที่มี * ให้ครบ');
        if (age !== null && !(age >= 10 && age <= 120)) return msg('อายุต้องอยู่ระหว่าง 10-120');
        DATA.manual.push({ uid: Date.now() + Math.random(), seq: allRows().length + 1, id: '', name: v('rn'), age, dept: v('rd'), division: '', class: v('rc'),
            rating: +v('rr'), rec: +v('rrec'), title: v('rt'), text: v('rx'), pf: null, manual: true });
        hl = key(DATA.manual[DATA.manual.length - 1]);
        saveManual(); msg('');
        ['rn', 'ra', 'rd', 'rc', 'rr', 'rrec', 'rt', 'rx'].forEach(id => $(id).value = '');
        $('rv-form').classList.add('hidden');
        $('rf-q').value = $('rf-dept').value = $('rf-rating').value = $('rf-rec').value = ''; $('rf-sort').value = 'newest'; page = 1;
        renderDashboard();
    }

    function fillFilters() {
        const R = allRows(), cnt = f => [...new Set(R.map(f).filter(Boolean))].sort();
        const cur = $('rf-dept').value;
        $('rf-dept').innerHTML = '<option value="">ทุก Department</option>' + cnt(r => r.dept).map(d => `<option>${esc(d)}</option>`).join('');
        $('rf-dept').value = cur;
        $('dl-dept').innerHTML = cnt(r => r.dept).map(d => `<option value="${esc(d)}">`).join('');
        $('dl-class').innerHTML = cnt(r => r.class).map(d => `<option value="${esc(d)}">`).join('');
    }

    function render() {
        const R = allRows(), q = $('rf-q').value.trim().toLowerCase(), d = $('rf-dept').value, ra = $('rf-rating').value, rc = $('rf-rec').value, so = $('rf-sort').value;
        let L = R.filter(r => (!d || r.dept === d) && (!ra || r.rating === +ra) && (rc === '' || r.rec === +rc) &&
            (!q || [nm(r), r.title, r.text, r.class].some(s => String(s || '').toLowerCase().includes(q))));
        if (so === 'newest') L = [...L].sort((a, b) => (b.manual ? b.uid : 0) - (a.manual ? a.uid : 0));
        else if (so === 'hi') L = [...L].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        else if (so === 'lo') L = [...L].sort((a, b) => (a.rating || 0) - (b.rating || 0));
        else if (so === 'name') L = [...L].sort((a, b) => nm(a).localeCompare(nm(b)));
        const ps = 15, pages = Math.max(1, Math.ceil(L.length / ps)); page = Math.min(Math.max(1, page), pages);
        $('rv-count').textContent = `รีวิวทั้งหมด ${R.length.toLocaleString()} รายการ (จากไฟล์ ${DATA.file.length.toLocaleString()} + เพิ่มเอง ${DATA.manual.length.toLocaleString()})`;
        $('rv-body').innerHTML = L.length ? L.slice((page - 1) * ps, page * ps).map(r => {
            const k = key(r), isO = open.has(k);
            return `<tr data-k="${k}" class="cursor-pointer hover:bg-slate-800/40 ${k === hl ? 'bg-emerald-500/10' : ''}">
              <td class="px-3 py-2 font-medium text-white">${esc(nm(r))}${r.manual ? ' <span class="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400">เพิ่มเอง</span>' : ''}</td>
              <td class="px-3 py-2">${esc(r.age ?? '–')}</td><td class="px-3 py-2">${esc(r.dept)}</td><td class="px-3 py-2">${esc(r.class)}</td>
              <td class="px-3 py-2 text-amber-400 whitespace-nowrap">${stars(r.rating)}</td>
              <td class="px-3 py-2">${r.rec == null ? '–' : r.rec ? '<span class="text-emerald-400">Yes</span>' : '<span class="text-rose-400">No</span>'}</td>
              <td class="px-3 py-2 max-w-xs truncate">${esc(r.title)}</td>
              <td class="px-3 py-2">${r.manual ? `<button data-del="${k}" title="ลบรีวิวนี้" class="text-rose-400 hover:text-rose-300"><i class="fa-solid fa-trash-can"></i></button>` : ''}</td></tr>
              ${isO ? `<tr><td colspan="8" class="px-4 py-3 bg-slate-950/60 text-slate-300 text-xs leading-relaxed">${esc(r.text) || '<span class="text-slate-500">(ไม่มีเนื้อหารีวิว)</span>'}</td></tr>` : ''}`;
        }).join('') : '<tr><td colspan="8" class="px-4 py-8 text-center text-slate-500">ยังไม่มีรีวิว — อัปโหลดไฟล์ หรือกด "เพิ่มรีวิวใหม่"</td></tr>';
        $('rv-info').textContent = `พบ ${L.length.toLocaleString()} รายการ (คลิกแถวเพื่ออ่านเนื้อหารีวิว)`;
        $('rv-page').textContent = `หน้า ${page} / ${pages}`;
        $('rv-prev').disabled = page <= 1; $('rv-next').disabled = page >= pages;
    }

    document.addEventListener('DOMContentLoaded', () => {
        build(); loadManual(); renderDashboard();
        document.addEventListener('data:changed', () => { fillFilters(); render(); });
        fillFilters(); render();
    });
})();
