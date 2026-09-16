/* MMM-DexcomOne · módulo de MagicMirror² */
Module.register("MMM-DexcomOne", {
  defaults: {
    username: "",          // email, teléfono (+34...) o usuario de Dexcom
    password: "",
    accountId: "",         // opcional: UUID de tu cuenta, evita el paso de autenticación por usuario
    region: "ous",         // "ous" (Europa), "us" o "jp"
    units: "mg/dL",        // "mg/dL" o "mmol/L"
    low: 70,               // umbrales siempre en mg/dL
    high: 180,
    urgentLow: 55,
    staleMinutes: 15,
    updateInterval: 2.5 * 60 * 1000,
    historyMinutes: 180,
    historyCount: 36,
    showGraph: true
  },

  arrows: {
    DoubleUp: "⇈", SingleUp: "↑", FortyFiveUp: "↗", Flat: "→",
    FortyFiveDown: "↘", SingleDown: "↓", DoubleDown: "⇊",
    NotComputable: "?", RateOutOfRange: "⇕", None: ""
  },

  getStyles () { return ["MMM-DexcomOne.css"]; },

  start () {
    this.values = [];
    this.error = null;
    this.sendSocketNotification("DEXCOM_CONFIG", this.config);
    // Refresca el "hace X min" sin pedir datos nuevos
    setInterval(() => this.updateDom(), 30 * 1000);
  },

  socketNotificationReceived (notification, payload) {
    if (notification === "DEXCOM_DATA") {
      this.values = payload.values.sort((a, b) => b.time - a.time);
      this.error = null;
    } else if (notification === "DEXCOM_ERROR") {
      this.error = payload.message;
    }
    this.updateDom(500);
  },

  fmt (mg) {
    return this.config.units === "mmol/L" ? (mg / 18.0182).toFixed(1) : String(Math.round(mg));
  },

  rangeClass (mg) {
    const c = this.config;
    if (mg <= c.urgentLow) return "urgent-low";
    if (mg < c.low) return "low";
    if (mg > c.high) return "high";
    return "in-range";
  },

  getDom () {
    const root = document.createElement("div");
    root.className = "dexcom";
    const [last, prev] = this.values;

    if (!last) {
      root.innerHTML = `<div class="dexcom-msg dimmed small">${this.error || "Cargando glucosa…"}</div>`;
      return root;
    }

    const ageMin = Math.floor((Date.now() - last.time) / 60000);
    const stale = ageMin >= this.config.staleMinutes;
    root.classList.add(stale ? "stale" : this.rangeClass(last.value));

    let delta = "";
    if (prev && last.time - prev.time < 11 * 60000) {
      const d = last.value - prev.value;
      const shown = this.config.units === "mmol/L" ? (d / 18.0182).toFixed(1) : Math.round(d);
      delta = `${d >= 0 ? "+" : ""}${shown}`;
    }

    const ageText = ageMin < 1 ? "ahora" : `hace ${ageMin} min`;
    root.innerHTML = `
      <div class="dexcom-reading">
        <span class="dexcom-value">${this.fmt(last.value)}</span>
        <span class="dexcom-arrow">${stale ? "" : this.arrows[last.trend] ?? ""}</span>
      </div>
      <div class="dexcom-meta small">
        <span class="bright">${this.config.units}</span>
        ${delta ? `<span>${delta}</span>` : ""}
        <span class="${stale ? "dexcom-warn" : "dimmed"}">${ageText}</span>
      </div>
      ${this.config.showGraph ? this.graph() : ""}
      ${this.error ? `<div class="dexcom-msg xsmall dimmed">Último intento fallido: ${this.error}</div>` : ""}
    `;
    return root;
  },

  // Mini gráfica SVG de las últimas horas con la franja objetivo marcada
  graph () {
    const pts = this.values.slice().reverse();
    if (pts.length < 2) return "";
    const W = 220, H = 60, now = Date.now();
    const span = this.config.historyMinutes * 60000;
    const min = 40, max = 300;
    const x = (t) => W - ((now - t) / span) * W;
    const y = (v) => H - ((Math.min(Math.max(v, min), max) - min) / (max - min)) * H;
    const band = `<rect x="0" y="${y(this.config.high)}" width="${W}"
      height="${y(this.config.low) - y(this.config.high)}" class="dexcom-band"/>`;
    const dots = pts
      .filter((p) => now - p.time <= span)
      .map((p) => `<circle cx="${x(p.time).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="2"
        class="dexcom-dot ${this.rangeClass(p.value)}"/>`)
      .join("");
    return `<svg class="dexcom-graph" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${band}${dots}</svg>`;
  }
});
