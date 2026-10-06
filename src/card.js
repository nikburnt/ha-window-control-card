import { LitElement, html, css, nothing } from "lit";

const WORDS = {
  en: { all: "All", rollers: "Roller Shades", open: "Open", close: "Close", stop: "Stop", curtain: "Curtain", unknown: "Unknown", offline: "Unavailable", pending: "Pending", sending: "Sending", awaiting_confirmation: "In Progress", error: "Failed", position: "Opening", missing: "Window Control is unavailable", title: "Window", entity: "Roller group", name: "Name", confirmation_timeout: "Position not confirmed", unavailable: "Unavailable" },
  ru: { all: "Всё", rollers: "Рулонные", open: "Открыть", close: "Закрыть", stop: "Стоп", curtain: "Штора", unknown: "Неизвестно", offline: "Недоступна", pending: "Ожидание", sending: "Команда", awaiting_confirmation: "Выполняется", error: "Ошибка", position: "Открытие", missing: "Window Control недоступен", title: "Окно", entity: "Группа рулонных штор", name: "Название", confirmation_timeout: "Позиция не подтверждена", unavailable: "Недоступна" },
};
const position = (state) => {
  const value = state?.attributes?.current_position;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : null;
};
const available = (state) => !!state && state.state !== "unavailable";
const TIMING_WORDS = {
  en: { estimated: "Estimated Time Remaining", seconds: "s left", waiting: "Awaiting Position" },
  ru: { estimated: "Оценка Оставшегося Времени", seconds: "с осталось", waiting: "Ждём Позицию" },
};

class WindowControlCard extends LitElement {
  static properties = { hass: { attribute: false }, config: { state: true }, mode: { state: true }, error: { state: true }, drafts: { state: true } };

  constructor() {
    super();
    this.mode = "all";
    this.error = "";
    this.drafts = {};
  }

  setConfig(config) {
    if (!config.entity?.startsWith("cover.")) throw new Error("A Window Control roller group entity is required");
    this.config = { ...config };
  }

