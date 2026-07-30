/** 把暗号规范化后做 SHA-256，两边输同一句话就能进同一房间 */
export async function hashPassphrase(raw: string): Promise<string> {
  const normalized = raw.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("暗号不能为空");

  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
