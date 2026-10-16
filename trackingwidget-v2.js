/*!
 * eShipz Tracking Widget  v1
 *
 * Usage:
 *   <script src="https://cdn.eshipz.com/tracking/v1/tracking-widget.js"></script>
 *   <eshipz-tracking customer-id="customer123"></eshipz-tracking>
 *
 * Attributes (all optional except customer-id; they override the saved config):
 *   customer-id      Token id of the customer (required)
 *   api-base         API origin (default: DEFAULT_API_BASE below)
 *   btn-color        Button background            (config: btn_color)
 *   btn-border       Button border colour         (config: btn_border)
 *   txt-color        Button text colour           (config: txt_color)
 *   bg-color         Page background              (config: bg_color)
 *   card-color       Card background              (config: card_color)
 *   bg-txt-color     Page text colour             (config: bg_txt_color)
 *   heading          Title            (default "Track Your Order")
 *   subheading       Subtitle         (default "Enter your order number to track your package")
 *   button-text      Button label     (default "Track Order")
 *   order-fallback   "y" | "n"  (passed to the tracking API)
 *   cos              "y" | "n"  (passed to the tracking API, default "n")
 *   order-number     Pre-fill and auto-search this order / tracking number
 *   query-param      URL query param used for auto-search (default "q")
 *   no-config        Skip fetching saved config (used for live preview)
 *
 * Events (bubbling, composed):
 *   eshipz-track-success  detail: { results }
 *   eshipz-track-error    detail: { error }
 */
