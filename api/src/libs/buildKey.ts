/**
 * R2 오브젝트 키 생성 (폴더/날짜/UUID.pdf)
 */
export default function buildKey(filename?: string) {
  const safe = (filename || "upload.pdf").replace(/[^\w.\-]+/g, "_");
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const uuid = crypto.randomUUID();
  const ext = safe.toLowerCase().endsWith(".pdf") ? "" : ".pdf";
  return `uploads/${yyyy}/${mm}/${dd}/${uuid}-${safe}${ext}`;
}
