// The same complement converts HA opening to UI closure and UI closure back to HA.
export function closurePercentage(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? 100 - value : null;
}
