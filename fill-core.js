/* 個人資料修改（聯絡資訊變更）申請書填寫核心 — 與 fill_personal.py 同一套規則、同一份 layout.json
   瀏覽器：window.FillCore；Node：module.exports */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FillCore = factory();
})(this, function () {
  const ALIASES = {
    "台灣": "台灣", "臺灣": "台灣", "台灣人壽": "台灣", "臺灣人壽": "台灣", "中信": "台灣", "台壽": "台灣",
    "臺銀": "臺銀", "台銀": "臺銀", "臺銀人壽": "臺銀", "台銀人壽": "臺銀", "中央信託局": "臺銀",
    "凱基": "凱基", "凱基人壽": "凱基", "中國人壽": "凱基",
    "富邦": "富邦", "富邦人壽": "富邦",
    "安達": "安達", "安達人壽": "安達", "安達國際人壽": "安達", "康健": "安達",
    "全球": "全球", "全球人壽": "全球", "國華人壽": "全球",
    "遠雄": "遠雄", "遠雄人壽": "遠雄",
    "友邦": "友邦", "友邦人壽": "友邦", "AIA": "友邦",
  };
  const COMPANIES = ["台灣", "凱基", "富邦", "安達", "全球", "遠雄", "友邦", "臺銀"];

  const ADDR_RE = new RegExp(
    "^(\\d{3}(?:-?\\d{2,3})?)?" +          // 1 郵遞區號
    "([^\\d\\s]{1,3}?[縣市])" +             // 2 縣市
    "([^\\d\\s]{1,4}?[鄉鎮市區])" +         // 3 鄉鎮
    "([^\\d\\s]{1,4}?[村里](?=\\d+鄰|[^\\d\\s]))?" + // 4 村里
    "(?:(\\d+)鄰)?" +                       // 5 鄰
    "([^\\d\\s]+?(?:路|街|大道))?" +        // 6 路街
    "(?:([\\d一二三四五六七八九十]+)段)?" +  // 7 段
    "(?:([\\d一二三四五六七八九十]+)巷)?" +  // 8 巷
    "(?:(\\d+)弄)?" +                       // 9 弄
    "(?:(\\d+)(?:[之\\-](\\d+))?號)" +      // 10 號 11 號之
    "(?:([\\d一二三四五六七八九十]+)樓)?" +  // 12 樓
    "(?:之(\\d+))?" +                       // 13 樓之
    "(.*?)$");                              // 14 其他
  const ADDR_KEYS = ["郵遞區號", "縣市", "鄉鎮", "村里", "鄰", "路街", "段", "巷", "弄", "號", "號之", "樓", "樓之", "其他"];

  function composeAddr(d) {
    let s = (d.縣市 || "") + (d.鄉鎮 || "") + (d.村里 || "") + (d.鄰 ? d.鄰 + "鄰" : "") + (d.路街 || "");
    if (d.段) s += d.段 + "段";
    if (d.巷) s += d.巷 + "巷";
    if (d.弄) s += d.弄 + "弄";
    if (d.號) s += d.號 + (d.號之 ? "之" + d.號之 : "") + "號";
    if (d.樓) s += d.樓 + "樓" + (d.樓之 ? "之" + d.樓之 : "");
    return s + (d.其他 || "");
  }

  function parseAddr(a) {
    if (!a) return null;
    let d = {};
    if (typeof a === "string") {
      const m = a.replace(/[\s　]/g, "").match(ADDR_RE);
      if (!m) return { 全文: a.trim(), _拆解失敗: true };
      ADDR_KEYS.forEach((k, i) => (d[k] = m[i + 1] || ""));
    } else {
      for (const k of Object.keys(a)) d[k] = String(a[k] ?? "").trim();
    }
    for (const k of ["段", "巷", "弄", "號", "樓", "鄰"]) if ((d[k] || "").endsWith(k)) d[k] = d[k].slice(0, -1);
    if ((d.號 || "").includes("之") && !d.號之) [d.號, d.號之] = d.號.split("之");
    d.郵遞區號 = d.郵遞區號 || "";
    for (const [k, units] of [["縣市", "縣市"], ["鄉鎮", "鄉鎮市區"], ["村里", "村里"], ["路街", "路街"]]) {
      const v = d[k] || "";
      if (v && units.includes(v.slice(-1))) { d[k + "名"] = v.slice(0, -1); d[k + "字"] = v.slice(-1); }
      else { d[k + "名"] = v; d[k + "字"] = ""; }
    }
    d.全文 = composeAddr(d);
    return d;
  }

  function splitPhone(p) {
    if (!p) return ["", ""];
    const s = String(p).trim();
    const m = s.match(/^\(?\s*(0\d{1,3})\s*[)\-－ ]\s*(.+)$/);
    if (m) return [m[1], m[2].trim()];
    const d = s.replace(/\D/g, "");
    if (d.startsWith("09")) return ["", d];
    for (const pre of ["0826", "0836", "082", "089", "037", "049"]) if (d.startsWith(pre)) return [pre, d.slice(pre.length)];
    return [d.slice(0, 2), d.slice(2)];
  }

  function fmtMobile(p) {
    const d = String(p || "").replace(/\D/g, "");
    return d.length === 10 && d.startsWith("09") ? `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}` : String(p || "").trim();
  }

  function emailRule(e, rule) {
    if (!e) return e;
    if (rule.大寫) e = e.toUpperCase();
    return [...e].map((ch) => {
      if (ch === "0" && rule.零) return rule.零;
      if (ch === "I" && rule.I && !rule.大寫) return rule.I;
      if (ch === "l" && rule.l) return rule.l;
      return ch;
    }).join("");
  }

  function rocToday() {
    const t = new Date();
    return `${t.getFullYear() - 1911}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`;
  }

  function buildValues(cs, entry, CL) {
    const ch = Object.assign({}, cs.變更內容 || {}, entry.變更內容 || {});
    for (const k of entry.略過 || []) delete ch[k];
    const opt = Object.assign({ 一併變更所有保單: true, 收費地址同住所: true, 戶籍地址同住所: false,
      被保險人同一人一併變更: true, 被保險人聯絡資料: "", 電子通知: "" }, cs.選項 || {}, entry.選項 || {});
    const v = {}, warn = [];
    const pol = entry.保單號碼 || "";
    v.保單號碼 = Array.isArray(pol) ? pol.join("、") : String(pol);
    const who = cs.要保人 || {};
    v.要保人姓名 = who.姓名 || "";
    v.要保人身分證 = String(who.身分證字號 || "").trim().toUpperCase();
    if (v.要保人身分證 && !/^[A-Z][0-9]{9}$/.test(v.要保人身分證)) warn.push("要保人身分證格式不是 1 英文 + 9 數字，請確認");
    v.被保險人姓名 = entry.被保險人 || "";
    const sp = cs.業務員 || {};
    v["業務員.登錄字號"] = String(sp.登錄字號 || "").trim();
    v["業務員.電話"] = fmtMobile(sp.電話 || "");
    v["業務員.單位"] = String(CL.業務員單位 || "").trim(); // 後台設定（layout.json），各家不同
    v["業務員.送件單位"] = v["業務員.單位"]; // 遠雄：送件單位與單位代號相同

    const addr = parseAddr(ch.住所);
    if (addr) {
      if (addr._拆解失敗) warn.push(`地址「${addr.全文}」無法自動拆成縣市／路／號，分欄位的申請書（凱基、富邦、臺銀）不會填地址，請手寫`);
      for (const [k, val] of Object.entries(addr)) if (!k.startsWith("_")) v["住所." + k] = val;
      if (!CL.號之分開 && addr.號之) v["住所.號"] = `${addr.號}之${addr.號之}`;
      if (!("住所.樓之" in CL.欄位) && addr.樓之) v["住所.樓"] = `${addr.樓}之${addr.樓之}`;
      v["住所.郵遞區號"] = (addr.郵遞區號 || "").replace(/\D/g, "");
      if (!v["住所.郵遞區號"]) warn.push("地址沒有郵遞區號");
    }
    const [ha, hn] = splitPhone(ch.住家電話), [oa, on] = splitPhone(ch.公司電話);
    const ext = String(ch.公司分機 || "");
    if (hn) {
      v["電話.住家區碼"] = ha; v["電話.住家號碼"] = hn; v["電話.住家全"] = ha ? `(${ha})${hn}` : hn;
    }
    if (on) {
      v["電話.公司區碼"] = oa; v["電話.公司號碼"] = on; v["電話.公司分機"] = ext;
      v["電話.公司號碼含分機"] = on + (ext ? `#${ext}` : "");
      v["電話.公司全"] = (oa ? `(${oa})${on}` : on) + (ext ? ` 分機${ext}` : "");
    }
    v["電話.日間"] = v["電話.公司全"] || v["電話.住家全"] || "";
    v["電話.夜間"] = v["電話.公司全"] ? (v["電話.住家全"] || "") : "";
    const mob = fmtMobile(ch.行動電話);
    if (mob) v["電話.行動"] = mob;

    const em = String(ch["E-mail"] || "").trim();
    if (em) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) warn.push(`E-mail 格式看起來不對：${em}`);
      const e2 = emailRule(em, CL["E-mail規則"] || {});
      v["E-mail"] = e2;
      const [user, dom] = [e2.split("@")[0], e2.split("@").slice(1).join("@")];
      v["E-mail帳號"] = user;
      const dp = em.split("@")[1]?.toLowerCase() || "";
      if ((CL.網域選項 || ["gmail.com", "yahoo.com"]).includes(dp)) v[`勾.網域.${dp}`] = true;
      else { v["勾.網域.其他"] = true; v["E-mail網域其他"] = dom; }
    }
    const hasAddr = !!addr, hasPhone = !!(hn || on || mob), hasMail = !!em, any = hasAddr || hasPhone || hasMail;
    if (!any) warn.push("沒有任何要變更的地址／電話／E-mail");
    const together = !!opt.一併變更所有保單;
    v["勾.項目1"] = any;
    v["勾.一併變更"] = any && together;
    v["勾.住所聯絡變更"] = hasAddr || hasPhone;
    v["勾.一併變更住所"] = (hasAddr || hasPhone) && together;
    v["勾.Email變更"] = hasMail;
    v["勾.住所其他"] = hasAddr;
    v["勾.一併變更住所.同意"] = hasAddr && together;
    v["勾.戶籍同住所"] = hasAddr && !!opt.戶籍地址同住所;
    const same = !!opt.收費地址同住所;
    v["勾.收費同住所"] = same && (hasAddr || (hasPhone && !("勾.項目2" in CL.欄位)));
    v["勾.項目2"] = v["勾.一併變更收費"] = same && hasAddr;
    if ("勾.項目2" in CL.欄位) v["勾.一併變更收費"] = v["勾.一併變更收費"] && together;
    v["勾.被保險人同一人"] = any && !!opt.被保險人同一人一併變更;
    if (opt.被保險人聯絡資料 === "同要保人") {
      v["勾.被保險人同要保人住所"] = true; v["勾.項目3"] = true; v["勾.被保險人一併變更住所.同意"] = together;
    }
    if (opt.電子通知 === "申請" || opt.電子通知 === "取消") { v[`勾.電子通知.${opt.電子通知}`] = true; v["勾.電子通知一併"] = together; }
    v["勾.Email同時電子"] = hasMail && opt.電子通知 === "申請";
    return [v, warn];
  }

  /* 填一家。deps = {PDFLib, fontkit, formBytes, fontBytes} → {bytes, filename, filled, warn} */
  async function fillOne(cs, entry, L, deps) {
    const { PDFLib, fontkit, formBytes, fontBytes } = deps;
    const key = ALIASES[String(entry.公司 || "").trim()];
    if (!key || !L.公司[key]) throw new Error(`不認得的保險公司「${entry.公司}」`);
    const CL = L.公司[key], F = CL.欄位;
    const [vals, warn] = buildValues(cs, entry, CL);
    const doc = await PDFLib.PDFDocument.load(formBytes, { ignoreEncryption: true });
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fontBytes, { subset: true });
    const color = PDFLib.rgb(...(L.顏色 || [0, 0.2, 0.75]));
    const pages = doc.getPages();
    const tl = (s, sz) => font.widthOfTextAtSize(s, sz);
    const fit = (s, size, width, min = 5) => { let sz = size; while (sz > min && tl(s, sz) > width) sz -= 0.25; return [sz, tl(s, sz)]; };
    const filled = [];

    for (const [name, spec] of Object.entries(F)) {
      const val = vals[name];
      if (!val) continue;
      const page = pages[spec.頁], H = page.getHeight();
      const text = (s, x, y, size) => page.drawText(s, { x, y: H - y, size, font, color });
      if (spec.t === "勾") {
        const cx = spec.x, cy = spec.y, s = 4.2;
        const pts = [[cx - s * 0.9, cy], [cx - s * 0.25, cy + s * 0.8], [cx + s, cy - s * 0.9]];
        for (let i = 0; i < 2; i++)
          page.drawLine({ start: { x: pts[i][0], y: H - pts[i][1] }, end: { x: pts[i + 1][0], y: H - pts[i + 1][1] },
            thickness: 1.3, color, lineCap: PDFLib.LineCapStyle.Round });
      } else if (spec.t === "圈") {
        const r = spec.選項[val] || spec.選項[{ 市: "巿", 巿: "市" }[val] || ""];
        if (!r) { warn.push(`「${name}」沒有「${val}」可以圈，請手動圈選`); continue; }
        const [x0, y0, x1, y1] = [r[0] - 1.2, r[1] - 0.6, r[2] + 1.2, r[3] + 0.6];
        page.drawEllipse({ x: (x0 + x1) / 2, y: H - (y0 + y1) / 2, xScale: (x1 - x0) / 2, yScale: (y1 - y0) / 2,
          borderColor: color, borderWidth: 0.9 });
      } else if (spec.t === "文字") {
        const s = String(val), width = spec.x1 - spec.x0;
        let [sz, w] = fit(s, spec.字, width);
        if (sz < 7.5 && spec.兩行 && s.includes("、")) {
          const parts = s.split("、"), half = Math.ceil(parts.length / 2);
          const lines = [parts.slice(0, half).join("、") + "、", parts.slice(half).join("、")];
          const sz2 = Math.min(...lines.map((t) => fit(t, spec.字, width)[0]), spec.兩行字 || 8);
          lines.forEach((t, i) => {
            const ww = tl(t, sz2);
            text(t, spec.齊 === "中" ? spec.x0 + (width - ww) / 2 : spec.x0, spec.兩行[i], sz2);
          });
        } else {
          if (w > width + 0.5) warn.push(`「${s}」太長，超出欄位，請確認`);
          text(s, spec.齊 === "中" ? spec.x0 + (width - w) / 2 : spec.x0, spec.y, sz);
        }
      } else if (spec.t === "格子") {
        const s = String(val).replace(/\s/g, "");
        const cap = spec.組.reduce((a, g) => a + g[2], 0);
        if (s.length > cap && spec.超過改文字) {
          const [x0, x1, yy, sz0] = spec.超過改文字, t2 = String(val);
          const [sz, w] = fit(t2, sz0, x1 - x0);
          if (w > x1 - x0 + 0.5) warn.push(`「${t2}」太長，超出欄位，請確認`);
          text(t2, x0, yy, sz); filled.push(name); continue;
        }
        if (s.length > cap && !name.endsWith("郵遞區號")) warn.push(`「${name}」${s.length} 碼超過格子數 ${cap}，多的沒填`);
        let i = 0;
        for (const [x0, step, n] of spec.組)
          for (let k = 0; k < n && i < s.length; k++, i++) {
            const w = tl(s[i], spec.字);
            text(s[i], x0 + step * k + (step - w) / 2, spec.y, spec.字);
          }
      } else if (spec.t === "多行") {
        const s = String(val);
        let sz = spec.字, chunks, rest;
        for (;;) {
          rest = s; chunks = [];
          for (const [x0, x1, y] of spec.行) {
            if (!rest) break;
            let cut = rest.length;
            while (cut > 0 && tl(rest.slice(0, cut), sz) > x1 - x0) cut--;
            chunks.push([x0, y, rest.slice(0, cut)]); rest = rest.slice(cut);
          }
          if (!rest || sz <= 6) break;
          sz -= 0.25;
        }
        if (rest) warn.push(`地址太長，「${rest}」沒放進去，請手寫補上`);
        for (const [x0, y, part] of chunks) text(part, x0, y, sz);
      }
      filled.push(name);
    }
    const keep = new Set((CL.輸出頁 || pages.map((_, i) => i + 1)).map((p) => p - 1));
    for (let i = pages.length - 1; i >= 0; i--) if (!keep.has(i)) doc.removePage(i);
    const bytes = await doc.save();
    const who = (cs.要保人 || {}).姓名 || "要保人";
    const filename = entry.檔名 || `${who}-${CL.全名}-${cs.日期 || rocToday()}${cs.事項 || "聯絡資訊變更"}.pdf`;
    return { key, 全名: CL.全名, bytes, filename, filled, warn };
  }

  return { ALIASES, COMPANIES, parseAddr, composeAddr, splitPhone, fmtMobile, emailRule, buildValues, fillOne, rocToday };
});
