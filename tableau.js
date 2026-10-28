// ---- Tableau tab: link / dashboard image / .twb-.twbx file ----
(function () {
    const $ = id => document.getElementById(id), esc = escapeHTML;
    const IMG_OK = /^image\/(png|jpe?g|webp|gif)$/, MAX = 15 * 1024 * 1024;

    // mode: 'iframe' | 'image' | 'info' | 'none'
    window.showTableau = function (mode) {
        $('tableauIframe').classList.toggle('hidden', mode !== 'iframe');
        $('tableauImage').classList.toggle('hidden', mode !== 'image');
        $('tableauInfo').classList.toggle('hidden', mode !== 'info');
        $('tableauPlaceholder').classList.toggle('hidden', mode !== 'none');
        $('tbClear').classList.toggle('hidden', mode === 'none');
        if (mode !== 'iframe') $('tableauIframe').removeAttribute('src');
        if (mode !== 'image') $('tableauImage').removeAttribute('src');
    };
    const err = m => { $('tbMsg').textContent = m; };

    function showImage(file) {
        if (!IMG_OK.test(file.type)) return err('รองรับเฉพาะภาพ PNG, JPG, WEBP, GIF');
        if (file.size > MAX) return err('ไฟล์ภาพใหญ่เกิน 15 MB');
        err(''); const rd = new FileReader();
        rd.onload = () => { $('tableauImage').src = rd.result; showTableau('image'); };
        rd.readAsDataURL(file);
    }

    // --- minimal zip reader (no library): returns text of the first entry matching `test` ---
    async function zipEntryText(buf, test) {
        const v = new DataView(buf), u8 = new Uint8Array(buf);
        let e = -1; for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
        if (e < 0) throw new Error('ไฟล์ .twbx ไม่ใช่ zip ที่อ่านได้');
        let p = v.getUint32(e + 16, true); const n = v.getUint16(e + 10, true);
        for (let k = 0; k < n; k++) {
            if (v.getUint32(p, true) !== 0x02014b50) break;
            const method = v.getUint16(p + 10, true), cs = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
            const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el + cl;
            if (!test(name)) continue;
            if (cs === 0xffffffff || off === 0xffffffff) throw new Error('ไฟล์ zip64 ขนาดใหญ่ไม่รองรับ');
            const ds = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true), data = u8.subarray(ds, ds + cs);
            if (method === 0) return new TextDecoder().decode(data);
            if (method !== 8) throw new Error('รูปแบบการบีบอัดไม่รองรับ');
            const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            return await new Response(stream).text();
        }
        throw new Error('ไม่พบไฟล์ .twb ภายใน .twbx');
    }

    async function readWorkbook(file) {
        if (file.size > 300 * 1024 * 1024) return err('ไฟล์ใหญ่เกิน 300 MB');
        err('กำลังอ่านไฟล์...');
        try {
            const isX = /\.twbx$/i.test(file.name);
            const xml = isX ? await zipEntryText(await file.arrayBuffer(), n => /\.twb$/i.test(n) && !n.includes('__MACOSX')) : await file.text();
            const doc = new DOMParser().parseFromString(xml, 'text/xml');
            if (doc.querySelector('parsererror') || !doc.querySelector('workbook')) throw new Error('ไฟล์นี้ไม่ใช่ workbook ของ Tableau');
            const names = sel => [...doc.querySelectorAll(sel)].map(e => e.getAttribute('name')).filter(Boolean);
            const ds = [...doc.querySelectorAll('workbook > datasources > datasource')].filter(d => d.getAttribute('name') !== 'Parameters').map(d => d.getAttribute('caption') || d.getAttribute('name'));
            const dashes = names('workbook > dashboards > dashboard'), sheets = names('workbook > worksheets > worksheet');
            const thumbs = [...doc.querySelectorAll('thumbnail')].map(t => ({ n: t.getAttribute('name') || '', d: (t.textContent || '').replace(/\s+/g, '') })).filter(t => /^[A-Za-z0-9+/=]+$/.test(t.d) && t.d.length > 50);
            const li = a => a.length ? `<ul class="list-disc ml-5 space-y-0.5">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="text-slate-500">ไม่พบ</p>';
            $('tableauInfo').innerHTML = `<div class="space-y-4"><div><h3 class="font-bold text-white text-base"><i class="fa-solid fa-file-circle-check text-emerald-400 mr-2"></i>${esc(file.name)}</h3>
              <p class="text-xs text-slate-400 mt-1">อ่านโครงสร้าง workbook แล้ว — เบราว์เซอร์ไม่สามารถแสดง Dashboard แบบ Interactive จากไฟล์ Tableau ได้ (ต้องใช้ Tableau Desktop หรือเผยแพร่ขึ้น Tableau Public แล้วนำลิงก์มาวาง) หรือจะอัปโหลดภาพหน้า Dashboard แทนก็ได้</p></div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300"><div class="glass-card rounded-xl p-3"><p class="font-semibold text-slate-200 mb-1">Dashboards (${dashes.length})</p>${li(dashes)}</div>
              <div class="glass-card rounded-xl p-3"><p class="font-semibold text-slate-200 mb-1">Worksheets (${sheets.length})</p>${li(sheets)}</div>
              <div class="glass-card rounded-xl p-3"><p class="font-semibold text-slate-200 mb-1">Data sources (${ds.length})</p>${li(ds)}</div></div>
              ${thumbs.length ? `<div><p class="text-xs text-slate-400 mb-2">ภาพตัวอย่างขนาดเล็กที่ฝังในไฟล์</p><div class="flex flex-wrap gap-3">${thumbs.map(t => `<figure class="text-center"><img src="data:image/png;base64,${t.d}" class="rounded-lg border border-slate-700 bg-white" alt=""><figcaption class="text-[11px] text-slate-400 mt-1">${esc(t.n)}</figcaption></figure>`).join('')}</div></div>` : ''}</div>`;
            err(''); showTableau('info');
        } catch (e) { err(e.message || 'อ่านไฟล์ไม่สำเร็จ'); }
    }

    function pick(file) { if (!file) return; /\.(twb|twbx)$/i.test(file.name) ? readWorkbook(file) : file.type.startsWith('image/') ? showImage(file) : err('รองรับ .twb, .twbx หรือไฟล์ภาพ'); }

    document.addEventListener('DOMContentLoaded', () => {
        $('tbImg').onchange = e => { pick(e.target.files[0]); e.target.value = ''; };
        $('tbWb').onchange = e => { pick(e.target.files[0]); e.target.value = ''; };
        $('tbClear').onclick = () => { err(''); showTableau('none'); };
        const zone = $('tableauVizContainer');
        zone.addEventListener('dragover', e => e.preventDefault());
        zone.addEventListener('drop', e => { e.preventDefault(); pick(e.dataTransfer.files[0]); });
        document.addEventListener('paste', e => {            // Ctrl+V a screenshot while on the Tableau tab
            if ($('tab-tableau').classList.contains('hidden')) return;
            const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
            if (it) { e.preventDefault(); showImage(it.getAsFile()); }
        });
    });
})();
