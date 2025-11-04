/**
 * 유틸: 이미지 content-type 검증
 */
export default function isValidImageType(
  contentType: string,
  filename: string,
): boolean {
  const imageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

  return (
    imageTypes.some((type) => contentType.toLowerCase().includes(type)) ||
    imageExts.some((ext) => filename.toLowerCase().endsWith(ext))
  );
}
