# Window Control Card

A single Home Assistant card for ordered roller shades and a curtain. Requires
the [Window Control integration](https://github.com/nikburnt/home-assistant-window-control).
Commands and sequencing run on the server, so closing the dashboard does not
interrupt a sequence.

## Installation

Add `nikburnt/ha-window-control-card` to HACS as a custom Dashboard repository.
Download the card, then add **Window Control** to a dashboard. Select the
integration's **Roller Shades** group in the visual editor.

```yaml
type: custom:window-control-card
entity: cover.living_room_wide_window_rollers
name: Wide Window
```

The group supplies member and whole-window button IDs; individual entities
do not need to be repeated in YAML. All/Roller Shades selects the scope of the
top action buttons. Individual controls remain independent. Sliders send one
position command on release, rather than one command per pointer movement.

The drawing reflects reported positions, not guessed travel times. Unknown
and unavailable values are not shown as zero. English and Russian UI are
selected using Home Assistant's language. Themes and reduced-motion preferences
are respected. No credentials, remote images or external CDN are used.

## Development

Run `npm ci`, `npm run build`, and `npm run check`. Open `preview/index.html`
for an entirely local simulated window. This preview cannot contact Home
Assistant or move physical devices. Publish the built
`dist/ha-window-control-card.js` with each release.
