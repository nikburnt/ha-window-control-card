import { mdiArrowUp, mdiArrowDown, mdiStop, mdiWindowShutter, mdiCurtains } from "@mdi/js";

const icons = { "mdi:arrow-up": mdiArrowUp, "mdi:arrow-down": mdiArrowDown, "mdi:stop": mdiStop, "mdi:window-shutter": mdiWindowShutter, "mdi:curtains": mdiCurtains };
class Icon extends HTMLElement {
  static observedAttributes = ["icon"];
  set icon(value) { this.setAttribute("icon", value); }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() { const root = this.shadowRoot || this.attachShadow({ mode: "open" }); root.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden="true"><path d="${icons[this.getAttribute("icon")] || mdiWindowShutter}"></path></svg>`; }
}
customElements.define("ha-icon", Icon);
const card = document.querySelector("window-control-card");
const ids = ["cover.window_left", "cover.window_center", "cover.window_right", "cover.window_curtain"];
const members = ids.map((entity_id, index) => ({ entity_id, role: index === 3 ? "curtain" : "roller", phase: "idle", error: null }));
let states = Object.fromEntries(ids.map((entity_id, index) => [entity_id, { entity_id, state: "open", attributes: { friendly_name: ["Left Roller", "Center Roller", "Right Roller", "Curtain"][index], current_position: [65, 40, 15, 80][index], phase: "idle" } }]));
states["cover.window_rollers"] = { entity_id: "cover.window_rollers", state: "open", attributes: { window_control: true, members, all_controls: { open: "button.window_open_all", close: "button.window_close_all", stop: "button.window_stop_all" } } };
const calls = [];
const jobs = new Map();
let language = "en";
function update() { card.hass = { states: { ...states }, language, callService }; }
function cancel(id) { clearTimeout(jobs.get(id)?.timer); clearInterval(jobs.get(id)?.interval); jobs.delete(id); }
function move(id, target, delay = 0) {
  if (states[id].state === "unavailable") return;
  cancel(id);
  states[id].attributes.phase = delay ? "pending" : "awaiting_confirmation";
  const job = {};
  jobs.set(id, job);
  job.timer = setTimeout(() => {
    states[id].attributes.phase = "awaiting_confirmation";
    job.interval = setInterval(() => {
      const old = states[id].attributes.current_position;
      states[id].attributes.current_position = old + Math.sign(target - old) * Math.min(3, Math.abs(target - old));
      states[id].state = target > old ? "opening" : "closing";
      if (states[id].attributes.current_position === target) { cancel(id); states[id].state = target ? "open" : "closed"; states[id].attributes.phase = "idle"; }
      update();
    }, 80);
  }, delay);
  update();
}
async function callService(domain, service, data) {
  calls.push({ domain, service, ...data });
  if (window.demo.failNext) { window.demo.failNext = false; throw new Error("Command failed"); }
  const all = domain === "button";
  const action = all ? data.entity_id.split("_").at(-2) : service.split("_")[0];
  const selected = all ? ids : data.entity_id === "cover.window_rollers" ? ids.slice(0, 3) : [data.entity_id];
  for (const [index, id] of selected.entries()) {
    if (action === "stop") { cancel(id); states[id].state = states[id].attributes.current_position ? "open" : "closed"; states[id].attributes.phase = "idle"; }
    else move(id, action === "open" ? 100 : action === "close" ? 0 : data.position, selected.length > 1 && index < 3 ? index * 700 : 0);
  }
  update();
}
window.demo = {
  calls, failNext: false,
  setLanguage(value) { language = value; update(); },
  setUnavailable(id) { cancel(id); states[id] = { ...states[id], state: "unavailable" }; update(); },
  setUnknown(id) { cancel(id); states[id] = { ...states[id], state: "unknown", attributes: { ...states[id].attributes, current_position: null } }; update(); },
  setError(id) { states[id].attributes.last_error = "confirmation_timeout"; update(); },
  setDark() { document.body.classList.add("dark"); },
};
card.setConfig({ entity: "cover.window_rollers", name: "Wide Window" });
update();
