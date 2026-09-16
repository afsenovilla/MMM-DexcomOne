/* MMM-DexcomOne · node_helper
 * Lee la glucosa de los servidores de Dexcom con las mismas llamadas que la fuente
 * "Dexcom" de Nightscout Clock (ktomy/nightscout-clock, src/BGSourceDexcom.cpp).
 */
const NodeHelper = require("node_helper");
const Log = require("logger");

const SERVERS = {
  us: "https://share1.dexcom.com",
  ous: "https://shareous1.dexcom.com", // "Non-US" en el reloj
  jp: "https://share.dexcom.jp"
};
const APP_IDS = {
  us: "d89443d2-327c-4a6f-89e5-496bbb0317db",
  ous: "d89443d2-327c-4a6f-89e5-496bbb0317db",
  jp: "d8665ade-9673-4e27-9ff6-92db4ce13d13"
};
const BASE_PATH = "/ShareWebServices/Services";
const NULL_ID = "00000000-0000-0000-0000-000000000000";
const TRENDS = ["None", "DoubleUp", "SingleUp", "FortyFiveUp", "Flat",
  "FortyFiveDown", "SingleDown", "DoubleDown", "NotComputable", "RateOutOfRange"];

module.exports = NodeHelper.create({
  start () {
    this.sessionId = null;
    this.accountId = null;
    this.timer = null;
  },

  socketNotificationReceived (notification, config) {
    if (notification !== "DEXCOM_CONFIG") return;
    this.config = config;
    const region = (config.region || "ous").toLowerCase();
    this.server = SERVERS[region] + BASE_PATH;
    this.appId = APP_IDS[region];
    this.accountId = config.accountId || null;
    if (this.timer) clearInterval(this.timer);
    this.poll();
    this.timer = setInterval(() => this.poll(), config.updateInterval);
  },

  async request (path, body) {
    const opts = {
      method: body ? "POST" : "GET",
      headers: { Accept: "application/json", "User-Agent": "MMM-DexcomOne" },
      signal: AbortSignal.timeout(15000)
    };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(this.server + path, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) {
      const err = new Error(data?.Message || `HTTP ${res.status}`);
      err.code = data?.Code || "";
      throw err;
    }
    return data;
  },

  async login () {
    const { username, password } = this.config;
    if (!this.accountId) {
      this.accountId = await this.request("/General/AuthenticatePublisherAccount", {
        accountName: username, password, applicationId: this.appId
      });
    }
    if (!this.accountId || this.accountId === NULL_ID) {
      this.accountId = null;
      throw new Error("Usuario o contraseña de Dexcom no válidos");
    }
    this.sessionId = await this.request("/General/LoginPublisherAccountById", {
      accountId: this.accountId, password, applicationId: this.appId
    });
    if (!this.sessionId || this.sessionId === NULL_ID) {
      this.sessionId = null;
      throw new Error("Dexcom no ha devuelto sesión. Revisa región y credenciales");
    }
  },

  readings () {
    const { historyMinutes, historyCount } = this.config;
    return this.request(`/Publisher/ReadPublisherLatestGlucoseValues?sessionId=${this.sessionId}` +
      `&minutes=${historyMinutes}&maxCount=${historyCount}`);
  },

  parse (raw) {
    const ms = Number(/Date\((\d+)/.exec(raw.ST || raw.WT)?.[1]);
    const trend = typeof raw.Trend === "number" ? TRENDS[raw.Trend] : raw.Trend;
    return { value: raw.Value, trend, time: ms };
  },

  async poll () {
    try {
      if (!this.sessionId) await this.login();
      let data;
      try {
        data = await this.readings();
      } catch (e) {
        if (!/Session/i.test(e.code + e.message)) throw e;
        this.sessionId = null; // sesión caducada: se renueva y se reintenta una vez
        await this.login();
        data = await this.readings();
      }
      const values = (Array.isArray(data) ? data : []).map((r) => this.parse(r));
      this.sendSocketNotification("DEXCOM_DATA", { values });
    } catch (e) {
      Log.error(`[MMM-DexcomOne] ${e.code} ${e.message}`);
      if (/Account/i.test(e.code)) this.accountId = this.config.accountId || null;
      this.sessionId = null;
      this.sendSocketNotification("DEXCOM_ERROR", { message: e.message });
    }
  }
});