(() => {
  if (typeof window === "undefined" || customElements.get("eshipz-tracking")) return;

  const DEFAULT_API_BASE = "https://uat.eshipz.com"; // TODO: set to your real embed/API origin

  const DEFAULTS = {
    btnColor: "#000000",
    btnBorder: "#000000",
    txtColor: "#ffffff",
    bgColor: "#ffffff",
    bgTxtColor: "#1a1a1a",
    cardColor: "#ffffff",
    heading: "Track Your Order",
    subheading: "Enter your order number to track your package",
    buttonText: "Track Order",
  };

  const MSG = {
    unavailable:
      "The tracking information is currently not available. Please recheck your Order Id / Tracking Number.",
    later: "The tracking information is currently not available. Please try after a while.",
    error: "Oops! Some details appear not to be right.",
    multiBox: "Note: Some of your items might have been dispatched as multiple boxes.",
    notAssigned: "Not assigned",
  };

  const CSS = `
    :host { display:flex; flex-direction:column; min-height:100%; width:100%;
            font-family: Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
            font-size:14px; line-height:1.5; box-sizing:border-box; }
    *, *::before, *::after { box-sizing: inherit; }
    .root { --line: rgba(0,0,0,.12); --tile:#ecebfb; --accent:#6b6fd6;
            flex:1; width:100%; background: var(--bg); color: var(--bg-txt); padding: 2rem 1.25rem; }
    .head { text-align:center; margin-bottom:1.25rem; }
    h2 { margin:0; font-size:1.65em; font-weight:700; letter-spacing:-.01em; }
    .sub { margin:.4rem 0 0; opacity:.65; }
    .card { background: var(--card); color:#1a1a1a; border:1px solid var(--line); border-radius:16px;
            padding:1.25rem; box-shadow:0 1px 4px rgba(0,0,0,.04); }
    .search { display:flex; gap:1rem; align-items:center; }
    input[type=text] { flex:1; min-width:0; padding:.75rem .9rem; font:inherit; color:inherit;
                       background:transparent; border:1px solid var(--line); border-radius:8px; outline:0; }
    input[type=text]:focus { border-color: var(--accent); }
    button { font:inherit; font-weight:600; cursor:pointer; padding:.75rem 1.15rem; border-radius:10px;
             background: var(--btn); border:1px solid var(--btn-border); color: var(--btn-txt);
             display:inline-flex; align-items:center; gap:.5rem; white-space:nowrap; }
    button[disabled] { opacity:.65; cursor:default; }
    .spinner { width:.9rem; height:.9rem; border-radius:50%; border:2px solid currentColor;
               border-right-color:transparent; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .note { text-align:right; font-weight:600; margin-top:.6rem; }
    .summary { margin-top:1rem; }
    .summary h3 { margin:0 0 .9rem; font-size:1.05em; font-weight:600; }
    .tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:.9rem; }
    .tile { background: var(--tile); border-radius:12px; padding:.9rem 1.1rem; min-width:0; color:#1a1a1a; }
    .tile small { display:block; font-size:.78em; opacity:.7; }
    .tile strong { display:block; margin-top:.3rem; font-size:1.1em; font-weight:600; word-break:break-word; }
    .pill { display:inline-block; padding:.05rem .75rem; border-radius:999px; font-size:.92em; font-weight:500; }
    .pill.ok { background:#dff5e8; color:#1f8a4c; }
    .pill.bad { background:#fde4e4; color:#c62828; }
    .pill.neutral { background:#fff0cc; color:#946500; }
    .banner { margin-bottom:.9rem; padding:.7rem 1rem; border-radius:10px; background:rgba(0,0,0,.04);
              border-left:4px solid var(--accent); }
    .table-wrap { margin-top:1rem; border:1px solid var(--line); border-radius:12px; overflow-x:auto; }
    table { width:100%; border-collapse:collapse; min-width:520px; }
    th { padding:.8rem 1rem; text-align:left; font-size:.72em; letter-spacing:.07em; text-transform:uppercase;
         font-weight:600; background:rgba(0,0,0,.03); }
    th span { opacity:.65; }
    td { padding:.9rem 1rem; vertical-align:middle; border-top:1px solid var(--line); }
    tr.latest td { background:#eaf7f0; color:#1a1a1a; }
    tr.latest .remark { font-weight:700; color:#1f7a4a; }
    .idx { font-weight:600; }
    .dt small { display:block; opacity:.5; font-size:.82em; }
    .city { display:flex; align-items:center; gap:.45rem; text-transform:uppercase; font-weight:500; }
    .city svg { flex:none; color:#2e9c63; }
    .message { text-align:center; padding:.5rem; }
    .branding { text-align:right; font-size:.75em; margin-top:.9rem; }
    .branding a { color:#007e88; text-decoration:none; }
    @media (max-width:576px) {
      .search { flex-direction:column; align-items:stretch; }
      .root { padding:1.25rem .75rem; }
    }
  `;

  const h = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v === true ? "" : v);
    }
    children.flat().forEach((c) => c != null && node.append(c));
    return node;
  };

  const pinIcon = () => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(ns, "path");
    p.setAttribute("fill", "currentColor");
    p.setAttribute("d", "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z");
    svg.append(p);
    return svg;
  };

  const clean = (s) => (s == null ? "" : String(s));
  const orNA = (s) => (s == null || s === "" ? "-N.A-" : s);

  // UTC, to match the previous widget (which displayed toUTCString())
  const splitDateTime = (d) => {
    if (d == null || d === "-N.A-") return { date: "-N.A-", time: "" };
    const dt = new Date(d);
    if (isNaN(dt)) return { date: String(d), time: "" };
    const p = (n) => String(n).padStart(2, "0");
    return {
      date: `${p(dt.getUTCDate())}/${p(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`,
      time: `${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}:${p(dt.getUTCSeconds())}`,
    };
  };

  const formatServerDate = (d) =>
    d ? String(d).replace(" 00:00:00 GMT", "").replace("GMT", "IST") : "";

  const pillClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (/cancel|fail|rto|exception|undeliver|lost|return|damag/.test(s)) return "bad";
    if (/deliver|open|transit|pick|dispatch|out for|manifest|fulfil/.test(s)) return "ok";
    return "neutral";
  };

  class EshipzTracking extends HTMLElement {
    static get observedAttributes() {
      return [
        "customer-id", "api-base", "btn-color", "btn-border", "txt-color", "bg-color",
        "card-color", "bg-txt-color", "heading", "subheading", "button-text",
        "order-fallback", "cos", "order-number",
      ];
    }

    constructor() {
      super();
      this._root = this.attachShadow({ mode: "open" });
      this._config = {};
      this._abort = null;
      this._built = false;
    }

    connectedCallback() {
      if (!this._built) this._build();
      this._applyTheme();
      this._applyText();
      this._init();
    }

    disconnectedCallback() {
      this._abort?.abort();
    }

    attributeChangedCallback(name, oldV, newV) {
      if (!this._built || oldV === newV) return;
      if (name === "customer-id" || name === "api-base") {
        this._init();
      } else if (name === "order-number") {
        this._input.value = newV || "";
        if (newV) this.search(newV);
      } else if (name === "heading" || name === "subheading" || name === "button-text") {
        this._applyText();
      } else {
        this._applyTheme();
      }
    }

    /* ---------- public API ---------- */
    search(query) {
      if (typeof query === "string") this._input.value = query;
      return this._search();
    }

    /* ---------- internals ---------- */
    get _apiBase() {
      return (this.getAttribute("api-base") || DEFAULT_API_BASE).replace(/\/+$/, "");
    }
    get _id() {
      return (this.getAttribute("customer-id") || "").trim();
    }

    _build() {
      this._title = h("h2");
      this._subtitle = h("p", { class: "sub" });
      this._input = h("input", {
        type: "text",
        placeholder: "Enter the Order / Tracking Number",
        "aria-label": "Order or tracking number",
      });
      this._spinner = h("span", { class: "spinner", hidden: true, "aria-hidden": "true" });
      this._btnLabel = h("span");
      this._btn = h("button", { type: "submit" }, this._btnLabel, this._spinner);
      const form = h("form", { class: "card search" }, this._input, this._btn);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this._search();
      });

      this._note = h("div", { class: "note", role: "status" });
      this._results = h("div", { "aria-live": "polite" });
      this._branding = h("div", { class: "branding", hidden: true },
        "Powered By ",
        h("a", {
          href: "https://www.eshipz.com/?utm_source=partner&utm_medium=track_widget&utm_campaign=track&utm_content=link",
          target: "_blank", rel: "noopener", text: "eShipz",
        }));

      this._root.append(
        h("style", { text: CSS }),
        h("div", { class: "root", part: "container" },
          h("div", { class: "head" }, this._title, this._subtitle),
          form, this._note, this._results, this._branding),
      );
      this._built = true;
    }

    _applyText() {
      const a = (n, d) => this.getAttribute(n) || d;
      this._title.textContent = a("heading", DEFAULTS.heading);
      this._subtitle.textContent = a("subheading", DEFAULTS.subheading);
      this._btnLabel.textContent = a("button-text", DEFAULTS.buttonText);
    }

    _theme() {
      const a = (n) => this.getAttribute(n);
      const c = this._config;
      const bg = a("bg-color") || c.bg_color || DEFAULTS.bgColor;
      return {
        btn: a("btn-color") || c.btn_color || DEFAULTS.btnColor,
        btnBorder: a("btn-border") || c.btn_border || DEFAULTS.btnBorder,
        btnTxt: a("txt-color") || c.txt_color || DEFAULTS.txtColor,
        bg,
        card: a("card-color") || c.card_color || DEFAULTS.cardColor,
        bgTxt: a("bg-txt-color") || c.bg_txt_color || DEFAULTS.bgTxtColor,
      };
    }

    _applyTheme() {
      const t = this._theme();
      const s = this.style;
      s.setProperty("--btn", t.btn);
      s.setProperty("--btn-border", t.btnBorder);
      s.setProperty("--btn-txt", t.btnTxt);
      s.setProperty("--bg", t.bg);
      s.setProperty("--card", t.card);
      s.setProperty("--bg-txt", t.bgTxt);
    }

    async _init() {
      if (!this._id) {
        console.warn("<eshipz-tracking>: missing customer-id attribute");
        return;
      }
      if (!this.hasAttribute("no-config")) {
        try {
          const res = await fetch(`${this._apiBase}/track-widget/${encodeURIComponent(this._id)}/config`);
          if (res.ok) {
            const json = await res.json();
            // Accepts { data: [ {...} ] }, { data: {...} } or a bare object
            const body = json && typeof json === "object" && "data" in json ? json.data : json;
            this._config = (Array.isArray(body) ? body[0] : body) || {};
          }
        } catch (_) {
          /* config is optional; fall back to attributes/defaults */
        }
        this._applyTheme();
      }

      const q =
        this.getAttribute("order-number") ||
        new URLSearchParams(window.location.search).get(this.getAttribute("query-param") || "q");
      if (q) {
        this._input.value = q;
        this._search();
      }
    }

    _setLoading(on) {
      this._spinner.hidden = !on;
      this._btn.disabled = on;
    }

    _reset() {
      this._results.replaceChildren();
      this._note.textContent = "";
      this._branding.hidden = true;
    }

    async _search() {
      const q = this._input.value.trim();
      this._reset();
      if (!q || !this._id) return;

      this._abort?.abort();
      this._abort = new AbortController();
      this._setLoading(true);

      const params = new URLSearchParams({
        "order-fallback": this.getAttribute("order-fallback") || this._config.order_fallback || "y",
        cos: this.getAttribute("cos") || "n",
      });

      try {
        const res = await fetch(
          `${this._apiBase}/track-widget/${encodeURIComponent(this._id)}?${params}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q_num: q }),
            signal: this._abort.signal,
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const results = Array.isArray(data) ? data : data ? [data] : [];

        if (results.length > 0 && results.length !== q.split(",").length) {
          this._note.textContent = MSG.multiBox;
        }
        results.forEach((r) => this._results.append(this._renderResult(r || {})));
        this.dispatchEvent(new CustomEvent("eshipz-track-success", {
          detail: { results }, bubbles: true, composed: true,
        }));
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("[eshipz-tracking] request failed:", error);
        this._results.append(
          h("div", { class: "card summary message", role: "alert", text: MSG.error }),
        );
        this.dispatchEvent(new CustomEvent("eshipz-track-error", {
          detail: { error }, bubbles: true, composed: true,
        }));
      } finally {
        this._setLoading(false);
      }
    }

    _customMessage(result) {
      const key = String(result.order_status || result.tag || "").toLowerCase().trim();
      return key ? this._config.fallback_txt_mapper?.[key] : undefined;
    }

    _renderResult(result) {
      const checkpoints = result.checkpoints || [];
      const orderId = clean(result.order_id).replace(/-clone/gi, "");
      const slug = clean(result.slug);
      const status = clean(result.tag || result.order_status);
      const edd = formatServerDate(result.expected_delivery_date);
      const deliveredOn = formatServerDate(result.delivery_date);
      const custom = this._customMessage(result);
      const card = h("div", { class: "card summary" });

      // No checkpoints and nothing assigned -> message only
      if (checkpoints.length === 0) {
        let msg;
        if (custom) msg = custom;
        else if (Object.keys(result).length === 0) msg = this._config.fallback_txt || MSG.unavailable;
        else if (!slug && orderId) msg = `Your Order ${orderId} has been received and is under processing.`;
        else msg = this._config.fallback_txt || MSG.later;
        card.append(h("div", { class: "message", text: msg }));
        return card;
      }

      const delivered = status === "Delivered";
      const tile = (label, valueNode) =>
        h("div", { class: "tile" }, h("small", { text: label }), h("strong", {}, valueNode));

      card.append(h("h3", { text: "Order summary" }));
      if (custom) card.append(h("div", { class: "banner", text: custom }));

      card.append(
        h("div", { class: "tiles" },
          tile("Order Ref ID", orderId || "-N.A-"),
          tile("Status", status
            ? h("span", { class: `pill ${pillClass(status)}`, text: status })
            : "-N.A-"),
          tile("Tracking", clean(result.tracking_number) || MSG.notAssigned),
          tile("Carrier", slug ? slug.toUpperCase() : MSG.notAssigned),
          delivered && deliveredOn ? tile("Delivered On", deliveredOn) : null,
          !delivered && edd ? tile("Exp. Delivery By", edd) : null,
        ),
        h("div", { class: "table-wrap" },
          h("table", {},
            h("thead", {}, h("tr", {},
              h("th", { scope: "col" }, h("span", { text: "SNO" })),
              h("th", { scope: "col" }, h("span", { text: "Date & Time" })),
              h("th", { scope: "col" }, h("span", { text: "City" })),
              h("th", { scope: "col" }, h("span", { text: "Remarks" })),
            )),
            h("tbody", {}, checkpoints.map((c, i) => {
              const { date, time } = splitDateTime(c.date);
              return h("tr", { class: i === 0 ? "latest" : "" },
                h("td", { class: "idx", text: String(i + 1) }),
                h("td", { class: "dt" }, date, time ? h("small", { text: time }) : null),
                h("td", {}, h("div", { class: "city" }, pinIcon(),
                  h("span", { text: orNA(c.city).replaceAll("_", " ") }))),
                h("td", { class: "remark", text: orNA(c.remark) }),
              );
            })),
          ),
        ),
      );
      this._branding.hidden = false;
      return card;
    }
  }

  customElements.define("eshipz-tracking", EshipzTracking);
})();
