export const LIB_SQL_SUPPORTED_QUERY_KEYS = new Set(["tls", "authToken", "cache"]);

export function sanitizeLibsqlUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl || !rawUrl.includes("?")) return rawUrl || "";
  const qIdx = rawUrl.indexOf("?");
  const hashIdx = rawUrl.indexOf("#", qIdx);
  const queryEnd = hashIdx === -1 ? rawUrl.length : hashIdx;
  const queryStr = rawUrl.substring(qIdx + 1, queryEnd);
  const tail = hashIdx === -1 ? "" : rawUrl.substring(hashIdx);
  const kept: string[] = [];
  for (const pair of queryStr.split("&")) {
    if (!pair) continue;
    const key = pair.split("=")[0];
    if (LIB_SQL_SUPPORTED_QUERY_KEYS.has(key)) kept.push(pair);
  }
  return kept.length
    ? rawUrl.substring(0, qIdx + 1) + kept.join("&") + tail
    : rawUrl.substring(0, qIdx) + tail;
}
