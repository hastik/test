const magnitudes = [
  { value: 1e12, symbol: "T" },
  { value: 1e9, symbol: "B" },
  { value: 1e6, symbol: "M" },
  { value: 1e3, symbol: "k" }
];

export const formatNumber = (value, fractionDigits = 1) => {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  for (const { value: threshold, symbol } of magnitudes) {
    if (abs >= threshold) return `${(value / threshold).toFixed(fractionDigits)}${symbol}`;
  }
  return abs >= 100 ? Math.round(value).toString() : value.toFixed(fractionDigits);
};

export const formatInt = (value) => Math.round(value).toLocaleString();
