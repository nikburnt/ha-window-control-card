# Window Control Card

This repository owns the dashboard bundle. Install releases through HACS;
never edit the installed `www/community/ha-window-control-card` files directly.

Scheduling belongs to server-side Visual Logic group blueprints (or the legacy
Window Control integration), not this card. Native individual roller Open/Close
send position 100/0; Stop remains a separate command. Native group Up/Down/Stop
call the configured blueprint's named starts. Every command targets public
entities. Reflect actual reported positions and
errors; never fabricate motor progress or treat unavailable as zero.

Run the build and syntax check, then exercise the simulated preview with
Playwright at desktop and mobile widths. Real window motion requires explicit
owner approval. Keep previews free of tokens and physical device IDs.
