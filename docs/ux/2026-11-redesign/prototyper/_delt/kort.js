/* Shared state, data and widgets for the redesign prototypes.
   Classic script (no modules) so index.html opens straight from disk.
   Everything here is a mock: the map is a static image and nothing is printed. */
(function () {
  "use strict";

  // ---------- Data ----------
  const IMG = "../_delt/kort/";

  const BASES = [
    { id: "dtk25", label: "Topografisk kort", tile: "Topografisk", sub: "1:25.000", thumb: "dtk25" },
    { id: "skaermkort", label: "Skærmkort", tile: "Skærmkort", sub: "Enkelt", thumb: "skaermkort" },
    { id: "ortofoto", label: "Luftfoto", tile: "Luftfoto", sub: "Ortofoto", thumb: "ortofoto" },
    { id: "osm", label: "OpenStreetMap", tile: "OpenStreet­Map", sub: "Stier og veje", thumb: "osm" },
    { id: "hoeje", label: "Høje Målebordsblade", tile: "Høje målebord", sub: "1842–1899", thumb: "hoeje" },
    { id: "lave", label: "Lave Målebordsblade", tile: "Lave målebord", sub: "1901–1971", thumb: "lave" },
    { id: "none", label: "Intet basiskort", tile: "Intet kort", sub: "Kun lag", thumb: null },
  ];
  const STYLES = [
    { id: "klassisk", label: "Klassisk" },
    { id: "daempet", label: "Dæmpet" },
    { id: "graa", label: "Grå" },
    { id: "moerkt", label: "Mørkt" },
  ];

  // The 15 overlays of today, folded into 11 entries in 4 groups. Variants
  // replace near-duplicate entries (four contour layers, two depth layers).
  const GROUPS = [
    {
      id: "terraen", label: "Terræn",
      items: [
        { id: "kurver", label: "Højdekurver", desc: "Viser bakker og dale. I Norge bruges Kartverkets kurver.", keys: "højde kurver terræn bakker norge",
          variants: [
            { id: "0.5", label: "0,5 m" }, { id: "2.5", label: "2,5 m" }, { id: "5", label: "5 m med tal" }, { id: "10", label: "10 m med tal" },
          ], def: "2.5" },
        { id: "skygge", label: "Skyggekort", desc: "Terrænet som relief, lyset fra nordvest.", keys: "skygge relief terræn hillshade" },
      ],
    },
    {
      id: "vand", label: "Hav og sø", sea: true,
      items: [
        { id: "havdybder", label: "Havdybder", desc: "Dybdekurver på havet.", keys: "hav dybde vand sejlads kajak", variants: [
          { id: "dk", label: "Danmark, 50 m" }, { id: "eu", label: "Europa, grovere" },
        ], def: "dk" },
        { id: "havbund", label: "Havbundens relief", desc: "Skyggekort af havbunden.", keys: "havbund relief hav" },
        { id: "soemaerker", label: "Sømærker", desc: "Bøjer, fyr og afmærkning fra OpenSeaMap.", keys: "sømærker bøjer fyr sejlads openseamap hav" },
        { id: "soedybder", label: "Sødybder", desc: "Dybdekurver i 80 søer.", keys: "sø dybde kano kajak" },
        { id: "indsoekort", label: "Historiske indsøkort", desc: "Gamle dybdekort over søer, som bilag i PDF'en.", keys: "indsø historisk sø dybde bilag" },
        { id: "vrag", label: "Skibsvrag", desc: "Kendte vrag fra EMODnet.", keys: "vrag skib dykning hav" },
      ],
    },
    {
      id: "navne", label: "Navne og skel",
      items: [
        { id: "stednavne", label: "Stednavne", desc: "Navne på bakker, moser, skove og gårde.", keys: "stednavne navne" },
        { id: "matrikel", label: "Matrikelskel", desc: "Skel mellem ejendomme. Godt til at se, hvor man må gå.", keys: "matrikel skel ejendom grund" },
      ],
    },
    {
      id: "gitter", label: "Gitter og kompas", special: "grid",
      items: [],
    },
  ];
  const SEA_IDS = ["havdybder", "havbund", "soemaerker", "soedybder", "indsoekort", "vrag"];

  const PRESETS = [
    { id: "vandretur", label: "Vandretur", desc: "Topografisk kort, 1:25.000, UTM-gitter",
      set: { base: "dtk25", style: "klassisk", overlays: {}, scale: 25000, paper: "A4", orient: "portrait", grid: true } },
    { id: "orientering", label: "Orientering", desc: "Dæmpet kort, kurver for hver 2,5 m, 1:10.000",
      set: { base: "skaermkort", style: "daempet", overlays: { kurver: { on: true, variant: "2.5", opacity: 1 }, skygge: { on: true, opacity: 0.4 } }, scale: 10000, paper: "A4", orient: "portrait", grid: false } },
    { id: "sejlads", label: "Sejlads og kano", desc: "Havdybder, sømærker og sødybder, 1:50.000",
      set: { base: "skaermkort", style: "klassisk", overlays: { havdybder: { on: true, variant: "dk", opacity: 0.8 }, soemaerker: { on: true, opacity: 1 }, soedybder: { on: true, opacity: 1 } }, scale: 50000, paper: "A4", orient: "landscape", grid: true } },
    { id: "historisk", label: "Historisk", desc: "Lave Målebordsblade fra 1901–1971",
      set: { base: "lave", style: "klassisk", overlays: {}, scale: 25000, paper: "A3", orient: "portrait", grid: false } },
  ];

  const SCALES = [5000, 10000, 25000, 50000, 100000, 250000, 500000];
  const PAPERS = { A5: [148, 210], A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189] };
  const MARGIN_MM = 10;
  // Background images are 1600x1000 px at zoom 13.1 over Mols Bjerge (lat 56.215).
  const M_PER_PX = (156543.03392 * Math.cos((56.215 * Math.PI) / 180)) / Math.pow(2, 13.1);

  const ICONS = {
    layers: "M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5M3 16l9 5 9-5",
    map: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
    search: "M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z",
    draw: "M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 8 18l1-4.5z",
    import: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M17 8l-5-5-5 5M12 3v12",
    export: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3",
    sheets: "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z",
    share: "M8.684 13.342a3 3 0 100-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
    offline: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15zm9-3v6m0 0l-3-3m3 3l3-3",
    profile: "M3 19l5-8 4 5 3-4 6 7M3 21h18",
    bookmark: "M6 3h12v18l-6-4-6 4z",
    history: "M12 8v4l3 2M3.05 11a9 9 0 11.5 4M3 4v5h5",
    measure: "M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2",
    rotate: "M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0011.9 2.5M18.5 9A7 7 0 006.6 6.5",
    printer: "M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a2 2 0 012-2h14a2 2 0 012 2v6a1 1 0 01-1 1h-2M7 14h10v7H7z",
    download: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3",
    chevron: "M19 9l-7 7-7-7",
    right: "M9 5l7 7-7 7",
    back: "M15 19l-7-7 7-7",
    close: "M6 6l12 12M18 6L6 18",
    plus: "M12 5v14M5 12h14",
    minus: "M5 12h14",
    compass: "M12 3l3 9-3 9-3-9z",
    locate: "M12 2v3m0 14v3M2 12h3m14 0h3M12 16a4 4 0 100-8 4 4 0 000 8z",
    warn: "M12 9v4m0 4h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
    grid: "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18",
    check: "M5 13l4 4L19 7",
    tune: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
    sun: "M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4l-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7L5.6 5.6M12 16a4 4 0 100-8 4 4 0 000 8z",
  };

  // ---------- State ----------
  const state = {
    brand: "mahoje",
    theme: "light",
    preset: null,
    base: "dtk25",
    style: "klassisk",
    overlays: {},
    scale: 25000,
    customScale: false,
    paper: "A4",
    orient: "portrait",
    grid: false,
    gridSystem: "utm",
    gridLabels: true,
    decl: true,
    northArrow: true,
    scaleBar: true,
    multi: false,
    cols: 2,
    rows: 2,
    overlap: 10,
    dpi: 200,
    rotation: 0,
    region: "dk",
  };
  const listeners = [];
  function set(patch) {
    Object.assign(state, patch);
    listeners.forEach((fn) => fn(state));
  }
  function on(fn) { listeners.push(fn); }

  function overlayOn(id) { return !!(state.overlays[id] && state.overlays[id].on); }
  function setOverlay(id, patch) {
    const cur = state.overlays[id] || { on: false, opacity: 1 };
    const item = allItems().find((i) => i.id === id);
    const next = Object.assign({}, cur, patch);
    if (next.on && item && item.variants && !next.variant) next.variant = item.def;
    set({ overlays: Object.assign({}, state.overlays, { [id]: next }), preset: patch.on !== undefined || patch.variant !== undefined ? "eget" : state.preset });
  }
  // A manual change that departs from the chosen purpose turns it into "Eget valg".
  function manual(patch) {
    const p = PRESETS.find((x) => x.id === state.preset);
    const differs = p && Object.keys(patch).some((k) => k in p.set && p.set[k] !== patch[k]);
    set(Object.assign({}, patch, differs ? { preset: "eget" } : {}));
  }
  function allItems() { return GROUPS.flatMap((g) => g.items); }
  function activeOverlays() { return allItems().filter((i) => overlayOn(i.id)); }
  function applyPreset(id) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) { set({ preset: id }); return; }
    const overlays = JSON.parse(JSON.stringify(p.set.overlays));
    set(Object.assign({}, p.set, { overlays, preset: id, customScale: false }));
  }

  // ---------- Helpers ----------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v === null || v === undefined) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  function icon(name, cls) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    if (cls) svg.setAttribute("class", cls);
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", ICONS[name] || "");
    svg.append(p);
    return svg;
  }
  const nf = new Intl.NumberFormat("da-DK");
  const fmtScale = (s) => "1:" + nf.format(s);
  function fmtGround(m) {
    if (m < 1000) return Math.round(m) + " m";
    return (m / 1000).toLocaleString("da-DK", { maximumFractionDigits: 1 }) + " km";
  }
  function printArea() {
    let [w, h2] = PAPERS[state.paper];
    if (state.orient === "landscape") [w, h2] = [h2, w];
    const cols = state.multi ? state.cols : 1;
    const rows = state.multi ? state.rows : 1;
    const gw = ((w - 2 * MARGIN_MM) / 1000) * state.scale * cols;
    const gh = ((h2 - 2 * MARGIN_MM) / 1000) * state.scale * rows;
    return { w, h: h2, cols, rows, gw, gh };
  }
  function baseLabel() {
    const b = BASES.find((x) => x.id === state.base);
    if (state.base === "skaermkort" && state.style !== "klassisk") return "Skærmkort, " + STYLES.find((s) => s.id === state.style).label.toLowerCase();
    return b ? b.label : "";
  }
  function summary() {
    const a = printArea();
    const pages = state.multi ? ` · ${a.cols * a.rows} ark` : "";
    return `${state.paper} ${state.orient === "portrait" ? "stående" : "liggende"} · ${fmtScale(state.scale)} · ${baseLabel()}${pages}`;
  }
  function coverageText() {
    const a = printArea();
    return `Dækker ca. ${fmtGround(a.gw)} × ${fmtGround(a.gh)} på kortet`;
  }

  // ---------- Brand, theme, prototype bar ----------
  function applyBrandTheme() {
    const root = document.documentElement;
    root.dataset.brand = state.brand;
    root.dataset.theme = state.theme;
    $$("[data-brandname]").forEach((el) => (el.textContent = state.brand === "solaris" ? "Kort.solaris.dk" : "Topografiske kort"));
    $$(".protobar [data-set-brand]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setBrand === state.brand)));
    $$(".protobar [data-set-theme]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setTheme === state.theme)));
  }
  function protobar(name) {
    const bar = h("div", { class: "protobar", role: "group", "aria-label": "Prototype-indstillinger (ikke en del af designet)" },
      h("span", {}, name),
      h("button", { type: "button", "data-set-brand": "mahoje", onclick: () => set({ brand: "mahoje" }) }, "Mahoje"),
      h("button", { type: "button", "data-set-brand": "solaris", onclick: () => set({ brand: "solaris" }) }, "Solaris"),
      h("button", { type: "button", "data-set-theme": "light", onclick: () => set({ theme: "light" }) }, "Lys"),
      h("button", { type: "button", "data-set-theme": "dark", onclick: () => set({ theme: "dark" }) }, "Mørk"),
      h("a", { href: "../index.html" }, "Alle retninger"));
    document.body.append(bar);
  }

  // ---------- Map ----------
  function mapImage() {
    if (state.base === "none") return null;
    if (state.base === "skaermkort") {
      if (overlayOn("havdybder") || overlayOn("soemaerker")) return "sejlads";
      if (overlayOn("kurver")) return "kurver";
      if (state.style === "daempet") return "daempet";
      return "skaermkort";
    }
    return state.base;
  }
  // Short versions of the credits in src/lib/map/sources.ts. The background
  // image decides part of it: "sejlads" was captured with EMODnet depths and
  // OpenSeaMap on (scripts/current.mjs), whatever the controls say now.
  const DDM_SHORT = "Dybder: Geodatastyrelsen, Danmarks Dybdemodel 50 m, ikke til navigation";
  function credit() {
    const parts = new Set();
    if (state.base === "osm") parts.add("© OpenStreetMap-bidragydere");
    else if (state.base !== "none") parts.add("© Klimadatastyrelsen");
    if (mapImage() === "sejlads") { parts.add("Dybder: EMODnet (CC BY 4.0)"); parts.add("Sømærker: OpenSeaMap"); }
    if (["kurver", "skygge", "stednavne", "matrikel"].some(overlayOn)) parts.add("© Klimadatastyrelsen");
    if (overlayOn("havdybder")) parts.add(state.overlays.havdybder.variant === "eu" ? "Dybder: EMODnet (CC BY 4.0)" : DDM_SHORT);
    if (overlayOn("havbund")) parts.add(DDM_SHORT);
    if (overlayOn("soemaerker")) parts.add("Sømærker: OpenSeaMap");
    if (overlayOn("soedybder")) parts.add("Sødybder: Danmarks Miljøportal");
    if (overlayOn("indsoekort")) parts.add("Indsøkort: Geodatastyrelsen (CC BY 4.0)");
    if (overlayOn("vrag")) parts.add("Vrag: EMODnet Human Activities (CC BY 4.0)");
    return Array.from(parts).join(" · ");
  }
  function renderMap() {
    const img = $(".map-img");
    if (!img) return;
    const name = mapImage();
    img.classList.toggle("blank", !name);
    img.classList.toggle("gray", state.base === "skaermkort" && state.style === "graa");
    img.classList.toggle("darkstyle", state.base === "skaermkort" && state.style === "moerkt");
    img.style.backgroundImage = name ? `url("${IMG}${name}.webp")` : "";
    if (name) img.style.backgroundSize = "1600px 1000px";
    else img.style.backgroundSize = "";

    const stage = $(".frame-wrap");
    const frame = $(".frame");
    if (stage && frame) {
      const a = printArea();
      let fw = a.gw / M_PER_PX;
      let fh = a.gh / M_PER_PX;
      const maxW = stage.clientWidth * 0.86;
      const maxH = stage.clientHeight * 0.74;
      const k = Math.min(1, maxW / fw, maxH / fh);
      fw *= k; fh *= k;
      frame.style.width = Math.max(24, fw) + "px";
      frame.style.height = Math.max(24, fh) + "px";
      frame.style.transform = state.rotation ? `rotate(${state.rotation}deg)` : "";
      frame.style.gridTemplateColumns = `repeat(${a.cols}, 1fr)`;
      frame.style.gridTemplateRows = `repeat(${a.rows}, 1fr)`;
      frame.replaceChildren(
        h("span", { class: "frame-tag" }, `${state.paper} · ${fmtScale(state.scale)}`),
        ...Array.from({ length: a.cols * a.rows }, () => h("div", { class: "sheet" })));
    }
    $$("[data-credit]").forEach((el) => (el.textContent = credit()));
    // Same rule as SeaBadge in the app: always on the map while a sea layer is on.
    const seaOn = activeOverlays().some((i) => SEA_IDS.includes(i.id));
    let badge = $(".seabadge");
    if (seaOn && !badge) {
      badge = h("div", { class: "seabadge", role: "note" }, "Må ikke bruges til navigation");
      $(".map").append(badge);
    }
    if (badge) badge.hidden = !seaOn;
  }
  function renderText() {
    $$("[data-summary]").forEach((el) => (el.textContent = summary()));
    $$("[data-coverage]").forEach((el) => (el.textContent = coverageText()));
    $$("[data-scale-text]").forEach((el) => (el.textContent = fmtScale(state.scale)));
    $$("[data-base-text]").forEach((el) => (el.textContent = baseLabel()));
    $$("[data-active-count]").forEach((el) => {
      const n = activeOverlays().length + (state.grid ? 1 : 0);
      el.textContent = n ? String(n) : "";
      el.hidden = !n;
    });
  }

  // ---------- Widgets (render into [data-widget]) ----------
  // Each widget re-renders on state change but keeps focus on the same control.
  function radioGroup(label, options, current, onPick, cls) {
    const g = h("div", { class: cls, role: "radiogroup", "aria-label": label });
    options.forEach((o) => {
      const checked = String(o.value) === String(current);
      g.append(h("button", { type: "button", role: "radio", class: cls === "seg" || cls === "seg small" ? "" : "chip", "aria-checked": String(checked), tabindex: checked ? "0" : "-1", "aria-label": o.aria || null, "data-v": o.value, onclick: () => onPick(o.value) }, o.label));
    });
    g.addEventListener("keydown", (e) => {
      const btns = $$("[role=radio]", g);
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      let j = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % btns.length;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + btns.length) % btns.length;
      if (j === null) return;
      e.preventDefault();
      btns[j].click();
      // A re-render restores focus to the new choice (renderWidget); otherwise move it here.
      if (g.isConnected) btns[j].focus();
    });
    return g;
  }
  function switchBtn(id, title, desc, checked, onToggle) {
    return h("button", { type: "button", class: "switch", role: "switch", "aria-checked": String(checked), "data-focus": id, onclick: onToggle },
      h("span", {}, h("span", { class: "t" }, title), desc ? h("span", { class: "d" }, desc) : null),
      h("span", { class: "knob", "aria-hidden": "true" }));
  }

  const W = {};
  W.scale = () => {
    const wrap = h("div", {});
    wrap.append(h("span", { class: "label", id: "lbl-scale" }, "Målestok ", h("span", { class: "hint" }, "1:")));
    const opts = SCALES.map((s) => ({ value: s, label: nf.format(s), aria: fmtScale(s) }));
    opts.push({ value: "andet", label: "Andet", aria: "Anden målestok" });
    const cur = state.customScale || !SCALES.includes(state.scale) ? "andet" : state.scale;
    const g = radioGroup("Målestok", opts, cur, (v) => (v === "andet" ? manual({ customScale: true }) : manual({ scale: Number(v), customScale: false })), "chips");
    wrap.append(g);
    if (cur === "andet") {
      wrap.append(h("div", { class: "row", style: { marginTop: "8px" } }, h("span", { class: "note" }, "1:"),
        h("input", { class: "input", style: { paddingLeft: "12px" }, inputmode: "numeric", "aria-label": "Anden målestok (nævner)", value: String(state.scale), placeholder: "15000",
          onchange: (e) => { const n = parseInt(e.target.value.replace(/\D/g, ""), 10); if (n >= 1000 && n <= 1000000) manual({ scale: n }); } })));
    }
    return wrap;
  };
  W.paper = () => h("div", {}, h("span", { class: "label" }, "Papir"),
    radioGroup("Papirformat", Object.keys(PAPERS).map((p) => ({ value: p, label: p, aria: `${p} (${PAPERS[p][0]} × ${PAPERS[p][1]} mm)` })), state.paper, (v) => manual({ paper: v }), "chips cols-6"));
  W.orient = () => h("div", {}, h("span", { class: "label" }, "Retning"),
    radioGroup("Retning", [{ value: "portrait", label: "Stående" }, { value: "landscape", label: "Liggende" }], state.orient, (v) => manual({ orient: v }), "seg"));
  W.coverage = () => h("p", { class: "note tnum", "data-coverage": "" }, coverageText());

  W.basemaps = (el) => {
    const cols = el.dataset.cols === "4" ? "basegrid cols-4" : "basegrid";
    const wrap = h("div", {});
    if (el.dataset.title !== "0") wrap.append(h("span", { class: "label" }, "Baggrundskort"));
    const g = h("div", { class: cols, role: "radiogroup", "aria-label": "Baggrundskort" });
    BASES.forEach((b) => {
      const checked = state.base === b.id;
      g.append(h("button", { type: "button", role: "radio", class: "basetile", "aria-checked": String(checked), "aria-label": b.label + ", " + b.sub, tabindex: checked ? "0" : "-1", "data-focus": "base-" + b.id,
        onclick: () => set({ base: b.id, preset: state.preset ? "eget" : null }) },
        h("span", { class: "img" + (b.thumb ? "" : " none"), style: b.thumb ? { backgroundImage: `url("${IMG}thumb-${b.thumb}.webp")` } : {} }),
        h("span", { class: "lbl" }, b.tile, h("span", { class: "small", style: { display: "block" } }, b.sub))));
    });
    g.addEventListener("keydown", (e) => {
      const btns = $$("[role=radio]", g);
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const next = BASES[(i + d + btns.length) % btns.length];
      btns[BASES.indexOf(next)].click();
      // The click re-renders the grid; move focus to the new choice, not the old one.
      const nb = $(`[data-focus="base-${next.id}"]`, el);
      if (nb) nb.focus();
    });
    wrap.append(g);
    if (state.base === "skaermkort") {
      wrap.append(h("div", { style: { marginTop: "12px" } }, h("span", { class: "label" }, "Stil på skærmkortet"),
        radioGroup("Stil på skærmkortet", STYLES.map((s) => ({ value: s.id, label: s.label })), state.style, (v) => manual({ style: v }), "seg small")));
    }
    return wrap;
  };

  function layerItem(item) {
    const st = state.overlays[item.id] || {};
    const on = !!st.on;
    const box = h("div", { class: "litem", "data-item": item.id });
    box.append(h("label", { class: "check" },
      h("input", { type: "checkbox", checked: on, "data-focus": "ov-" + item.id, onchange: (e) => setOverlay(item.id, { on: e.target.checked }) }),
      h("span", {}, h("span", { class: "t" }, item.label), h("span", { class: "d" }, item.desc))));
    if (on) {
      const opts = h("div", { class: "opts" });
      if (item.variants) {
        opts.append(radioGroup(item.label + ": variant", item.variants.map((v) => ({ value: v.id, label: v.label })), st.variant || item.def, (v) => setOverlay(item.id, { variant: v }), "seg small"));
      }
      opts.append(h("label", { class: "row" }, h("span", {}, "Synlighed"),
        h("input", { type: "range", min: "0", max: "1", step: "0.05", value: String(st.opacity ?? 1), "aria-label": "Synlighed: " + item.label,
          oninput: (e) => { state.overlays[item.id].opacity = Number(e.target.value); e.target.nextSibling.textContent = Math.round(e.target.value * 100) + " %"; } }),
        h("span", { class: "small tnum", style: { minWidth: "40px", textAlign: "right" } }, Math.round((st.opacity ?? 1) * 100) + " %")));
      box.append(opts);
    }
    return box;
  }
  W.seawarning = () => (activeOverlays().some((i) => SEA_IDS.includes(i.id))
    ? h("div", { class: "notice", role: "note" }, icon("warn"), h("span", {}, h("strong", {}, "Må ikke bruges til navigation. "), "Brug officielle søkort. Dybderne er forenklet til turplanlægning."))
    : h("span", {}));

  W.gridset = () => {
    const wrap = h("div", { class: "stack" });
    wrap.append(switchBtn("grid", "Koordinatgitter", "UTM-linjer til GPS og kompas", state.grid, () => manual({ grid: !state.grid })));
    if (state.grid) {
      wrap.append(h("div", { style: { marginLeft: "0" } },
        h("label", { class: "label", for: "gridsys" }, "Koordinatsystem"),
        (() => {
          const s = h("select", { id: "gridsys", class: "select", onchange: (e) => set({ gridSystem: e.target.value }) });
          [["utm", "UTM"], ["mgrs", "MGRS · WGS84"], ["dktm1", "DKTM1 · ETRS89"], ["dktm2", "DKTM2 · ETRS89"], ["dktm3", "DKTM3 · ETRS89"], ["dktm4", "DKTM4 · ETRS89"]].forEach(([v, l]) => s.append(h("option", { value: v, selected: state.gridSystem === v }, l)));
          return s;
        })(),
        h("p", { class: "small", style: { marginTop: "6px" } }, `Print: 1 km = ${(100000 / state.scale).toLocaleString("da-DK", { maximumFractionDigits: 1 })} cm på papiret ved ${fmtScale(state.scale)}.`)));
      wrap.append(switchBtn("gridlabels", "Koordinater langs kanten", null, state.gridLabels, () => set({ gridLabels: !state.gridLabels })));
    }
    wrap.append(switchBtn("decl", "Misvisning i printet", "Diagram med forskellen mellem kort- og kompasnord", state.decl, () => set({ decl: !state.decl })));
    return wrap;
  };

  W.layers = (el) => {
    const wrap = h("div", {});
    const q = (el.dataset.q || "").trim().toLowerCase();
    if (el.dataset.search === "1") {
      const input = h("input", { class: "input", type: "search", placeholder: "Søg i lag, fx dybde eller skel", "aria-label": "Søg i lag", value: el.dataset.q || "", "data-focus": "layersearch",
        oninput: (e) => { el.dataset.q = e.target.value; renderWidget(el); } });
      wrap.append(h("div", { class: "searchwrap", style: { marginBottom: "12px" } }, icon("search"), input));
    }
    const openSet = new Set((el.dataset.open || "terraen").split(",").filter(Boolean));
    let hits = 0;
    GROUPS.forEach((g) => {
      if (g.special === "grid" && el.dataset.grid === "0") return;
      const items = g.items.filter((i) => !q || (i.label + " " + i.keys + " " + i.desc).toLowerCase().includes(q));
      const gridMatch = g.special === "grid" && (!q || "gitter koordinat utm mgrs kompas misvisning".includes(q) || q.split(" ").some((w) => w && "gitter koordinat utm mgrs kompas misvisning".includes(w)));
      if (q && !items.length && !gridMatch) return;
      hits += items.length + (gridMatch ? 1 : 0);
      const isOpen = q ? true : openSet.has(g.id);
      const nOn = g.special === "grid" ? (state.grid ? 1 : 0) + (state.decl ? 1 : 0) : g.items.filter((i) => overlayOn(i.id)).length;
      const bodyId = "lg-" + g.id + "-" + (el.id || "x");
      const head = h("button", { type: "button", class: "lgroup-head", "aria-expanded": String(isOpen), "aria-controls": bodyId, "data-focus": "lg-" + g.id,
        onclick: () => { if (openSet.has(g.id)) openSet.delete(g.id); else openSet.add(g.id); el.dataset.open = Array.from(openSet).join(","); renderWidget(el); } },
        h("span", {}, g.label),
        nOn ? h("span", { class: "count on" }, nOn + " til") : null,
        icon("chevron", "chev"));
      const body = h("div", { class: "lgroup-body", id: bodyId, hidden: !isOpen });
      if (g.special === "grid") body.append(W.gridset());
      else items.forEach((i) => body.append(layerItem(i)));
      if (g.sea) body.append(W.seawarning());
      wrap.append(h("div", { class: "lgroup" }, head, body));
    });
    if (q && !hits) wrap.append(h("p", { class: "empty" }, `Ingen lag matcher "${el.dataset.q}". Prøv fx højde, hav, skel eller gitter.`));
    return wrap;
  };

  W.activechips = () => {
    const act = activeOverlays();
    const wrap = h("div", { class: "activechips", "aria-label": "Aktive lag", role: "list" });
    if (!act.length && !state.grid) return h("p", { class: "small" }, "Ingen ekstra lag. Kortet vises, som det er.");
    act.forEach((i) => {
      const st = state.overlays[i.id];
      const v = i.variants ? " " + i.variants.find((x) => x.id === st.variant).label : "";
      wrap.append(h("span", { class: "achip", role: "listitem" }, i.label + v,
        h("button", { type: "button", "aria-label": "Slå " + i.label + " fra", onclick: () => setOverlay(i.id, { on: false }) }, icon("close"))));
    });
    if (state.grid) wrap.append(h("span", { class: "achip", role: "listitem" }, "Koordinatgitter", h("button", { type: "button", "aria-label": "Slå koordinatgitter fra", onclick: () => manual({ grid: false }) }, icon("close"))));
    return wrap;
  };

  W.printextra = () => {
    const wrap = h("div", { class: "stack" });
    wrap.append(switchBtn("multi", "Flere ark (gulvkort)", "Del et stort kort op på flere A4-ark", state.multi, () => set({ multi: !state.multi })));
    if (state.multi) {
      const stepper = (lbl, key) => h("div", { class: "between" }, h("span", { class: "note" }, lbl),
        h("div", { class: "row" },
          h("button", { type: "button", class: "iconbtn", "aria-label": lbl + ": færre", onclick: () => set({ [key]: Math.max(1, state[key] - 1) }) }, icon("minus")),
          h("span", { class: "tnum", style: { minWidth: "24px", textAlign: "center" }, "aria-live": "polite" }, String(state[key])),
          h("button", { type: "button", class: "iconbtn", "aria-label": lbl + ": flere", onclick: () => set({ [key]: Math.min(6, state[key] + 1) }) }, icon("plus"))));
      wrap.append(stepper("Ark på tværs", "cols"), stepper("Ark på langs", "rows"));
      wrap.append(h("div", {}, h("label", { class: "label", for: "overlap" }, "Overlap ", h("span", { class: "hint tnum" }, state.overlap + " mm")),
        h("input", { id: "overlap", type: "range", min: "0", max: "20", step: "1", value: String(state.overlap), "data-focus": "overlap", oninput: (e) => set({ overlap: Number(e.target.value) }) })));
      if (state.rotation) wrap.append(h("p", { class: "notice", role: "note" }, icon("warn"), h("span", {}, "Kortet er drejet. Sæt rotationen til 0°, ellers passer arkene ikke sammen.")));
    }
    wrap.append(h("div", {}, h("label", { class: "label", for: "rot" }, "Drej kortet ", h("span", { class: "hint tnum" }, state.rotation + "°")),
      h("input", { id: "rot", type: "range", min: "-180", max: "180", step: "1", value: String(state.rotation), "data-focus": "rot", oninput: (e) => set({ rotation: Number(e.target.value) }) })));
    wrap.append(h("div", {}, h("label", { class: "label", for: "dpi" }, "Opløsning"),
      (() => { const s = h("select", { id: "dpi", class: "select", onchange: (e) => set({ dpi: Number(e.target.value) }) });
        [[150, "150 dpi, hurtig"], [200, "200 dpi"], [300, "300 dpi, høj kvalitet"]].forEach(([v, l]) => s.append(h("option", { value: v, selected: state.dpi === v }, l))); return s; })()));
    wrap.append(switchBtn("north", "Nordpil", null, state.northArrow, () => set({ northArrow: !state.northArrow })));
    wrap.append(switchBtn("scalebar", "Målestokslineal", null, state.scaleBar, () => set({ scaleBar: !state.scaleBar })));
    return wrap;
  };

  // Paper preview: the actual crop of the map inside a sheet with margin and credit line.
  W.preview = (el) => {
    const a = printArea();
    const maxW = Number(el.dataset.w || 260);
    const maxH = Number(el.dataset.h || 300);
    const sheetW = a.w * a.cols, sheetH = a.h * a.rows;
    const k = Math.min(maxW / sheetW, maxH / sheetH);
    const pw = sheetW * k, ph = sheetH * k;
    const name = mapImage();
    const wrap = h("figure", { class: "pv", style: { margin: 0 } });
    const paper = h("div", { class: "pv-paper", style: { width: pw + "px", height: ph + "px", gridTemplateColumns: `repeat(${a.cols}, 1fr)`, gridTemplateRows: `repeat(${a.rows}, 1fr)` } });
    // Crop of the background that matches the frame on the map.
    const groundW = a.gw / M_PER_PX, groundH = a.gh / M_PER_PX;
    const innerW = pw - 2 * MARGIN_MM * k * a.cols, innerH = ph - 2 * MARGIN_MM * k * a.rows;
    const z = innerW / groundW;
    for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.cols; c++) {
      const cellW = innerW / a.cols, cellH = innerH / a.rows;
      const offX = -(800 - groundW / 2 + (groundW / a.cols) * c) * z;
      const offY = -(500 - groundH / 2 + (groundH / a.rows) * r) * z;
      // The frame turns on the map and the PDF prints it upright, so the map
      // (and its grid and north) turns the other way around the frame centre.
      const img = h("div", { class: "pv-img", style: {
        left: offX + "px", top: offY + "px", width: 1600 * z + "px", height: 1000 * z + "px",
        backgroundImage: name ? `url("${IMG}${name}.webp")` : "",
        transformOrigin: `${800 * z}px ${500 * z}px`,
        transform: state.rotation ? `rotate(${-state.rotation}deg)` : "" } },
        state.grid ? h("div", { class: "pv-grid", style: { backgroundSize: `${(1000 / M_PER_PX) * z}px ${(1000 / M_PER_PX) * z}px` } }) : null);
      paper.append(h("div", { class: "pv-sheet", style: { padding: MARGIN_MM * k + "px" } },
        h("div", { class: "pv-map" + (name ? "" : " blank"), style: { width: cellW + "px", height: cellH + "px" } }, img,
          state.northArrow ? h("span", { class: "pv-north", "aria-hidden": "true", style: state.rotation ? { transform: `rotate(${-state.rotation}deg)` } : {} }, "N") : null),
        h("div", { class: "pv-foot" }, h("span", {}, fmtScale(state.scale)), h("span", { "data-credit": "" }, credit()))));
    }
    wrap.append(paper, h("figcaption", { class: "small tnum", style: { marginTop: "8px" } }, `${state.paper} ${state.orient === "portrait" ? "stående" : "liggende"}${state.multi ? ` · ${a.cols} × ${a.rows} = ${a.cols * a.rows} ark` : ""} · ${state.dpi} dpi`));
    return wrap;
  };

  // Tool panels
  const TOOLS = [
    { id: "tegn", label: "Tegn og mål", desc: "Ruter, poster og områder. Afstand og areal.", icon: "draw" },
    { id: "import", label: "Åbn GPX eller KML", desc: "Vis en rute fra uret, appen eller en ven", icon: "import" },
    { id: "profil", label: "Højdeprofil", desc: "Stigninger langs en tegnet linje", icon: "profile" },
    { id: "eksport", label: "Gem tegninger som fil", desc: "GPX, KML eller GeoJSON", icon: "export" },
    { id: "offline", label: "Gem kortet offline", desc: "Brug kortet uden net i felten", icon: "offline" },
    { id: "del", label: "Del link", desc: "Samme udsnit og valg hos andre", icon: "share" },
    { id: "bogmaerker", label: "Bogmærker", desc: "Steder du bruger tit", icon: "bookmark" },
    { id: "historik", label: "Tidligere udskrifter", desc: "Lav det samme kort igen", icon: "history" },
  ];
  W.toollist = (el) => {
    const only = el.dataset.only ? el.dataset.only.split(",") : null;
    const wrap = h("div", { class: "toollist" });
    TOOLS.filter((t) => !only || only.includes(t.id)).forEach((t) => wrap.append(h("button", { type: "button", class: "toolrow", "data-tool": t.id, "data-focus": "tool-" + t.id,
      onclick: () => document.dispatchEvent(new CustomEvent("tool", { detail: t.id })) },
      icon(t.icon, "ic"), h("span", {}, h("span", { class: "t" }, t.label), h("span", { class: "d" }, t.desc)), icon("right", "go"))));
    return wrap;
  };
  function toolBody(id) {
    const b = h("div", { class: "stack" });
    if (id === "tegn") {
      b.append(h("div", { role: "toolbar", "aria-label": "Tegneværktøjer", class: "chips cols-3" },
        ...["Punkt", "Linje", "Område", "Cirkel", "Rektangel", "Tekst"].map((t, i) => h("button", { type: "button", class: "chip", "aria-pressed": String(i === 1) , style: i === 1 ? { background: "var(--primary)", color: "var(--on-primary)" } : {} }, t))));
      b.append(h("div", {}, h("span", { class: "label" }, "Mål"), radioGroup("Mål", [{ value: "a", label: "Afstand" }, { value: "b", label: "Areal" }], "a", () => {}, "seg")));
      b.append(h("p", { class: "note" }, "Klik på kortet for at sætte punkter. Dobbeltklik afslutter linjen."));
      b.append(h("p", { class: "empty" }, "Ingen tegninger endnu. Tegninger kommer med i PDF'en og kan gemmes som GPX."));
    } else if (id === "import") {
      b.append(h("div", { class: "empty", style: { textAlign: "center", padding: "28px 16px" } },
        h("p", { style: { marginBottom: "12px" } }, "Træk en fil herhen"),
        h("button", { type: "button", class: "btn" }, icon("import"), "Vælg fil"),
        h("p", { class: "small", style: { marginTop: "12px" } }, "GPX, KML, KMZ og GeoJSON. Filen bliver på din enhed.")));
    } else if (id === "profil") {
      b.append(h("p", { class: "empty" }, "Tegn en linje eller åbn en GPX-rute, så vises højdeprofilen her."));
      b.append(h("button", { type: "button", class: "btn", onclick: () => document.dispatchEvent(new CustomEvent("tool", { detail: "tegn" })) }, icon("draw"), "Tegn en linje"));
    } else if (id === "eksport") {
      b.append(h("p", { class: "note" }, "Gem dine tegninger, så du kan lægge dem på uret eller i en anden app."));
      b.append(h("div", { class: "chips cols-3" }, ...["GPX", "KML", "GeoJSON"].map((t) => h("button", { type: "button", class: "chip", disabled: true }, t))));
      b.append(h("p", { class: "small" }, "Knapperne virker, når du har tegnet noget."));
    } else if (id === "offline") {
      b.append(h("p", { class: "note" }, "Henter kortet inden for printrammen, så det virker uden net."));
      b.append(h("div", {}, h("span", { class: "label" }, "Med på det gemte kort"),
        ...["Topografisk kort", "Højdekurver", "Stednavne"].map((t, i) => h("label", { class: "check" }, h("input", { type: "checkbox", checked: i < 2 }), h("span", { class: "t" }, t)))));
      b.append(h("p", { class: "small tnum" }, "Ca. 38 MB · 1.240 fliser"));
      b.append(h("button", { type: "button", class: "btn btn-primary btn-block" }, icon("offline"), "Gem området"));
      b.append(h("p", { class: "empty" }, "Ingen gemte områder endnu."));
    } else if (id === "del") {
      b.append(h("p", { class: "note" }, "Linket husker sted, målestok, papir og lag."));
      b.append(h("input", { class: "input", style: { paddingLeft: "12px" }, readonly: true, value: location.protocol === "file:" ? "https://kort.mahoje.dk/?c=56.215,10.56,13.1&s=" + state.scale : location.href, "aria-label": "Link til kortet" }));
      b.append(h("button", { type: "button", class: "btn btn-primary btn-block", onclick: () => toast("Link kopieret") }, icon("share"), "Kopiér link"));
    } else if (id === "bogmaerker") {
      b.append(h("button", { type: "button", class: "btn btn-block", onclick: () => toast("Mols Bjerge er gemt") }, icon("bookmark"), "Gem dette sted"));
      b.append(h("p", { class: "empty" }, "Ingen bogmærker endnu. Gem steder, du printer kort over igen og igen, fx spejderhytten."));
    } else if (id === "historik") {
      b.append(h("p", { class: "empty" }, "Ingen udskrifter endnu. Når du har lavet en PDF, kan du lave den igen herfra med samme valg."));
    }
    return b;
  }
  W.toolpanel = (el) => {
    const t = TOOLS.find((x) => x.id === el.dataset.tool);
    if (!t) return h("span", {});
    return h("div", {},
      h("div", { class: "drillhead" },
        h("button", { type: "button", class: "iconbtn", "aria-label": el.dataset.backLabel || "Tilbage", "data-back": "", "data-focus": "back" }, icon("back")),
        h("h2", { tabindex: "-1", "data-tool-title": "" }, t.label)),
      toolBody(t.id));
  };

  function renderWidget(el) {
    const fn = W[el.dataset.widget];
    if (!fn) return;
    const active = document.activeElement;
    const key = active && el.contains(active) ? active.getAttribute("data-focus") || (active.getAttribute("role") === "radio" ? "radio:" + active.closest("[role=radiogroup]").getAttribute("aria-label") : null) : null;
    const caret = key === "layersearch" ? active.selectionStart : null;
    el.replaceChildren(fn(el));
    if (key) {
      let target = null;
      if (key.startsWith("radio:")) {
        const lbl = key.slice("radio:".length);
        const g = $$("[role=radiogroup]", el).find((x) => x.getAttribute("aria-label") === lbl);
        target = g && $$("[role=radio]", g).find((b) => b.getAttribute("aria-checked") === "true");
      } else target = $(`[data-focus="${key}"]`, el);
      if (target) { target.focus(); if (caret !== null) target.setSelectionRange(caret, caret); }
    }
  }
  function renderWidgets(root) { $$("[data-widget]", root).forEach(renderWidget); }

  // ---------- Toast and fake PDF ----------
  let toastTimer;
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = h("div", { class: "toast", role: "status", "aria-live": "polite" }); document.body.append(t); }
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2400);
  }
  function fakeDownload(btn) {
    if (btn.dataset.busy) return;
    btn.dataset.busy = "1";
    const label = btn.querySelector("[data-btn-label]") || btn;
    const orig = label.textContent;
    const bar = btn.parentElement.querySelector(".progress span");
    let p = 0;
    const tick = setInterval(() => {
      p += 12;
      label.textContent = `Laver PDF … ${Math.min(p, 100)} %`;
      if (bar) bar.style.width = Math.min(p, 100) + "%"; if (bar) bar.parentElement.style.background = p < 100 ? "var(--surface-2)" : "transparent";
      if (p >= 100) {
        clearInterval(tick);
        label.textContent = orig;
        if (bar) bar.style.width = "0";
        delete btn.dataset.busy;
        toast("PDF hentet (prototype, intet er printet)");
      }
    }, 220);
  }

  // ---------- Bottom sheet (mobile) ----------
  function sheet(side, opts) {
    const positions = opts.positions || { min: 132, mid: 0.46, max: 0.9 };
    let pos = opts.start || "mid";
    const px = (p) => { const v = positions[p]; return v <= 1 ? Math.round(window.innerHeight * v) : v; };
    function apply() {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      document.documentElement.style.setProperty("--sheet-h", px(pos) + "px");
      document.documentElement.style.setProperty("--sheet-peek", mobile ? Math.min(px(pos), px("mid")) + "px" : "0px");
      side.dataset.pos = pos;
      const g = $(".grabber", side);
      if (g) g.setAttribute("aria-label", pos === "max" ? "Gør panelet mindre" : "Gør panelet større");
      renderMap();
    }
    const g = $(".grabber", side);
    if (g) {
      let startY = null, startH = 0, moved = false;
      g.addEventListener("pointerdown", (e) => { startY = e.clientY; startH = px(pos); moved = false; g.setPointerCapture(e.pointerId); side.style.transition = "none"; });
      g.addEventListener("pointermove", (e) => {
        if (startY === null) return;
        const dy = startY - e.clientY;
        if (Math.abs(dy) > 6) moved = true;
        if (moved) document.documentElement.style.setProperty("--sheet-h", Math.max(px("min"), Math.min(px("max"), startH + dy)) + "px");
      });
      g.addEventListener("pointerup", (e) => {
        side.style.transition = "";
        if (startY === null) return;
        const hh = startH + (startY - e.clientY);
        startY = null;
        if (moved) {
          pos = ["min", "mid", "max"].reduce((best, p) => (Math.abs(px(p) - hh) < Math.abs(px(best) - hh) ? p : best), "min");
        } else pos = pos === "max" ? "mid" : pos === "mid" ? "max" : "mid";
        apply();
      });
      g.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown");
      // Enter and Space fire a click without pointer events (detail 0): same as a tap.
      g.addEventListener("click", (e) => { if (e.detail === 0) { pos = pos === "max" ? "mid" : "max"; apply(); } });
      g.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") { pos = pos === "min" ? "mid" : "max"; apply(); e.preventDefault(); }
        if (e.key === "ArrowDown") { pos = pos === "max" ? "mid" : "min"; apply(); e.preventDefault(); }
      });
    }
    window.addEventListener("resize", apply);
    apply();
    return { set: (p) => { pos = p; apply(); }, get: () => pos };
  }

  // ---------- Boot ----------
  function boot(name) {
    const qs = new URLSearchParams(location.search);
    if (qs.get("brand") === "solaris") state.brand = "solaris";
    if (qs.get("theme") === "dark" || (!qs.get("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)) state.theme = "dark";
    if (qs.get("ren") === "1") document.documentElement.classList.add("ren");
    protobar(name);
    $$("[data-icon]").forEach((el) => el.prepend(icon(el.dataset.icon)));
    on(() => { applyBrandTheme(); renderMap(); renderText(); renderWidgets(document); });
    applyBrandTheme(); renderMap(); renderText(); renderWidgets(document);
    window.addEventListener("resize", renderMap);
    $$("[data-download]").forEach((b) => b.addEventListener("click", () => fakeDownload(b)));
    $$("[data-zoom]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.zoom === "in" ? "Zoom ind (prototype)" : b.dataset.zoom === "out" ? "Zoom ud (prototype)" : "Min position (prototype)")));
  }

  window.Kort = { state, set, on, BASES, STYLES, GROUPS, PRESETS, TOOLS, SCALES, PAPERS, applyPreset, setOverlay, overlayOn, activeOverlays, h, icon, $, $$, renderWidgets, renderWidget, renderMap, toast, sheet, boot, summary, coverageText, fmtScale, baseLabel };
})();
