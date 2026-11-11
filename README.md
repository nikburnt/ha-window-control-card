# Window Control Card

A single Home Assistant card for roller shades and an optional curtain.
Standard cover entities provide the reported positions. Visual Logic group
blueprints own sequencing and delays, so closing the dashboard does not
interrupt a sequence. The retired Window Control integration is not required.

## Installation

Add `nikburnt/ha-window-control-card` to HACS as a custom Dashboard repository.
Download the card, then add **Window Control** to a dashboard. Select the
roller covers, optional curtain and the two group blueprints in the visual editor.

```yaml
type: custom:window-control-card
name: Window
rollers:
  - cover.window_left
  - cover.window_center
  - cover.window_right
curtain: cover.window_curtain
roller_blueprint: window-rollers
all_blueprint: window-all
```

All/Roller Shades selects the scope of the top action buttons. The configured
blueprints must expose signal starts named `up`, `down`, and `stop`. Group
Up/Down retain that blueprint's button semantics, including repeated-direction
stops when configured. The server-side Stop branch must cancel its pending
cascade before stopping the selected covers. The card does not schedule or
reconstruct those sequences in the browser.

Individual roller Open/Close send `cover.set_cover_position` with 100/0.
Stop remains `cover.stop_cover`. Curtain Open/Close retain their native actions.
Sliders send one position command on release, not per pointer movement. Group
controls are disabled until their blueprint is configured; individual controls
remain independent.

Legacy `entity: cover.some_window_rollers` configurations remain supported when
their Window Control integration is still installed. Their whole-window buttons
remain server-owned; the roller-only group uses percentage Open/Close.

The drawing reflects reported positions, not guessed travel times. Unknown
and unavailable values are not shown as zero. English and Russian UI are
selected using Home Assistant's language. Themes and reduced-motion preferences
are respected. No credentials, remote images or external CDN are used.

Legacy covers that expose an `estimated_completion` can show a separate
approximate countdown. At zero it shows **Awaiting Position**, not success.
Native covers without that metadata do not fabricate a countdown. Timers run
only while needed and stop when the card is removed.

## Development

Run `npm ci`, `npm run build`, and `npm run check`. Open `preview/index.html`
for an entirely local simulated window. This preview cannot contact Home
Assistant or move physical devices. Publish the built
`dist/ha-window-control-card.js` with each release.
