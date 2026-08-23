export function formatUsd(value: number | string, currency = "USD") {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
}

export function formatAmount(value: number | string, decimals = 8) {
  const n = typeof value === "string" ? Number(value) : value;
  const maxDecimals = Math.min(decimals, 8);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: maxDecimals }).format(n);
}

export function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function timeAgo(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let value_ = seconds;
  let unit = "second";
  for (const [amount, name] of units) {
    if (value_ < amount) {
      unit = name;
      break;
    }
    value_ = Math.floor(value_ / amount);
    unit = name;
  }
  if (value_ <= 1 && unit === "second") return "just now";
  return `${value_} ${unit}${value_ !== 1 ? "s" : ""} ago`;
}
