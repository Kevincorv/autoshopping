export function formatPYG(value: number): string {
  try {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `Gs. ${(value || 0).toLocaleString("es-PY")}`;
  }
}

export function countPlus(n: number): string {
  if (!n || n <= 0) return "0";
  if (n >= 1000) return Math.floor(n / 1000) * 1000 + "+";
  if (n >= 10) return Math.floor(n / 10) * 10 + "+";
  return String(n);
}

export function pageRange(current: number, total: number, maxVisible = 10): (number | string)[] {
  const pages: (number | string)[] = [];
  if (total <= maxVisible) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, current + half);
  if (current - 1 <= half) { start = 1; end = maxVisible; }
  if (total - current <= half) { start = total - maxVisible + 1; end = total; }
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("…");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total) {
    if (end < total - 1) pages.push("…");
    pages.push(total);
  }
  return pages;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      try {
        fn(...args);
      } catch (e) {
        console.error("debounced fn error", e);
      }
    }, ms);
  }) as T;
}

export function classNames(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(" ");
}

export function safeJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const key = "as_session";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = "s_" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    try {
      window.localStorage.setItem(key, id);
    } catch (_) {}
  }
  return id;
}

export function sanitize(input: string): string {
  return (input || "").replace(/[<>]/g, "").slice(0, 200);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
