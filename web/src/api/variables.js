export const API_BASE = "https://pdf-to-summary-api.moveto.workers.dev"; // 백엔드 주소
export const STORAGE_BASE = "https://pdf-to-summary.moveto.kr"; // R2 공개 URL
export const PDF_TO_JPG_API = "https://pdf-to-jpg.moveto.kr"; // PDF to JPG API 주소

// ==== AI API 선택 기능 ====
const AI_API_OPTIONS = [
  "https://pdf-to-summary-ai-1.moveto.kr",
  "https://pdf-to-summary-ai-2.moveto.kr",
  "https://pdf-to-summary-ai-3.moveto.kr",
  "https://pdf-to-summary-ai-4.moveto.kr",
  "https://pdf-to-summary-ai-5.moveto.kr",
  "https://pdf-to-summary-ai-6.moveto.kr",
  "https://pdf-to-summary-ai-7.moveto.kr",
];

const LS_KEY_AI_INDEX = "pdf_to_summary_ai_api_index";

function readStoredIndex() {
  try {
    const raw = window?.localStorage?.getItem(LS_KEY_AI_INDEX);
    if (raw == null) return null;
    const idx = Number(raw);
    if (Number.isInteger(idx) && idx >= 0 && idx < AI_API_OPTIONS.length) {
      return idx;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredIndex(index) {
  try {
    window?.localStorage?.setItem(LS_KEY_AI_INDEX, String(index));
  } catch {
    // ignore storage errors
  }
}

let currentAiIndex = (() => {
  const stored = readStoredIndex();
  if (stored != null) return stored;
  const randomIndex = Math.floor(Math.random() * AI_API_OPTIONS.length);
  writeStoredIndex(randomIndex);
  return randomIndex;
})();

export function getAiApiOptions() {
  return AI_API_OPTIONS.slice();
}

export function getAiApiIndex() {
  return currentAiIndex;
}

export function setAiApiIndex(index) {
  if (!Number.isInteger(index)) return;
  if (index < 0 || index >= AI_API_OPTIONS.length) return;
  currentAiIndex = index;
  writeStoredIndex(index);
}

export function getAiApi() {
  return AI_API_OPTIONS[currentAiIndex];
}

// 하위 호환: 기존 코드에서 AI_API를 사용 중일 수 있어, 현재 선택된 값으로 노출
export const AI_API = getAiApi();