  static getConfigElement() { return document.createElement("window-control-card-editor"); }
  static getStubConfig(hass) {
    return { entity: Object.values(hass.states).find((state) => state.attributes?.window_control)?.entity_id ?? "" };
  }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, rows: 7, min_columns: 6, min_rows: 6 }; }
  get words() { return WORDS[this.hass?.language?.startsWith("ru") ? "ru" : "en"]; }
  get timingWords() { return TIMING_WORDS[this.hass?.language?.startsWith("ru") ? "ru" : "en"]; }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._ticker);
    this._ticker = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    this.requestUpdate();
  }

  updated() {
    const members = this.hass?.states[this.config?.entity]?.attributes?.members || [];
    const counting = this.isConnected && members.some((member) => this.estimate(member) > 0);
    if (counting && !this._ticker) this._ticker = setInterval(() => this.requestUpdate(), 1000);
    if (!counting && this._ticker) {
      clearInterval(this._ticker);
      this._ticker = undefined;
    }
  }

  estimate(member) {
    const state = this.hass.states[member.entity_id];
    const attrs = state?.attributes;
    if (!available(state) || state.state === "unknown" || attrs.last_error || member.error
      || !["sending", "awaiting_confirmation"].includes(attrs.phase)
      || typeof attrs.target_position !== "number" || !attrs.estimated_completion) return null;
    const end = Date.parse(attrs.estimated_completion);
    return Number.isFinite(end) ? Math.max(0, Math.ceil((end - Date.now()) / 1000)) : null;
  }

  remaining(member) {
    const seconds = this.estimate(member);
    return html`<span class="estimate" title=${this.timingWords.estimated} aria-live="off">${seconds === null ? nothing : seconds > 0 ? `~${seconds} ${this.timingWords.seconds}` : this.timingWords.waiting}</span>`;
  }

  async command(entity, action, data = {}) {
    if (!entity || !this.hass) return;
    this.error = "";
    try {
      await this.hass.callService(entity.split(".")[0], action, { entity_id: entity, ...data });
    } catch (error) {
      this.error = error.message || String(error);
    }
  }

  groupCommand(action) {
    const group = this.hass.states[this.config.entity];
    if (this.mode === "all") return this.command(group?.attributes?.all_controls?.[action], "press");
    return this.command(this.config.entity, `${action}_cover`);
  }

  iconButton(action, click, disabled = false, suffix = "", active = false) {
    const label = `${this.words[action]}${suffix ? `: ${suffix}` : ""}`;
    const icon = { open: "mdi:arrow-up", stop: "mdi:stop", close: "mdi:arrow-down" }[action];
    return html`<button class="icon ${active ? "active" : ""}" type="button" title=${label} aria-label=${label} ?disabled=${disabled} @click=${click}><ha-icon .icon=${icon}></ha-icon></button>`;
  }

  label(member) {
    return this.hass.states[member.entity_id]?.attributes?.friendly_name || member.entity_id || this.words.unknown;
  }

  status(member) {
    const state = this.hass.states[member.entity_id];
    if (!available(state)) return this.words.offline;
    const error = state.attributes.last_error || member.error;
    if (error) return this.words[error] || this.words.error;
    const phase = state.attributes.phase || member.phase;
    if (phase && phase !== "idle") return this.words[phase] || phase;
    const value = position(state);
    return value === null ? this.words.unknown : `${value}%`;
  }

  slider(member) {
    const state = this.hass.states[member.entity_id];
    const value = this.drafts[member.entity_id] ?? position(state) ?? 50;
    return html`<input class="position" type="range" min="0" max="100" step="1"
      aria-label=${`${this.words.position}: ${this.label(member)}`} aria-valuetext=${position(state) === null && this.drafts[member.entity_id] === undefined ? this.words.unknown : `${value}%`}
      .value=${String(value)} ?disabled=${!available(state)}
      @input=${(event) => { this.drafts = { ...this.drafts, [member.entity_id]: Number(event.target.value) }; }}
      @change=${(event) => {
        const target = Number(event.target.value);
        const next = { ...this.drafts }; delete next[member.entity_id]; this.drafts = next;
        this.command(member.entity_id, "set_cover_position", { position: target });
      }} />`;
  }

  controls(member) {
    const state = this.hass.states[member.entity_id];
    return html`<div class="member-actions">${["open", "stop", "close"].map((action) => this.iconButton(action, () => this.command(member.entity_id, `${action}_cover`), !available(state), this.label(member), state?.state === (action === "open" ? "opening" : action === "close" ? "closing" : "never")))}</div>`;
  }

  render() {
    if (!this.config || !this.hass) return nothing;
    const group = this.hass.states[this.config.entity];
    if (!group?.attributes?.window_control) return html`<ha-card><div class="missing" role="status">${this.words.missing}</div></ha-card>`;
    const members = group.attributes.members || [];
    const rollers = members.filter((m) => m.role === "roller");
    const curtain = members.find((m) => m.role === "curtain");
    const curtainState = curtain && this.hass.states[curtain.entity_id];
    const curtainPosition = position(curtainState);
    const curtainWidth = curtainPosition === null || !available(curtainState) ? 0 : (100 - curtainPosition) / 2;
    const allOffline = !(this.mode === "rollers" ? rollers : members).some((m) => available(this.hass.states[m.entity_id]));
    const columnStyle = `--columns:${Math.max(rollers.length, 1)}`;
    return html`<ha-card>
      <header><div class="heading"><ha-icon icon="mdi:window-shutter"></ha-icon><h2>${this.config.name || this.words.title}</h2></div>
        <div class="mode" role="group" aria-label=${this.words.title}>
          ${["all", "rollers"].map((mode) => html`<button type="button" class=${this.mode === mode ? "selected" : ""} aria-pressed=${String(this.mode === mode)} @click=${() => { this.mode = mode; }}>${this.words[mode]}</button>`)}
        </div>
      </header>
      <div class="toolbar"><span class="scope">${this.words[this.mode]}</span><div class="global-actions">${["open", "stop", "close"].map((action) => this.iconButton(action, () => this.groupCommand(action), allOffline || (this.mode === "all" && !group.attributes.all_controls?.[action]), this.words[this.mode]))}</div></div>
      <div class="window" style=${columnStyle} aria-hidden="true">
        ${rollers.map((m) => {
          const state = this.hass.states[m.entity_id]; const value = position(state);
          return html`<div class="pane ${!available(state) || value === null ? "unknown" : ""}"><div class="shade" style=${`height:${value === null ? 100 : 100 - value}%`}></div><div class="rail"></div></div>`;
        })}
        ${curtain ? html`<div class="drape left" style=${`width:${curtainWidth}%`}></div><div class="drape right" style=${`width:${curtainWidth}%`}></div>` : nothing}
      </div>
      <div class="rollers" style=${columnStyle}>
        ${rollers.map((member) => html`<section class="roller">
          <div class="member-name">${this.label(member)}</div>
          <div class="status ${member.error || this.hass.states[member.entity_id]?.attributes.last_error || !available(this.hass.states[member.entity_id]) ? "problem" : ""}" title=${this.status(member)} aria-live="polite">${this.drafts[member.entity_id] === undefined ? this.status(member) : `${this.drafts[member.entity_id]}%`}</div>
          ${this.remaining(member)}
          ${this.slider(member)}${this.controls(member)}
        </section>`)}
      </div>
      ${curtain ? html`<section class="curtain"><div class="curtain-header"><div class="curtain-title"><ha-icon icon="mdi:curtains"></ha-icon><span class="member-name">${this.label(curtain)}</span></div><div class="curtain-status"><span class="status ${!available(curtainState) || curtain.error ? "problem" : ""}" aria-live="polite">${this.drafts[curtain.entity_id] === undefined ? this.status(curtain) : `${this.drafts[curtain.entity_id]}%`}</span>${this.remaining(curtain)}</div></div><div class="curtain-control">${this.slider(curtain)}${this.controls(curtain)}</div></section>` : nothing}
      ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
    </ha-card>`;
  }

  static styles = css`
    :host { display:block; color:var(--primary-text-color,#252a2c); font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif); letter-spacing:0; }
    * { box-sizing:border-box; letter-spacing:0; }
    ha-card { display:block; overflow:hidden; background:var(--ha-card-background,var(--card-background-color,#fff)); border-radius:var(--ha-card-border-radius,8px); border:1px solid var(--divider-color,#e1e5e3); box-shadow:var(--ha-card-box-shadow,none); }
    header { padding:18px 18px 12px; display:flex; gap:12px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
    .heading,.curtain-title { display:flex; align-items:center; gap:9px; min-width:0; }
    .heading { flex:1 1 140px; }
    h2 { font-size:17px; line-height:1.35; margin:0; font-weight:600; overflow-wrap:anywhere; }
    ha-icon { display:inline-flex; --mdc-icon-size:22px; width:22px; height:22px; flex-shrink:0; }
    .heading ha-icon { color:var(--primary-color,#287a65); }
    button { font:inherit; border:0; cursor:pointer; color:inherit; touch-action:manipulation; }
    button:disabled { opacity:.35; cursor:default; }
    button:focus-visible,input:focus-visible { outline:2px solid var(--primary-color,#287a65); outline-offset:2px; }
    .mode { display:flex; border-bottom:1px solid var(--divider-color,#e1e5e3); }
    .mode button { padding:8px 10px; min-height:36px; background:none; font-size:12px; color:var(--secondary-text-color,#6e7773); border-bottom:2px solid transparent; }
    .mode button.selected { border-bottom-color:var(--primary-color,#287a65); color:var(--primary-text-color,#252a2c); }
    .toolbar { display:flex; justify-content:space-between; align-items:center; padding:0 18px 12px; }
    .scope { font-size:12px; color:var(--secondary-text-color,#6e7773); }
    .global-actions,.member-actions { display:flex; align-items:center; justify-content:center; gap:2px; }
    .icon { background:transparent; display:inline-flex; justify-content:center; align-items:center; width:38px; height:38px; padding:8px; border-radius:5px; flex-shrink:0; }
    .icon:hover:not(:disabled) { background:var(--secondary-background-color,#f0f4f2); }
    .icon.active { color:var(--primary-color,#287a65); }
    .global-actions .icon { background:var(--secondary-background-color,#f0f4f2); width:40px; height:38px; }
    .window { position:relative; display:grid; grid-template-columns:repeat(var(--columns),minmax(0,1fr)); gap:5px; margin:0 18px; padding:5px; border:1px solid var(--divider-color,#cdd4d0); height:176px; background:#d2d9d5; overflow:hidden; }
    .pane { position:relative; min-width:0; overflow:hidden; background:#dce9eb; border-bottom:5px solid #bbc9c4; }
    .pane:after { content:""; display:block; width:100%; height:1px; position:absolute; bottom:24%; background:#c5d9dd; }
    .shade { position:absolute; z-index:1; top:0; left:0; width:100%; background:repeating-linear-gradient(0deg,#f7f7f4 0,#f7f7f4 7px,#e7e9e5 8px,#e7e9e5 9px); border-bottom:4px solid #b8c0b9; transition:height .65s ease; min-height:0; }
    .rail { position:absolute; top:0; height:5px; width:100%; z-index:2; background:#adbab1; }
    .unknown .shade { opacity:.35; background:repeating-linear-gradient(45deg,#d5d9d6 0,#d5d9d6 5px,transparent 5px,transparent 10px); }
    .drape { position:absolute; top:3px; bottom:3px; z-index:3; background:repeating-linear-gradient(90deg,#7c9891 0,#7c9891 8px,#68857f 9px,#97ada6 15px,#97ada6 20px); transition:width .65s ease; opacity:.9; pointer-events:none; }
    .drape.left { left:3px; border-right:2px solid #668079; } .drape.right { right:3px; border-left:2px solid #668079; }
    .rollers { display:grid; grid-template-columns:repeat(auto-fit,minmax(86px,1fr)); gap:8px; margin:14px 18px 16px; }
    .roller { min-width:0; text-align:center; }
    .member-name { font-size:12px; line-height:1.35; font-weight:600; overflow-wrap:anywhere; min-height:32px; display:flex; align-items:center; justify-content:center; }
    .status { display:block; font-size:12px; line-height:1.5; color:var(--secondary-text-color,#6e7773); overflow-wrap:anywhere; min-height:18px; }
    .roller .status { height:36px; display:flex; align-items:center; justify-content:center; }
    .estimate { display:block; min-height:32px; font-size:11px; line-height:16px; color:var(--secondary-text-color,#6e7773); overflow-wrap:anywhere; font-variant-numeric:tabular-nums; }
    .curtain-status { min-width:0; text-align:right; }
    .problem,.error { color:var(--error-color,#b83e39); }
    .position { display:block; width:100%; min-width:0; height:28px; margin:5px 0; accent-color:var(--primary-color,#287a65); cursor:pointer; }
    .position:disabled { cursor:default; opacity:.4; }
    .member-actions .icon { width:30px; height:34px; padding:5px; }
    .member-actions ha-icon { width:19px; height:19px; --mdc-icon-size:19px; }
    .curtain { border-top:1px solid var(--divider-color,#e1e5e3); padding:12px 18px 14px; }
    .curtain-header,.curtain-control { display:flex; justify-content:space-between; align-items:center; gap:18px; }
    .curtain-header .member-name { min-height:24px; justify-content:flex-start; }
    .curtain-title ha-icon { color:var(--secondary-text-color,#6e7773); }
    .curtain-control .position { flex:1; } .curtain-control .member-actions { flex-shrink:0; }
    .error,.missing { font-size:13px; padding:12px 18px; overflow-wrap:anywhere; }
    @media (prefers-reduced-motion:reduce) { .shade,.drape { transition:none; } }
    @media (max-width:380px) { header { padding:14px 12px 10px; gap:6px; } .toolbar { padding:0 12px 10px; } .window { margin:0 12px; height:150px; } .rollers { margin:10px 12px 12px; gap:4px; } .curtain { padding:10px 12px 12px; } .member-actions { gap:0; } .member-actions .icon { width:27px; height:36px; padding:4px; } }
  `;
}

class WindowControlCardEditor extends LitElement {
  static properties = { hass: { attribute: false }, config: { state: true } };
  setConfig(config) { this.config = { ...config }; }
  render() {
    if (!this.hass || !this.config) return nothing;
    const words = WORDS[this.hass.language?.startsWith("ru") ? "ru" : "en"];
    const schema = [{ name: "entity", required: true, selector: { entity: { domain: "cover", integration: "window_control" } } }, { name: "name", selector: { text: {} } }];
    return html`<ha-form .hass=${this.hass} .data=${this.config} .schema=${schema} .computeLabel=${(field) => words[field.name]} @value-changed=${(event) => {
      event.stopPropagation();
      this.config = { type: "custom:window-control-card", ...event.detail.value };
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this.config }, bubbles: true, composed: true }));
    }}></ha-form>`;
  }
}

if (!customElements.get("window-control-card")) customElements.define("window-control-card", WindowControlCard);
if (!customElements.get("window-control-card-editor")) customElements.define("window-control-card-editor", WindowControlCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "window-control-card", name: "Window Control", description: "Window Control roller shades and curtain", preview: true });
