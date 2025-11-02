/**
 * 유틸: Content-Type에서 이미지 MIME 타입 추출
 */
export default function getImageContentType(contentType: string, filename: string): string {
    if (contentType.includes("image/")) {
      return contentType;
    }
  
    // 파일명에서 추론
    const lower = filename.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".webp")) return "image/webp";
    return "image/jpeg"; // 기본값
  }