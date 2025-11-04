/**
 * 유틸: 이미지 키 생성 (폴더/날짜/UUID.확장자)
 */
export default function buildImageKey(filename?: string) {
  const safe = (filename || "upload.jpg").replace(/[^\w.\-]+/g, "_");
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const uuid = crypto.randomUUID();

  // 확장자 추출 (없으면 .jpg 사용)
  const extMatch = safe.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const ext = extMatch ? extMatch[0] : ".jpg";
  const nameWithoutExt = extMatch ? safe.replace(extMatch[0], "") : safe;

  return `images/${yyyy}/${mm}/${dd}/${uuid}-${nameWithoutExt}${ext}`;
}
