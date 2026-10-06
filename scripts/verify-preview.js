async (page) => {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:8768/preview/");
  await page.getByRole("heading", { name: "Wide Window" }).waitFor();
  await page.setViewportSize({ width: 1100, height: 850 });
  const before = await page.locator(".shade").first().evaluate((node) => node.getBoundingClientRect().height);
  await page.getByRole("button", { name: "Open: All", exact: true }).click();
  await page.waitForTimeout(1000);
  const after = await page.locator(".shade").first().evaluate((node) => node.getBoundingClientRect().height);
  check(after < before, "Window drawing did not follow changing positions");
  await page.getByRole("button", { name: "Stop: All", exact: true }).click();
  let calls = await page.evaluate(() => window.demo.calls);
  check(calls[0].domain === "button" && calls[0].entity_id === "button.window_open_all", "Whole-window command used wrong target");
  check(calls[1].entity_id === "button.window_stop_all", "Whole-window stop used wrong target");
  await page.getByRole("button", { name: "Roller Shades", exact: true }).click();
  await page.getByRole("button", { name: "Close: Roller Shades", exact: true }).click();
  calls = await page.evaluate(() => window.demo.calls);
  check(calls.at(-1).domain === "cover" && calls.at(-1).entity_id === "cover.window_rollers", "Roller-only command included curtain");
  await page.getByRole("button", { name: "Stop: Roller Shades", exact: true }).click();
  await page.getByRole("button", { name: "Open: Right Roller", exact: true }).click();
  calls = await page.evaluate(() => window.demo.calls);
  check(calls.at(-1).entity_id === "cover.window_right", "Individual command used wrong target");
  await page.getByRole("button", { name: "Stop: Right Roller", exact: true }).click();
  const slider = page.getByRole("slider", { name: "Opening: Right Roller", exact: true });
  const count = await page.evaluate(() => window.demo.calls.length);
  await slider.evaluate((node) => {
    for (const value of [20, 40, 60]) { node.value = value; node.dispatchEvent(new Event("input", { bubbles: true })); }
  });
  check(await page.evaluate(() => window.demo.calls.length) === count, "Slider sent commands before release");
  await slider.evaluate((node) => { node.value = "60"; node.dispatchEvent(new Event("change", { bubbles: true })); });
  calls = await page.evaluate(() => window.demo.calls);
  check(calls.length === count + 1 && calls.at(-1).position === 60, "Slider did not emit exactly one final position");
  await page.getByRole("button", { name: "Stop: Right Roller", exact: true }).click();
  await page.evaluate(() => window.demo.setUnavailable("cover.window_center"));
  check(await page.getByRole("button", { name: "Open: Center Roller", exact: true }).isDisabled(), "Unavailable member enabled");
  check(await page.getByRole("button", { name: "Open: Left Roller", exact: true }).isEnabled(), "Healthy member blocked by offline peer");
  await page.evaluate(() => window.demo.setUnknown("cover.window_left"));
  check(await page.getByRole("slider", { name: "Opening: Left Roller", exact: true }).getAttribute("aria-valuetext") === "Unknown", "Unknown reported as numeric zero");
  await page.evaluate(() => { window.demo.failNext = true; });
  await page.getByRole("button", { name: "Open: Curtain", exact: true }).click();
  check((await page.getByRole("alert").textContent()).includes("Command failed"), "Service failure was swallowed");
  await page.goto("http://127.0.0.1:8768/preview/");
  await page.getByRole("heading", { name: "Wide Window" }).waitFor();
  await page.screenshot({ path: "output/playwright/desktop.png" });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 850 });
    await page.evaluate(() => window.demo.setLanguage("ru"));
    const overflow = await page.evaluate(() => {
      const card = document.querySelector("window-control-card");
      const bounds = card.getBoundingClientRect();
      const nodes = [...card.shadowRoot.querySelectorAll("button,input,.member-name,.status,h2")];
      return nodes.filter((node) => { const r = node.getBoundingClientRect(); return r.left < bounds.left - 1 || r.right > bounds.right + 1; }).map((node) => node.outerHTML);
    });
    check(!overflow.length, `Horizontal overflow at ${width}: ${overflow.join("\n")}`);
    await page.screenshot({ path: `output/playwright/mobile-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 850 });
  await page.evaluate(() => { window.demo.setDark(); window.demo.setUnavailable("cover.window_center"); window.demo.setError("cover.window_right"); });
  await page.screenshot({ path: "output/playwright/dark-errors.png" });
  check(!errors.length, `Browser errors: ${errors.join("; ")}`);
  console.log("PASS: commands, slider release, animation, unavailable/unknown/error states, RU/mobile layouts and dark mode; no browser errors");
}
