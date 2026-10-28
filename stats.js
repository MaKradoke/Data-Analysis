// ---- สถิติเชิงอนุมาน: Descriptive / t-Test / ANOVA / Z-test / Correlation / Solver ----
(function () {
    const $ = id => document.getElementById(id), esc = escapeHTML;
    const IN = 'bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 w-full';
    const fx = (x, d = 4) => x == null || !isFinite(x) ? '–' : (+x).toFixed(d);
    const fp = p => p < 0.0001 ? '< 0.0001' : p.toFixed(4);
    const TABS = { d: 'Descriptive', t: 't-Test', a: 'ANOVA', z: 'Z-test', c: 'Correlation', s: 'Solver' };
    let tab = 'd';

    const VARS = () => { const R = allRows(), v = { rating: ['Rating (1-5)', r => r.rating], age: ['Age', r => r.age], rec: ['Recommended (0/1)', r => r.rec] };
        if (R.some(r => r.pf != null)) v.pf = ['Positive Feedback Count', r => r.pf];
        if (R.some(r => r.text)) v.len = ['ความยาวรีวิว (ตัวอักษร)', r => r.text ? r.text.length : null]; return v; };
    const GRP = { dept: ['Department', r => r.dept], class: ['Class Name', r => r.class],
        rec: ['Recommended', r => r.rec == null ? null : r.rec ? 'แนะนำ (1)' : 'ไม่แนะนำ (0)'], rating: ['Rating', r => r.rating == null ? null : r.rating + '★'],
        age: ['กลุ่มอายุ', r => { if (r.age == null) return null; const b = AGE_BINS.find(b => b.test(r.age)); return b && b.label; }] };
    const MET = { rec: ['แนะนำ (Recommended=1)', r => r.rec], r4: ['Rating ≥ 4', r => r.rating == null ? null : +(r.rating >= 4)],
        r5: ['Rating = 5', r => r.rating == null ? null : +(r.rating === 5)], r2: ['Rating ≤ 2', r => r.rating == null ? null : +(r.rating <= 2)] };

    const val = id => $(id).value;
    const samp = (ext, gk, g) => allRows().filter(r => gk === 'none' || GRP[gk][1](r) === g).map(ext).filter(v => v != null && isFinite(v));
    const groupsOf = gk => { const c = {}; allRows().forEach(r => { const g = GRP[gk][1](r); if (g) c[g] = (c[g] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]); };
    const ext = () => VARS()[val('sv')][1];
    const need = (a, n, label) => { if (!a || a.length < n) throw new Error(`${label} มีข้อมูลไม่พอ (ต้องมีอย่างน้อย ${n} ค่า, พบ ${a ? a.length : 0})`); };
    const tb = (head, rows) => `<div class="overflow-x-auto rounded-xl border border-slate-800"><table class="w-full text-xs text-left text-slate-300"><thead class="bg-slate-950/80 text-slate-400"><tr>${head.map(h => `<th class="px-3 py-2">${h}</th>`).join('')}</tr></thead><tbody class="divide-y divide-slate-800/50">${rows.map(r => `<tr>${r.map(c => `<td class="px-3 py-1.5">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const card = h => `<div class="glass-panel p-5 rounded-2xl space-y-3 text-sm text-slate-300">${h}</div>`;
    const dec = (p, al) => p < al ? `<b class="text-emerald-400">ปฏิเสธ H0</b> — มีนัยสำคัญทางสถิติที่ α = ${al}` : `<b class="text-amber-400">ไม่ปฏิเสธ H0</b> — ยังไม่พบนัยสำคัญที่ α = ${al}`;
    const SYM = { two: '≠', greater: '>', less: '<' };
    const out = h => { $('st-out').innerHTML = h; };

    function build() {
        const L = (f, label, h) => `<label data-f="${f}" class="text-xs text-slate-400 block">${label}${h}</label>`, S = id => `<select id="${id}" class="${IN}"></select>`;
        $('tab-stats').innerHTML = `
        <div class="glass-panel p-5 rounded-2xl"><h2 class="text-lg font-bold text-white"><i class="fa-solid fa-square-root-variable text-brand-500 mr-2"></i>สถิติเชิงอนุมาน</h2>
        <p class="text-xs text-slate-400 mt-1">คำนวณจากรีวิวทั้งหมดที่มีในระบบ (ไฟล์ + ที่เพิ่มเอง)</p>
        <div id="st-nav" class="flex flex-wrap gap-2 mt-4">${Object.entries(TABS).map(([k, v]) => `<button data-t="${k}" class="px-3 py-1.5 rounded-lg text-xs font-medium">${v}</button>`).join('')}</div></div>
        <div id="st-ctl" class="glass-panel p-5 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-3">
            ${L('d t a z', 'ตัวแปร', S('sv'))}${L('t', 'ชนิด t-Test', `<select id="smt" class="${IN}"><option value="welch">สองกลุ่ม (Welch)</option><option value="pooled">สองกลุ่ม (Pooled var)</option><option value="one">กลุ่มเดียว (One-sample)</option></select>`)}
            ${L('z', 'ชนิด Z-test', `<select id="smz" class="${IN}"><option value="mean2">เฉลี่ย 2 กลุ่ม</option><option value="mean1">เฉลี่ย 1 กลุ่ม</option><option value="prop2">สัดส่วน 2 กลุ่ม</option><option value="prop1">สัดส่วน 1 กลุ่ม</option></select>`)}
            ${L('z', 'ตัวชี้วัด (สัดส่วน)', `<select id="smet" class="${IN}">${Object.entries(MET).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>`)}
            ${L('d t a z', 'แยกกลุ่มตาม', S('sg'))}${L('t z', 'กลุ่ม A (หรือกลุ่มเดียว)', S('sa'))}${L('t z', 'กลุ่ม B', S('sb'))}
            ${L('t z', 'ค่าสมมติ μ0 / p0', `<input id="s0" type="number" step="any" value="0" class="${IN}">`)}
            ${L('z', 'σ ที่ทราบ (ว่าง = ใช้ SD ตัวอย่าง)', `<input id="ssg" type="number" step="any" class="${IN}">`)}
            ${L('t z', 'ทิศทาง H1', `<select id="stl" class="${IN}"><option value="two">สองด้าน (≠)</option><option value="greater">A มากกว่า (>)</option><option value="less">A น้อยกว่า (<)</option></select>`)}
            ${L('t a z c', 'ระดับนัยสำคัญ α', `<select id="sal" class="${IN}"><option>0.10</option><option selected>0.05</option><option>0.01</option></select>`)}
            <div class="flex items-end"><button id="st-run" class="w-full px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium">คำนวณ</button></div></div>
        <div id="st-solver" class="hidden glass-panel p-5 rounded-2xl space-y-3 text-xs text-slate-400">
            <p>Linear Programming Solver (ตัวแปรทั้งหมด ≥ 0) — ใส่สัมประสิทธิ์ของฟังก์ชันเป้าหมาย และเงื่อนไขทีละบรรทัดในรูป <code class="text-brand-400">a1 a2 ... &lt;= b</code> (ใช้ &lt;=, &gt;= หรือ =)</p>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3"><label>เป้าหมาย<select id="so-dir" class="${IN}"><option value="1">Maximize</option><option value="0">Minimize</option></select></label>
            <label class="md:col-span-3">สัมประสิทธิ์ฟังก์ชันเป้าหมาย (เช่น 3 2)<input id="so-obj" value="3 2" class="${IN}"></label></div>
            <label class="block">เงื่อนไข (หนึ่งบรรทัดต่อหนึ่งเงื่อนไข)<textarea id="so-con" rows="4" class="${IN} font-mono">1 1 <= 4
1 3 <= 6
1 0 <= 3</textarea></label>
            <button id="so-run" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium">Solve</button></div>
        <div id="st-out" class="space-y-3"></div>`;
        $('st-nav').onclick = e => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); };
        $('st-run').onclick = run; $('so-run').onclick = solve;
        $('sg').onchange = fillAB; $('smt').onchange = $('smz').onchange = () => {};
        go('d');
    }

    function go(t) {
        tab = t; out('');
        document.querySelectorAll('#st-nav [data-t]').forEach(b => b.className = 'px-3 py-1.5 rounded-lg text-xs font-medium ' + (b.dataset.t === t ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'));
        document.querySelectorAll('#st-ctl [data-f]').forEach(l => l.classList.toggle('hidden', !l.dataset.f.split(' ').includes(t)));
        $('st-ctl').classList.toggle('hidden', t === 's'); $('st-solver').classList.toggle('hidden', t !== 's');
    }

    function refresh() {
        const keep = (id, html) => { const c = $(id).value; $(id).innerHTML = html; if ([...$(id).options].some(o => o.value === c)) $(id).value = c; };
        keep('sv', Object.entries(VARS()).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join(''));
        keep('sg', '<option value="none">— ไม่แยกกลุ่ม —</option>' + Object.entries(GRP).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join(''));
        fillAB(); out('');
    }
    function fillAB() {
        const gk = val('sg'), g = gk === 'none' ? [] : groupsOf(gk), o = g.map(([k, n]) => `<option value="${esc(k)}">${esc(k)} (n=${n})</option>`).join('');
        $('sa').innerHTML = o; $('sb').innerHTML = o; if (g.length > 1) $('sb').selectedIndex = 1;
    }

    function run() {
        try { ({ d: descriptive, t: tTest, a: anovaRun, z: zTest, c: corr })[tab](); }
        catch (e) { out(card(`<span class="text-rose-400"><i class="fa-solid fa-circle-exclamation mr-1"></i>${esc(e.message)}</span>`)); }
    }
    const alpha = () => +val('sal');

    function descriptive() {
        const gk = val('sg'), e = ext(), cols = [['รวมทั้งหมด', samp(e, 'none')]];
        if (gk !== 'none') groupsOf(gk).slice(0, 8).forEach(([g]) => cols.push([g, samp(e, gk, g)]));
        need(cols[0][1], 1, 'ตัวแปรนี้'); const al = alpha(), Ds = cols.map(([, a]) => a.length ? D(a) : null);
        const ci = d => d && d.n > 1 ? tinv(1 - al / 2, d.n - 1) * d.se : NaN;
        const rows = [['N', d => d.n], ['Mean', d => fx(d.mean)], ['Standard Error', d => fx(d.se)], ['Median', d => fx(d.med)], ['Mode', d => d.mode == null ? 'N/A' : d.mode],
            ['Std Deviation', d => fx(d.sd)], ['Variance', d => fx(d.v)], ['Kurtosis', d => fx(d.ku)], ['Skewness', d => fx(d.sk)], ['Range', d => fx(d.max - d.min)],
            ['Min', d => d.min], ['Max', d => d.max], ['Sum', d => fx(d.sum, 2)], [`CI ${100 - al * 100}% (±)`, d => fx(ci(d))]];
        out(card(`<h3 class="font-bold text-white">Descriptive Statistics — ${esc(VARS()[val('sv')][0])}</h3>` +
            tb(['สถิติ', ...cols.map(c => esc(c[0]))], rows.map(([n, f]) => [n, ...Ds.map(d => d ? f(d) : '–')]))));
    }

    function report(title, h0, h1, rows, stat, name, r, al, extra = '') {
        return card(`<h3 class="font-bold text-white">${title}</h3><p>H0: ${h0}<br>H1: ${h1}</p>${tb(rows[0], rows.slice(1))}
        ${tb(['สถิติ', 'ค่า'], [[name, fx(stat)], ...(r.df != null ? [['df', fx(r.df, 2)]] : []), ['p-value', fp(r.p)], ['ค่าวิกฤต', fx(r.crit)], ...(extra || [])])}<p>${dec(r.p, al)}</p>`);
    }

    function tTest() {
        const mode = val('smt'), tail = val('stl'), al = alpha(), gk = val('sg'), e = ext(), mu = +val('s0');
        if (mode !== 'one' && gk === 'none') throw new Error('เลือก "แยกกลุ่มตาม" และกลุ่ม A / B สำหรับ t-Test สองกลุ่ม');
        const a = samp(e, gk, val('sa')), b = mode === 'one' ? null : samp(e, gk, val('sb'));
        need(a, 2, 'กลุ่ม A'); if (b) { need(b, 2, 'กลุ่ม B'); if (val('sa') === val('sb')) throw new Error('กลุ่ม A และ B ต้องต่างกัน'); }
        const r = ttest(a, b, mode, tail, al, mu), one = mode === 'one', nm = k => gk === 'none' ? 'ทั้งหมด' : k;
        const rows = [['กลุ่ม', 'n', 'Mean', 'Variance'], [esc(nm(val('sa'))), r.A.n, fx(r.A.mean), fx(r.A.v)], ...(r.B ? [[esc(val('sb')), r.B.n, fx(r.B.mean), fx(r.B.v)]] : [])];
        out(report(`t-Test: ${one ? 'One-sample' : mode === 'pooled' ? 'Two-sample (Pooled)' : 'Two-sample (Welch)'}`, one ? `μ = ${mu}` : 'μA = μB', one ? `μ ${SYM[tail]} ${mu}` : `μA ${SYM[tail]} μB`,
            rows, r.stat, 't Stat', r, al, [[`CI ${100 - al * 100}% ของผลต่าง`, `${fx(r.ci[0])} ถึง ${fx(r.ci[1])}`], ['ผลต่างของค่าเฉลี่ย', fx(r.diff)], ["Cohen's d", fx(r.d, 3)]]));
    }

    function zTest() {
        const mode = val('smz'), tail = val('stl'), al = alpha(), gk = val('sg'), p0 = +val('s0'), sg = val('ssg') === '' ? null : +val('ssg');
        const two = mode.endsWith('2'), prop = mode.startsWith('prop'), e = prop ? MET[val('smet')][1] : ext();
        if (two && gk === 'none') throw new Error('เลือก "แยกกลุ่มตาม" และกลุ่ม A / B สำหรับ Z-test สองกลุ่ม');
        const a = samp(e, gk, val('sa')), b = two ? samp(e, gk, val('sb')) : null; need(a, 2, 'กลุ่ม A'); if (b) need(b, 2, 'กลุ่ม B');
        let z, rows, h0, h1, ex = [];
        const A = D(a), B = b && D(b);
        if (prop) {
            if (!two && !(p0 > 0 && p0 < 1)) throw new Error('p0 ต้องอยู่ระหว่าง 0 และ 1 (ไม่รวม 0 และ 1)');
            const p1 = A.mean; rows = [['กลุ่ม', 'n', 'สำเร็จ (x)', 'สัดส่วน'], ['A', A.n, A.sum, fx(p1)], ...(B ? [['B', B.n, B.sum, fx(B.mean)]] : [])];
            if (two) { const pp = (A.sum + B.sum) / (A.n + B.n); z = (p1 - B.mean) / Math.sqrt(pp * (1 - pp) * (1 / A.n + 1 / B.n)); h0 = 'pA = pB'; h1 = `pA ${SYM[tail]} pB`; ex = [['Pooled p', fx(pp)]]; }
            else { z = (p1 - p0) / Math.sqrt(p0 * (1 - p0) / A.n); h0 = `p = ${p0}`; h1 = `p ${SYM[tail]} ${p0}`; }
        } else {
            const va = sg != null ? sg * sg : A.v;
            rows = [['กลุ่ม', 'n', 'Mean', 'Variance ที่ใช้'], ['A', A.n, fx(A.mean), fx(va)], ...(B ? [['B', B.n, fx(B.mean), fx(sg != null ? sg * sg : B.v)]] : [])];
            if (two) { z = (A.mean - B.mean) / Math.sqrt(va / A.n + (sg != null ? sg * sg : B.v) / B.n); h0 = 'μA = μB'; h1 = `μA ${SYM[tail]} μB`; }
            else { z = (A.mean - p0) / Math.sqrt(va / A.n); h0 = `μ = ${p0}`; h1 = `μ ${SYM[tail]} ${p0}`; }
        }
        const r = pcrit(z, ncdf, zinv, tail, al);
        out(report('Z-test: ' + ({ mean1: 'ค่าเฉลี่ย 1 กลุ่ม', mean2: 'ค่าเฉลี่ย 2 กลุ่ม', prop1: 'สัดส่วน 1 กลุ่ม', prop2: 'สัดส่วน 2 กลุ่ม' })[mode], h0, h1, rows, z, 'z Stat', r, al, ex));
    }

    function anovaRun() {
        const gk = val('sg'), al = alpha(), e = ext();
        if (gk === 'none') throw new Error('เลือก "แยกกลุ่มตาม" สำหรับ ANOVA');
        const gs = groupsOf(gk).slice(0, 10).map(([g]) => [g, samp(e, gk, g)]).filter(([, a]) => a.length >= 2);
        if (gs.length < 2) throw new Error('ต้องมีอย่างน้อย 2 กลุ่มที่แต่ละกลุ่มมีข้อมูล ≥ 2 ค่า');
        const r = anova(gs.map(g => g[1])), fc = finv(al, r.dfb, r.dfw);
        out(card(`<h3 class="font-bold text-white">ANOVA: Single Factor — ${esc(VARS()[val('sv')][0])} ตาม ${esc(GRP[gk][0])}</h3><p>H0: ค่าเฉลี่ยทุกกลุ่มเท่ากัน | H1: อย่างน้อยหนึ่งกลุ่มต่าง (ใช้ 10 กลุ่มที่ใหญ่สุด)</p>` +
            tb(['กลุ่ม', 'n', 'Sum', 'Mean', 'Variance'], r.info.map((d, i) => [esc(gs[i][0]), d.n, fx(d.sum, 2), fx(d.mean), fx(d.v)])) +
            tb(['Source', 'SS', 'df', 'MS', 'F', 'P-value', 'F crit'], [['Between Groups', fx(r.ssb), r.dfb, fx(r.msb), fx(r.F), fp(r.p), fx(fc)], ['Within Groups', fx(r.ssw), r.dfw, fx(r.msw), '', '', ''], ['Total', fx(r.ssb + r.ssw), r.dfb + r.dfw, '', '', '', '']]) +
            `<p>Eta² = ${fx(r.eta, 4)} (สัดส่วนความแปรปรวนที่อธิบายได้โดยกลุ่ม)</p><p>${dec(r.p, al)}</p>`));
    }

    function corr() {
        const al = alpha(), V = Object.entries(VARS()), R = allRows(), ks = V.map(v => v[0]);
        if (V.length < 2) throw new Error('ต้องมีตัวแปรตัวเลขอย่างน้อย 2 ตัว');
        const pair = (i, j) => { const xs = [], ys = []; R.forEach(r => { const a = V[i][1][1](r), b = V[j][1][1](r); if (a != null && b != null && isFinite(a) && isFinite(b)) { xs.push(a); ys.push(b); } }); if (xs.length < 3) return null; const o = pearson(xs, ys); return isFinite(o.r) ? o : null; };
        const cell = o => { if (!o) return '–'; const a = Math.abs(o.r), c = o.r > 0 ? '16,185,129' : '244,63,94'; return `<span style="background:rgba(${c},${a * 0.6});padding:2px 6px;border-radius:6px">${fx(o.r, 3)}${o.p < al ? '*' : ''}</span>`; };
        const strength = r => { const a = Math.abs(r); return a < .1 ? 'แทบไม่มี' : a < .3 ? 'อ่อน' : a < .5 ? 'ปานกลาง' : 'แข็งแรง'; };
        const pr = []; ks.forEach((_, i) => ks.forEach((_, j) => { if (j > i) { const o = pair(i, j); pr.push([V[i][1][0] + ' × ' + V[j][1][0], o]); } }));
        out(card(`<h3 class="font-bold text-white">Correlation (Pearson)</h3><p class="text-xs">* = มีนัยสำคัญที่ α = ${al} | สีเขียว = บวก, แดง = ลบ</p>` +
            tb(['', ...V.map(v => v[1][0])], V.map((v, i) => [`<b>${v[1][0]}</b>`, ...V.map((_, j) => i === j ? '1.000' : cell(pair(i, j)))])) +
            tb(['คู่ตัวแปร', 'n', 'r', 'r²', 'p-value', 'ความสัมพันธ์', 'นัยสำคัญ'], pr.map(([n, o]) => o ? [esc(n), o.n, fx(o.r, 3), fx(o.r * o.r, 3), fp(o.p), (o.r > 0 ? 'บวก/' : 'ลบ/') + strength(o.r), o.p < al ? 'มี' : 'ไม่มี'] : [esc(n), '–', '–', '–', '–', '–', '–']))));
    }

    function solve() {
        try {
            const num = s => s.trim().split(/[\s,]+/).map(Number), c = num(val('so-obj'));
            if (c.some(v => !isFinite(v))) throw new Error('สัมประสิทธิ์เป้าหมายต้องเป็นตัวเลข');
            const A = [], ops = [], b = [];
            val('so-con').split('\n').filter(l => l.trim()).forEach((l, i) => {
                const m = l.match(/^(.+?)(<=|>=|=)\s*(-?[\d.]+)\s*$/); if (!m) throw new Error(`บรรทัดที่ ${i + 1} รูปแบบไม่ถูกต้อง`);
                const co = num(m[1]); if (co.length !== c.length || co.some(v => !isFinite(v))) throw new Error(`บรรทัดที่ ${i + 1} ต้องมีสัมประสิทธิ์ ${c.length} ตัว`);
                A.push(co); ops.push(m[2]); b.push(+m[3]);
            });
            if (!A.length) throw new Error('ต้องมีอย่างน้อย 1 เงื่อนไข');
            const mx = val('so-dir') === '1', r = simplex(c, A, ops, b, mx);
            if (r.status !== 'optimal') return out(card(`<span class="text-rose-400">${r.status === 'infeasible' ? 'ไม่มีคำตอบที่เป็นไปได้ (Infeasible)' : r.status === 'unbounded' ? 'ปัญหาไม่มีขอบเขต (Unbounded)' : 'คำนวณไม่สำเร็จ'}</span>`));
            out(card(`<h3 class="font-bold text-white">ผลลัพธ์ Solver (${mx ? 'Maximize' : 'Minimize'})</h3><p>ค่าเป้าหมายที่ดีที่สุด = <b class="text-emerald-400">${fx(r.obj, 4)}</b></p>` +
                tb(['ตัวแปร', 'ค่า'], r.x.map((v, i) => [`x${i + 1}`, fx(v, 4)])) +
                tb(['เงื่อนไข', 'LHS', 'เงื่อนไข', 'RHS', 'Slack', 'Binding'], A.map((row, i) => { const l = row.reduce((s, v, j) => s + v * r.x[j], 0); return [i + 1, fx(l, 4), ops[i], fx(b[i], 4), fx(Math.abs(b[i] - l), 4), Math.abs(b[i] - l) < 1e-7 ? 'ใช่' : 'ไม่']; })) ));
        } catch (e) { out(card(`<span class="text-rose-400">${esc(e.message)}</span>`)); }
    }

    document.addEventListener('DOMContentLoaded', () => { build(); refresh(); document.addEventListener('data:changed', refresh); });
})();
