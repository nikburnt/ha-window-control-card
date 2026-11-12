export function curtainPanels(position, opening = "center") {
  const closed = typeof position === "number" && Number.isFinite(position) && position >= 0 && position <= 100 ? 100 - position : 0;
  return opening === "right-to-left"
    ? [{ side: "left", width: closed }]
    : [{ side: "left", width: closed / 2 }, { side: "right", width: closed / 2 }];
}
