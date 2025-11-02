import { useState, useRef, useCallback, useEffect } from "react";

/** 백엔드 API 베이스 URL
 *  - 같은 도메인 프록시면 ""로 둠
 *  - 별도 도메인이면 .env에서 VITE_API_BASE 설정 (예: https://api.example.com)
 */
const API_BASE = "https://pdf-to-summary-api.moveto.workers.dev";

const STORAGE_BASE = "https://pdf-to-summary.moveto.kr";

/** PDF to JPG 변환 API URL
 *  - PDF를 JPG로 변환하는 외부 API
 */
const PDF_TO_JPG_API = "https://pdf-to-jpg.moveto.kr";

const AI_API = "https://pdf-to-summary-ai.moveto.kr";

// 타임아웃 설정 (밀리초)
const FETCH_TIMEOUT = 1200000; // 20분 (PDF 변환은 시간이 걸릴 수 있음)
const AI_TIMEOUT = 600000; // 10분 (AI 분석)

// 타임아웃이 있는 fetch 함수
const fetchWithTimeout = async (url, options = {}, timeout = FETCH_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`요청 시간 초과 (${timeout / 1000}초)`);
    }
    throw error;
  }
};

function PDFDropzone({
  value = [],
  onFilesChange,
  multiple = true,
  maxSizeMB = 100,
  className = "",
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const openFileDialog = () => inputRef.current?.click();

  const validateAndAdd = useCallback(
    (fileList) => {
      if (!fileList) {
        setError("파일을 선택할 수 없습니다.");
        return;
      }

      const files = Array.from(fileList || []);
      if (files.length === 0) {
        setError("선택된 파일이 없습니다.");
        return;
      }

      const accepted = [];
      const rejected = [];
      const maxBytes = maxSizeMB * 1024 * 1024;

      files.forEach((f) => {
        if (!f || !f.name) {
          rejected.push("유효하지 않은 파일입니다.");
          return;
        }

        const isPdf =
          f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
        const okSize = f.size <= maxBytes;
        
        if (!isPdf) {
          rejected.push(`${f.name}: PDF만 업로드 가능합니다.`);
          return;
        }
        if (!okSize) {
          rejected.push(`${f.name}: ${maxSizeMB}MB를 초과합니다 (현재: ${(f.size / 1024 / 1024).toFixed(2)}MB).`);
          return;
        }
        if (f.size === 0) {
          rejected.push(`${f.name}: 파일이 비어있습니다.`);
          return;
        }
        
        accepted.push(f);
      });

      let newFiles = multiple ? [...(Array.isArray(value) ? value : []), ...accepted] : accepted.slice(0, 1);

      // 중복 제거 (name + size + lastModified)
      const seen = new Set();
      newFiles = newFiles.filter((f) => {
        if (!f || !f.name) return false;
        const key = `${f.name}|${f.size}|${f.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (typeof onFilesChange === 'function') {
        onFilesChange(newFiles);
      }
      
      setError(rejected.length > 0 ? rejected.join("\n") : "");
    },
    [value, onFilesChange, multiple, maxSizeMB],
  );

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      validateAndAdd(e.dataTransfer.files);
    }
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e) => {
    if (e.currentTarget === e.target) setIsDragging(false);
  };

  const onChange = (e) => {
    if (e?.target?.files?.length) {
      validateAndAdd(e.target.files);
      e.target.value = ""; // 같은 파일 다시 선택 가능하게 초기화
    }
  };

  const removeAt = (idx) => {
    if (typeof onFilesChange === 'function' && Array.isArray(value)) {
      onFilesChange(value.filter((_, i) => i !== idx));
    }
  };
  
  const clearAll = () => {
    if (typeof onFilesChange === 'function') {
      onFilesChange([]);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        role="button"
        tabIndex={0}
        aria-label="PDF 업로드 드래그 앤 드롭 영역"
        onClick={openFileDialog}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openFileDialog();
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all select-none cursor-pointer outline-none
          ${
            isDragging
              ? "border-sky-600 bg-sky-50 ring-4 ring-sky-100"
              : "border-neutral-300 hover:border-sky-400 bg-neutral-50"
          }
        `}
      >
        {/* 간단한 업로드 아이콘 (inline SVG) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-10 h-10 text-sky-700"
        >
          <path d="M12 16a1 1 0 0 1-1-1V9.41l-1.3 1.3a1 1 0 1 1-1.4-1.42l3-3a1 1 0 0 1 1.4 0l3 3a1 1 0 1 1-1.4 1.42L13 9.4V15a1 1 0 0 1-1 1Zm-7 3a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h2a1 1 0 1 1 0 2H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2a1 1 0 1 1 0-2h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H5Z" />
        </svg>
        <p className="mt-2 text-sm text-neutral-700">
          PDF 파일을 드래그 앤 드롭하거나{" "}
          <span className="text-sky-700 underline">클릭하여 선택</span>
        </p>
        <p className="text-xs text-neutral-500">
          최대 {maxSizeMB}MB · {multiple ? "여러 개 선택 가능" : "1개만 선택"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple={multiple}
          className="hidden"
          onChange={onChange}
        />
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded-md whitespace-pre-wrap">
          {error}
        </div>
      )}

      {Array.isArray(value) && value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">선택된 파일 ({value.length})</h3>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs px-2 py-1 rounded-md bg-neutral-200 hover:bg-neutral-300"
            >
              모두 제거
            </button>
          </div>
          <ul className="space-y-2">
            {value.map((f, idx) => {
              if (!f || !f.name) return null;
              
              return (
                <li
                  key={`file-${f.name}-${f.lastModified}-${idx}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white ring-1 ring-neutral-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-neutral-500">
                      {((f.size || 0) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="px-2 py-1 rounded-md text-xs bg-red-600 text-white hover:bg-red-700"
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function App() {
  const [tok, setTok] = useState([]); // { prompt: string, withImage: boolean }[]
  const [pdfs, setPdfs] = useState([]); // 드롭존에서 선택된 PDF 목록
  const composingRef = useRef(false);
  const [withImage, setWithImage] = useState(true); // 이미지 포함 여부 (기본값: true)

  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [converting, setConverting] = useState(false);
  const [convertResults, setConvertResults] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0, step: 0, totalSteps: 0 });
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false); // 초기 로드 플래그
  const [isSavingPrompts, setIsSavingPrompts] = useState(false); // 프롬프트 저장 중 플래그

  const handleSubmit = (e) => {
    try {
      e?.preventDefault();
      
      if (!e?.currentTarget) {
        console.error("폼 요소를 찾을 수 없습니다");
        return;
      }
      
      const fd = new FormData(e.currentTarget);
      const text = (fd.get("tok") || "").toString().trim();
      
      if (!text) {
        e.currentTarget.reset();
        return;
      }
      
      setTok((prev) => {
        const newTok = { prompt: text, withImage: Boolean(withImage) };
        return Array.isArray(prev) ? [...prev, newTok] : [newTok];
      });
      
      e.currentTarget.reset();
    } catch (err) {
      console.error("프롬프트 추가 오류:", err);
      alert("프롬프트를 추가하는 중 오류가 발생했습니다.");
    }
  };

  const handleKeyDown = (e) => {
    if (e?.key === "Enter" && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      e.currentTarget?.form?.requestSubmit();
    }
  };

  const handleRemove = (idxToRemove) => {
    if (typeof idxToRemove !== 'number' || idxToRemove < 0) {
      console.error("유효하지 않은 인덱스:", idxToRemove);
      return;
    }
    
    setTok((prev) => {
      if (!Array.isArray(prev)) return [];
      return prev.filter((_, idx) => idx !== idxToRemove);
    });
  };

  // 프롬프트를 API에 저장하는 함수
  const savePrompts = useCallback(async (promptItems) => {
    setIsSavingPrompts(true);
    
    try {
      if (!promptItems || !Array.isArray(promptItems) || promptItems.length === 0) {
        // 빈 배열인 경우에도 저장 (전체 삭제)
        try {
          await fetch(`${API_BASE}/prompts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompts: [] }),
          });
        } catch (err) {
          console.error("프롬프트 저장 실패 (빈 배열):", err);
        } finally {
          setIsSavingPrompts(false);
        }
        return;
      }

      // 전체 프롬프트 객체를 정제하여 저장 (withImage 정보 포함)
      const promptsToSave = promptItems
        .map(item => {
          if (!item) return null;
          
          // 문자열인 경우
          if (typeof item === 'string') {
            const trimmed = item.trim();
            if (!trimmed) return null;
            return { prompt: trimmed, withImage: true };
          }
          
          // 객체인 경우
          if (typeof item === 'object' && 'prompt' in item) {
            const promptText = String(item.prompt || "").trim();
            if (!promptText) return null;
            return {
              prompt: promptText,
              withImage: Boolean(item.withImage ?? true),
            };
          }
          
          return null;
        })
        .filter((p) => p !== null);

      console.log(`💾 프롬프트 저장 중... (${promptsToSave.length}개)`);
      console.log(`저장할 프롬프트:`, promptsToSave);
      
      const resp = await fetch(`${API_BASE}/prompts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompts: promptsToSave }),
      });

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "알 수 없는 오류");
        console.error("프롬프트 저장 실패:", resp.status, errorText);
        return;
      }

      const result = await resp.json().catch(() => null);
      if (result?.ok) {
        console.log(`✅ 프롬프트 저장 완료: ${result.saved}개 저장됨`);
      }
    } catch (err) {
      console.error("프롬프트 저장 중 오류:", err);
      // 저장 실패해도 사용자 경험에 영향 없도록 조용히 처리
    } finally {
      setIsSavingPrompts(false);
    }
  }, []);

  // 저장된 프롬프트를 불러오는 함수
  const loadPrompts = useCallback(async () => {
    try {
      setIsLoadingPrompts(true);
      console.log("📥 저장된 프롬프트 불러오는 중...");
      
      const resp = await fetch(`${API_BASE}/prompts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "알 수 없는 오류");
        console.warn("프롬프트 불러오기 실패:", resp.status, errorText);
        setIsLoadingPrompts(false);
        return;
      }

      const result = await resp.json().catch(() => null);
      if (result?.ok && Array.isArray(result.prompts)) {
        const loadedPrompts = result.prompts
          .map((p) => {
            // 문자열 형식 (하위 호환성)
            if (typeof p === 'string') {
              const trimmed = p.trim();
              return trimmed ? { prompt: trimmed, withImage: true } : null;
            }
            
            // 객체 형식: { prompt: string, withImage: boolean }
            if (p && typeof p === 'object' && 'prompt' in p) {
              const promptText = String(p.prompt || "").trim();
              if (!promptText) return null;
              
              return {
                prompt: promptText,
                withImage: Boolean(p.withImage ?? true),
              };
            }
            
            return null;
          })
          .filter((p) => p !== null);
        
        if (loadedPrompts.length > 0) {
          console.log(`✅ 프롬프트 ${loadedPrompts.length}개 불러옴`);
          console.log(`불러온 프롬프트:`, loadedPrompts);
          setTok(loadedPrompts);
        } else {
          console.log("📭 저장된 프롬프트 없음");
        }
      }
    } catch (err) {
      console.error("프롬프트 불러오기 중 오류:", err);
    } finally {
      setIsLoadingPrompts(false);
    }
  }, []);

  // 컴포넌트 마운트 시 프롬프트 불러오기
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // 프롬프트가 변경될 때마다 자동 저장 (debounce 적용)
  useEffect(() => {
    // 초기 로드 중이거나 tok가 배열이 아니면 저장하지 않음
    if (isLoadingPrompts || !Array.isArray(tok)) return;

    // 디바운스: 500ms 후에 저장 (빠른 입력 시 여러 번 저장 방지)
    const timeoutId = setTimeout(() => {
      savePrompts(tok);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [tok, savePrompts, isLoadingPrompts]);

  // 단일 파일을 R2로 업로드 (PUT /upload/:filename)
  const uploadOneToR2 = async (file) => {
    if (!file || !(file instanceof File)) {
      return {
        ok: false,
        error: "유효하지 않은 파일입니다.",
        filename: file?.name || "unknown",
      };
    }

    const url = `${API_BASE}/upload/${encodeURIComponent(file.name)}`;
    try {
      console.log(`📤 업로드 시작: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      const resp = await fetchWithTimeout(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/pdf",
        },
        body: file,
      }, 180000); // PDF 업로드는 3분 타임아웃

      let json = {};
      try {
        const text = await resp.text();
        if (text) {
          json = JSON.parse(text);
        }
      } catch (parseErr) {
        console.error("JSON 파싱 실패:", parseErr);
        if (!resp.ok) {
          return {
            ok: false,
            error: `업로드 실패 (${resp.status}): 응답을 읽을 수 없습니다.`,
            filename: file.name,
          };
        }
      }

      if (!resp.ok || !json?.ok) {
        return {
          ok: false,
          error: json?.error || `업로드 실패 (${resp.status}${resp.statusText ? ': ' + resp.statusText : ''})`,
          filename: file.name,
        };
      }

      return {
        ok: true,
        key: json.key,
        size: json.size ?? null,
        etag: json.etag ?? null,
        filename: file.name,
      };
    } catch (err) {
      console.error(`업로드 오류 (${file.name}):`, err);
      let errorMessage = "네트워크 오류";
      
      if (err.message?.includes("시간 초과")) {
        errorMessage = "업로드 시간 초과 - 파일이 너무 크거나 네트워크가 느립니다.";
      } else if (err.message?.includes("Failed to fetch")) {
        errorMessage = "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      return {
        ok: false,
        error: errorMessage,
        filename: file.name,
      };
    }
  };

  // PDF를 JPG로 변환하는 함수
  const convertPdfToJpg = async (pdfKey, filename) => {
    if (!pdfKey || typeof pdfKey !== 'string') {
      return {
        ok: false,
        error: "유효하지 않은 PDF 키입니다.",
        filename,
        pdfKey,
      };
    }

    try {
      // PDF URL 생성 (R2에서 직접 접근 가능한 URL)
      const pdfUrl = `${STORAGE_BASE}/${pdfKey}`;
      
      // 이미지 업로드 URL (PUT 방식)
      const uploadUrl = `${API_BASE}/upload-image`;

      console.log(`🔄 PDF → JPG 변환 시작: ${filename}`);
      console.log(`PDF URL: ${pdfUrl}`);

      // PDF to JPG API 호출
      const resp = await fetchWithTimeout(`${PDF_TO_JPG_API}/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfUrl,
          uploadUrl,
        }),
      }, 180000); // PDF 변환은 3분 타임아웃

      let json = {};
      try {
        const text = await resp.text();
        if (text) {
          json = JSON.parse(text);
        }
      } catch (parseErr) {
        console.error("JSON 파싱 실패:", parseErr);
        return {
          ok: false,
          error: `변환 API 응답을 읽을 수 없습니다 (${resp.status})`,
          filename,
          pdfKey,
        };
      }

      if (!resp.ok) {
        return {
          ok: false,
          error: json?.error || json?.message || `변환 실패 (${resp.status}${resp.statusText ? ': ' + resp.statusText : ''})`,
          filename,
          pdfKey,
        };
      }

      // 응답 검증
      if (!json.results || !Array.isArray(json.results)) {
        return {
          ok: false,
          error: "변환 API 응답 형식이 올바르지 않습니다.",
          filename,
          pdfKey,
        };
      }

      // 업로드된 이미지 URL들을 추출
      console.log('\n📸 이미지 URL 추출 시작...');
      console.log('PDF to JPG API 응답:', json);
      
      const imageUrls = [];
      if (json.results && Array.isArray(json.results)) {
        for (const result of json.results) {
          console.log(`\n페이지 ${result.page || '?'} 처리:`, result);
          
          if (result.status === 'success') {
            // PDF to JPG API가 반환한 응답 객체에서 URL 추출
            let imageUrl = null;
            
            // 응답 객체에 response가 있고 그 안에 url이 있는 경우
            if (result.response && result.response.url) {
              imageUrl = result.response.url;
              console.log(`  ✓ response.url 사용: ${imageUrl}`);
            }
            // 직접 url 필드가 있는 경우
            else if (result.url) {
              imageUrl = result.url;
              console.log(`  ✓ url 사용: ${imageUrl}`);
            }
            // response 객체에 key가 있는 경우
            else if (result.response && result.response.key) {
              imageUrl = `${STORAGE_BASE}/${result.response.key}`;
              console.log(`  ✓ response.key 사용: ${result.response.key} → ${imageUrl}`);
            }
            // 직접 key 필드가 있는 경우
            else if (result.key) {
              imageUrl = `${STORAGE_BASE}/${result.key}`;
              console.log(`  ✓ key 사용: ${result.key} → ${imageUrl}`);
            }
            // imageKey 필드가 있는 경우
            else if (result.imageKey) {
              imageUrl = `${STORAGE_BASE}/${result.imageKey}`;
              console.log(`  ✓ imageKey 사용: ${result.imageKey} → ${imageUrl}`);
            }
            
            if (imageUrl) {
              imageUrls.push(imageUrl);
              console.log(`  ✅ 추가됨: ${imageUrl}`);
            } else {
              console.warn('  ⚠️ 이미지 URL을 찾을 수 없음:', result);
            }
          } else {
            console.warn(`  ❌ 상태가 success가 아님: ${result.status}`);
          }
        }
      }
      
      console.log(`\n✅ 총 ${imageUrls.length}개 이미지 URL 추출 완료`);
      console.log('📋 최종 이미지 URLs:');
      imageUrls.forEach((url, idx) => {
        console.log(`  ${idx + 1}. ${url}`);
      });

      // 이미지가 하나도 추출되지 않은 경우 경고
      if (imageUrls.length === 0) {
        console.warn('⚠️ 이미지가 하나도 추출되지 않았습니다!');
        return {
          ok: false,
          error: "변환은 완료되었지만 이미지 URL을 추출할 수 없습니다.",
          filename,
          pdfKey,
        };
      }

      return {
        ok: true,
        filename,
        pdfKey,
        totalPages: json.totalPages || imageUrls.length,
        uploaded: json.uploaded || imageUrls.length,
        failed: json.failed || 0,
        results: json.results,
        imageUrls, // 추가: 이미지 URL 배열
      };
    } catch (err) {
      console.error(`PDF 변환 오류 (${filename}):`, err);
      
      let errorMessage = "네트워크 오류";
      if (err.message?.includes("시간 초과")) {
        errorMessage = "PDF 변환 시간 초과 - PDF 파일이 너무 크거나 복잡합니다.";
      } else if (err.message?.includes("Failed to fetch")) {
        errorMessage = "변환 서버에 연결할 수 없습니다. 네트워크를 확인해주세요.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      return {
        ok: false,
        error: errorMessage,
        filename,
        pdfKey,
      };
    }
  };

  // 이미지 URL 검증 함수
  const validateImageUrl = (imageUrl) => {
    try {
      new URL(imageUrl);
      return true;
    } catch {
      return false;
    }
  };

  // AI 분석 함수 (Chain-of-Thought)
  const analyzeWithAI = async (imageUrls, promptItems) => {
    // promptItems: [{ prompt: string, withImage: boolean }, ...]
    
    if (!promptItems || promptItems.length === 0) {
      return {
        ok: false,
        error: "프롬프트가 없습니다.",
      };
    }

    // 이미지가 필요한 프롬프트가 있는지 확인
    const needsImage = promptItems.some(p => p.withImage);
    if (needsImage && (!imageUrls || imageUrls.length === 0)) {
      return {
        ok: false,
        error: "이미지가 필요한 프롬프트가 있지만 이미지가 없습니다.",
      };
    }

    console.log(`=== AI 분석 시작 ===`);
    console.log(`총 ${imageUrls?.length || 0}개 이미지 분석 예정`);
    console.log(`Chain-of-Thought 단계: ${promptItems.length}개`);
    console.log(`프롬프트:`, promptItems);

    try {
      const results = [];
      
      // 이미지 URL이 없는 경우 (텍스트만 처리)
      const processImageUrls = imageUrls && imageUrls.length > 0 ? imageUrls : [null];
      
      // 각 이미지에 대해 분석 수행 (이미지가 없으면 1회만 실행)
      for (let imgIdx = 0; imgIdx < processImageUrls.length; imgIdx++) {
        // 진행 상황 업데이트
        setAnalysisProgress({
          current: imgIdx + 1,
          total: processImageUrls.length,
          step: 0,
          totalSteps: promptItems.length,
        });
        const imageUrl = processImageUrls[imgIdx];
        
        if (imageUrl) {
          console.log(`\n[페이지 ${imgIdx + 1}/${processImageUrls.length}] 분석 시작`);
          console.log(`이미지 URL: ${imageUrl}`);
        } else {
          console.log(`\n[텍스트 전용 분석] 시작`);
        }
        
        const pageResults = [];
        
        try {
          // 이미지 URL 검증 (이미지가 있는 경우에만)
          if (imageUrl && !validateImageUrl(imageUrl)) {
            throw new Error(`유효하지 않은 이미지 URL: ${imageUrl}`);
          }
          if (imageUrl) {
            console.log(`이미지 URL 검증 완료: ${imageUrl}`);
          }
          
          // Chain-of-Thought: 각 프롬프트를 순차적으로 실행
          let previousResponse = "";
          
          for (let promptIdx = 0; promptIdx < promptItems.length; promptIdx++) {
            // 진행 상황 업데이트 (Step)
            setAnalysisProgress(prev => ({
              ...prev,
              step: promptIdx + 1,
            }));
            
            const promptItem = promptItems[promptIdx];
            const { prompt, withImage: needsImage } = promptItem;
            
            console.log(`\n  [Step ${promptIdx + 1}/${promptItems.length}] 실행 중...`);
            console.log(`  프롬프트: ${prompt}`);
            console.log(`  이미지 필요: ${needsImage ? 'Yes' : 'No'}`);
            
            // 이전 응답이 있으면 프롬프트에 포함
            const enhancedPrompt = previousResponse
              ? `이전 분석 결과:\n${previousResponse}\n\n새로운 지시사항:\n${prompt}`
              : prompt;
            
            if (previousResponse) {
              console.log(`  이전 결과 포함됨 (${previousResponse.length}자)`);
            }
            
            // 엔드포인트 및 요청 데이터 결정
            let endpoint;
            let requestBody;
            
            if (needsImage && imageUrl) {
              // 이미지와 함께 요청 (ImageUrlRequest)
              endpoint = `${AI_API}/api/generate`;
              requestBody = {
                image_url: imageUrl,
                prompt: enhancedPrompt,
                temperature: 0.7,
                max_tokens: 2000,
              };
              console.log(`  엔드포인트: /api/generate (이미지 포함)`);
            } else {
              // 텍스트만 요청 (TextPromptRequest)
              endpoint = `${AI_API}/api/generate/text`;
              requestBody = {
                prompt: enhancedPrompt,
                temperature: 0.7,
                max_tokens: 2000,
              };
              console.log(`  엔드포인트: /api/generate/text (텍스트 전용)`);
            }
            
            console.log(`  요청 데이터:`, requestBody);
            
            // AI API 호출
            try {
              const resp = await fetchWithTimeout(endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
              }, AI_TIMEOUT);
              
              console.log(`  API 응답 상태: ${resp.status} ${resp.statusText}`);
              
              if (!resp.ok) {
                let errorText = "";
                let errorDetail = "";
                
                try {
                  const text = await resp.text();
                  if (text) {
                    try {
                      const errorJson = JSON.parse(text);
                      errorText = errorJson.error || errorJson.message || errorJson.detail || text;
                      errorDetail = JSON.stringify(errorJson);
                      console.error(`  API 오류 (JSON):`, errorJson);
                    } catch {
                      errorText = text.substring(0, 200);
                      console.error(`  API 오류 (Text):`, text);
                    }
                  }
                } catch (readErr) {
                  console.error(`  응답 읽기 실패:`, readErr);
                  errorText = "응답을 읽을 수 없습니다";
                }
                
                pageResults.push({
                  step: promptIdx + 1,
                  prompt,
                  withImage: needsImage,
                  success: false,
                  error: `API 오류 (${resp.status}): ${errorText}`,
                });
                break; // 에러 발생 시 다음 프롬프트 실행 중단
              }
              
              // 응답 파싱
              let aiResponse;
              try {
                const text = await resp.text();
                if (!text) {
                  throw new Error("AI 응답이 비어있습니다");
                }
                aiResponse = JSON.parse(text);
              } catch (parseErr) {
                console.error(`  JSON 파싱 오류:`, parseErr);
                pageResults.push({
                  step: promptIdx + 1,
                  prompt,
                  withImage: needsImage,
                  success: false,
                  error: "AI 응답 형식이 올바르지 않습니다",
                });
                break;
              }
              console.log(`  AI 응답 전체:`, aiResponse);
              
              // 다양한 응답 형식 지원
              let responseText = "";
              if (typeof aiResponse === 'string') {
                // 직접 문자열인 경우
                responseText = aiResponse;
              } else if (aiResponse.response) {
                // { response: "텍스트" }
                responseText = aiResponse.response;
              } else if (aiResponse.text) {
                // { text: "텍스트" }
                responseText = aiResponse.text;
              } else if (aiResponse.result) {
                // { result: "텍스트" }
                responseText = aiResponse.result;
              } else if (aiResponse.output) {
                // { output: "텍스트" }
                responseText = aiResponse.output;
              } else if (aiResponse.data) {
                // { data: "텍스트" } 또는 { data: { ... } }
                responseText = typeof aiResponse.data === 'string' 
                  ? aiResponse.data 
                  : JSON.stringify(aiResponse.data);
              } else {
                // 알 수 없는 형식 - 전체를 문자열로 변환
                responseText = JSON.stringify(aiResponse);
                console.warn(`  예상치 못한 응답 형식, 전체를 문자열로 변환:`, aiResponse);
              }
              
              previousResponse = responseText;
              console.log(`  추출된 응답: ${previousResponse.substring(0, 100)}... (총 ${previousResponse.length}자)`);
              
              if (!previousResponse) {
                throw new Error("AI 응답이 비어있습니다.");
              }
              
              pageResults.push({
                step: promptIdx + 1,
                prompt,
                withImage: needsImage,
                success: true,
                response: previousResponse,
              });
              
            } catch (apiErr) {
              console.error(`  API 호출 실패:`, apiErr);
              
              let errorMessage = "API 호출 실패";
              if (apiErr.message?.includes("시간 초과")) {
                errorMessage = "AI 분석 시간 초과 - 응답을 기다리는 중 시간이 초과되었습니다.";
              } else if (apiErr.message?.includes("Failed to fetch")) {
                errorMessage = "AI 서버에 연결할 수 없습니다. 네트워크를 확인해주세요.";
              } else if (apiErr.message) {
                errorMessage = apiErr.message;
              }
              
              pageResults.push({
                step: promptIdx + 1,
                prompt,
                withImage: needsImage,
                success: false,
                error: errorMessage,
              });
              break;
            }
          }
          
          results.push({
            page: imgIdx + 1,
            imageUrl,
            steps: pageResults,
          });
          
          console.log(`[페이지 ${imgIdx + 1}] 분석 완료 (${pageResults.length}/${promptItems.length} 단계 성공)`);
          
        } catch (imgErr) {
          console.error(`[페이지 ${imgIdx + 1}] 이미지 처리 실패:`, imgErr);
          results.push({
            page: imgIdx + 1,
            imageUrl,
            steps: [{
              step: 1,
              prompt: promptItems[0].prompt,
              withImage: promptItems[0].withImage,
              success: false,
              error: `이미지 처리 실패: ${imgErr.message}`,
            }],
          });
        }
      }
      
      console.log(`\n=== AI 분석 완료 ===`);
      console.log(`총 ${results.length}개 페이지 분석됨`);
      
      return {
        ok: true,
        results,
      };
    } catch (err) {
      console.error(`AI 분석 중 전체 오류:`, err);
      return {
        ok: false,
        error: err?.message || "AI 분석 중 오류 발생",
      };
    }
  };

  // 전체 결과를 텍스트로 변환하여 클립보드에 복사
  const copyAllResults = async () => {
    if (!analysisResults || analysisResults.length === 0) {
      alert("복사할 분석 결과가 없습니다.");
      return;
    }

    try {
      let textContent = "# PDF AI 분석 결과\n\n";
      textContent += `분석 일시: ${new Date().toLocaleString('ko-KR')}\n`;
      textContent += `총 ${analysisResults.length}개 파일 분석\n`;
      textContent += "=".repeat(80) + "\n\n";

      for (const result of analysisResults) {
        if (!result) continue;
        
        textContent += `## 📄 ${result.filename || "파일"}\n`;
        textContent += `상태: ${result.ok ? "✅ 분석 완료" : "❌ 분석 실패"}\n\n`;

        if (result.ok && result.results && Array.isArray(result.results)) {
          for (const pageResult of result.results) {
            if (!pageResult) continue;
            
            textContent += `### 📖 페이지 ${pageResult.page || "?"}\n\n`;

            if (pageResult.steps && Array.isArray(pageResult.steps) && pageResult.steps.length > 0) {
              for (const step of pageResult.steps) {
                if (!step) continue;
                
                const typeLabel = step.withImage ? "🖼️ 이미지" : "📝 텍스트";
                textContent += `#### Step ${step.step || "?"} [${typeLabel}]: ${step.prompt || ""}\n\n`;
                
                if (step.success) {
                  textContent += `${step.response || "(응답 없음)"}\n\n`;
                } else {
                  textContent += `❌ 오류: ${step.error || "알 수 없는 오류"}\n\n`;
                }
                
                textContent += "-".repeat(60) + "\n\n";
              }
            }
          }
        } else if (!result.ok) {
          textContent += `오류: ${result.error || "알 수 없는 오류"}\n\n`;
        }

        textContent += "=".repeat(80) + "\n\n";
      }

      // 클립보드에 복사
      try {
        if (!navigator.clipboard) {
          throw new Error("클립보드 API를 사용할 수 없습니다");
        }
        await navigator.clipboard.writeText(textContent);
        alert("✅ 전체 결과가 클립보드에 복사되었습니다!");
      } catch (clipboardErr) {
        console.error("클립보드 복사 실패:", clipboardErr);
        
        // Fallback: 텍스트 영역 생성하여 복사
        try {
          const textarea = document.createElement('textarea');
          textarea.value = textContent;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);
          
          if (successful) {
            alert("✅ 전체 결과가 클립보드에 복사되었습니다!");
          } else {
            throw new Error("execCommand 실패");
          }
        } catch (fallbackErr) {
          console.error("Fallback 복사도 실패:", fallbackErr);
          alert("❌ 복사에 실패했습니다. 콘솔에서 내용을 확인해주세요.");
          console.log("=== 복사할 내용 ===");
          console.log(textContent);
        }
      }
    } catch (err) {
      console.error("결과 생성 오류:", err);
      alert(`결과를 생성하는 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  // 여러 PDF 업로드 후 결과 상태 반영 (AI 분석 버튼)
  const handleAnalyze = async () => {
    if (!pdfs || pdfs.length === 0) {
      alert("업로드할 PDF 파일을 선택해주세요.");
      return;
    }
    
    if (uploading || converting || analyzing) {
      console.warn("이미 작업이 진행 중입니다.");
      return;
    }
    
    // Chain-of-Thought 프롬프트 확인
    if (!tok || tok.length === 0) {
      alert("분석할 프롬프트를 추가해주세요.");
      return;
    }
    
    console.log(`\n${"=".repeat(60)}`);
    console.log(`PDF 분석 프로세스 시작`);
    console.log(`PDF 파일 수: ${pdfs.length}`);
    console.log(`프롬프트 단계: ${tok.length}개`);
    console.log(`${"=".repeat(60)}\n`);
    
    try {
      // 1단계: PDF 업로드
      console.log(`📤 [1/3] PDF 업로드 시작...`);
      setUploading(true);
      setUploadResults([]);
      setConvertResults([]);
      setAnalysisResults([]);
      setAnalysisProgress({ current: 0, total: 0, step: 0, totalSteps: 0 });

      const uploadResultsList = await Promise.all(
        pdfs.map(pdf => uploadOneToR2(pdf).catch(err => ({
          ok: false,
          error: `예외 발생: ${err.message}`,
          filename: pdf?.name || "unknown",
        })))
      );
      
      setUploadResults(uploadResultsList);
      setUploading(false);

      // 업로드 성공한 항목만 필터링
      const successfulUploads = uploadResultsList.filter(r => r && r.ok && r.key);
      console.log(`✅ PDF 업로드 완료: ${successfulUploads.length}/${uploadResultsList.length} 성공`);

      if (successfulUploads.length === 0) {
        alert("업로드된 PDF가 없습니다. 업로드 결과를 확인해주세요.");
        return;
      }

      // 2단계: PDF를 JPG로 변환
      console.log(`\n🖼️  [2/3] PDF → JPG 변환 시작...`);
      setConverting(true);
      
      const conversionResults = await Promise.all(
        successfulUploads.map(item => 
          convertPdfToJpg(item.key, item.filename).catch(err => ({
            ok: false,
            error: `예외 발생: ${err.message}`,
            filename: item.filename,
            pdfKey: item.key,
          }))
        )
      );
      
      setConvertResults(conversionResults);
      setConverting(false);

      // 변환 성공한 항목만 필터링
      const successfulConversions = conversionResults.filter(
        r => r && r.ok && r.imageUrls && Array.isArray(r.imageUrls) && r.imageUrls.length > 0
      );
      
      const totalImages = successfulConversions.reduce((sum, r) => sum + (r.imageUrls?.length || 0), 0);
      console.log(`✅ JPG 변환 완료: ${successfulConversions.length}/${conversionResults.length} 파일 성공`);
      console.log(`   총 ${totalImages}개 이미지 생성됨`);

      if (successfulConversions.length === 0) {
        alert("JPG로 변환된 이미지가 없습니다. 변환 결과를 확인해주세요.");
        return;
      }

      // 3단계: AI 분석 수행
      console.log(`\n🤖 [3/3] AI 분석 시작...`);
      console.log(`분석할 파일: ${successfulConversions.length}개`);
      console.log(`분석할 이미지: ${totalImages}개`);
      setAnalyzing(true);
      const aiResults = [];

      console.log("변환된 파일 정보:", successfulConversions);

      for (const conversion of successfulConversions) {
        if (!conversion || !conversion.imageUrls) {
          console.error("유효하지 않은 변환 결과:", conversion);
          aiResults.push({
            filename: conversion?.filename || "unknown",
            pdfKey: conversion?.pdfKey || "",
            ok: false,
            error: "유효하지 않은 변환 결과입니다.",
          });
          continue;
        }
        
        console.log(`\n--- 파일: ${conversion.filename} (${conversion.imageUrls.length}개 페이지) ---`);
        
        try {
          const analysisResult = await analyzeWithAI(conversion.imageUrls, tok);
          aiResults.push({
            filename: conversion.filename,
            pdfKey: conversion.pdfKey,
            ...analysisResult,
          });
        } catch (analysisErr) {
          console.error(`분석 중 예외 발생 (${conversion.filename}):`, analysisErr);
          aiResults.push({
            filename: conversion.filename,
            pdfKey: conversion.pdfKey,
            ok: false,
            error: `예외 발생: ${analysisErr.message || "알 수 없는 오류"}`,
          });
        }
      }

      setAnalysisResults(aiResults);
      setAnalyzing(false);
      
      console.log(`\n${"=".repeat(60)}`);
      console.log(`✅ 전체 프로세스 완료!`);
      console.log(`${"=".repeat(60)}\n`);
      
    } catch (globalErr) {
      console.error("전체 프로세스 오류:", globalErr);
      alert(`오류가 발생했습니다: ${globalErr.message}`);
      
      // 상태 초기화
      setUploading(false);
      setConverting(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-8 bg-neutral-100">
      <div className="bg-neutral-50 p-8 rounded-xl w-full max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">PDF to Summary</h1>

        <section>
          <h2 className="text-lg font-semibold">Chain-of-Thought</h2>
          <p>LLM 모델이 순차적으로 실행할 명령어를 정의합니다.</p>
          <p>
            ex. 내용 요약해줘 ➡️ 수업 내용 중 중요한 부분 퀴즈로 만들어줘 ➡️
            퀴즈 정답 작성해줘
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            name="tok"
            onKeyDown={handleKeyDown}
            onCompositionStart={() => (composingRef.current = true)}
            onCompositionEnd={() => (composingRef.current = false)}
            rows={4}
            placeholder="내용 입력 후 Enter로 추가, Shift+Enter로 줄바꿈"
            className="w-full p-3 rounded-lg focus:outline-none focus:ring-offset-2 ring-2 ring-sky-500 transition-all"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withImage}
                onChange={(e) => setWithImage(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-sm font-medium text-neutral-700">
                🖼️ 이미지와 함께 분석
              </span>
            </label>
          </div>
          <button
            type="submit"
            onMouseDown={(e) => {
              if (composingRef.current) {
                e.preventDefault();
                e.currentTarget.form
                  ?.querySelector('textarea[name="tok"]')
                  ?.blur();
                requestAnimationFrame(() =>
                  e.currentTarget.form?.requestSubmit(),
                );
              }
            }}
            className="w-full p-1 px-2 rounded-lg bg-sky-600 text-neutral-50"
          >
            추가
          </button>
        </form>

        <ul className="space-y-2 list-decimal">
          {Array.isArray(tok) && tok.map((item, idx) => {
            if (!item) return null;
            
            // item이 문자열인 경우와 객체인 경우 모두 처리
            const promptText = typeof item === 'string' 
              ? item.trim() 
              : (item && typeof item === 'object' && 'prompt' in item 
                  ? String(item.prompt || "").trim() 
                  : String(item || "").trim());
            
            const withImage = typeof item === 'string'
              ? true // 기본값
              : (item && typeof item === 'object' && 'withImage' in item
                  ? Boolean(item.withImage)
                  : true); // 기본값
            
            if (!promptText) return null;
            
            return (
              <li
                key={`prompt-${idx}`}
                className="flex items-center justify-between gap-3 p-3 rounded-lg ring-2 ring-sky-800 bg-white"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="whitespace-pre-wrap break-words font-semibold">
                      {idx + 1}. {promptText}
                    </span>
                    {withImage ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        🖼️ 이미지
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        📝 텍스트
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  disabled={isSavingPrompts}
                  className={`px-2 py-1 rounded-md text-xs ${
                    isSavingPrompts
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                  aria-label={`ToK ${idx + 1} 삭제`}
                >
                  삭제
                </button>
              </li>
            );
          })}
        </ul>

        {/* 드래그 앤 드롭 영역 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">PDF 업로드</h2>
          <PDFDropzone
            value={pdfs}
            onFilesChange={setPdfs}
            multiple={true}
            maxSizeMB={100}
          />

          {/* 업로드/분석 버튼 */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!pdfs.length || uploading || converting || analyzing}
              className={`w-full px-4 py-2 rounded-lg text-white ${
                !pdfs.length || uploading || converting || analyzing
                  ? "bg-neutral-300 cursor-not-allowed"
                  : "bg-sky-600 hover:bg-sky-700"
              }`}
            >
              {uploading 
                ? "업로드 중..." 
                : converting 
                ? "JPG 변환 중..." 
                : analyzing
                ? "AI 분석 중..."
                : "AI 분석"}
            </button>
            
            {/* 진행 상황 표시 */}
            {analyzing && analysisProgress && analysisProgress.total > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-purple-900 mb-1">
                  📊 페이지 {analysisProgress.current || 0}/{analysisProgress.total || 0} 분석 중
                </p>
                <p className="text-xs text-purple-700">
                  Step {analysisProgress.step || 0}/{analysisProgress.totalSteps || 0} 실행 중...
                </p>
                <div className="mt-2 bg-purple-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-purple-600 h-full transition-all duration-300"
                    style={{ 
                      width: `${
                        analysisProgress.total > 0 && analysisProgress.totalSteps > 0
                          ? Math.min(100, Math.max(0, 
                              ((analysisProgress.current - 1) / analysisProgress.total * 100) + 
                              (1 / analysisProgress.total * (analysisProgress.step / analysisProgress.totalSteps) * 100)
                            ))
                          : 0
                      }%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 업로드 결과 표시 */}
          {Array.isArray(uploadResults) && uploadResults.length > 0 && (
            <div className="mt-3 space-y-2">
              <h3 className="font-semibold">업로드 결과</h3>
              <ul className="space-y-2">
                {uploadResults.map((r, i) => {
                  if (!r) return null;
                  
                  return (
                    <li
                      key={`upload-${r.filename ?? "file"}-${i}`}
                      className={`p-3 rounded-lg ${
                        r.ok
                          ? "bg-green-50 ring-1 ring-green-200"
                          : "bg-red-50 ring-1 ring-red-200"
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {r.filename ?? "파일"} — {r.ok ? "성공" : "실패"}
                      </p>
                      {r.ok ? (
                        <p className="text-xs text-neutral-600 break-all">
                          key: {r.key || "?"} • size: {r.size ?? "?"} • etag:{" "}
                          {r.etag ?? "-"}
                        </p>
                      ) : (
                        <p className="text-xs text-red-700 whitespace-pre-wrap">
                          {r.error || "알 수 없는 오류"}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* JPG 변환 결과 표시 */}
          {Array.isArray(convertResults) && convertResults.length > 0 && (
            <div className="mt-3 space-y-2">
              <h3 className="font-semibold">JPG 변환 결과</h3>
              <ul className="space-y-2">
                {convertResults.map((r, i) => {
                  if (!r) return null;
                  
                  return (
                    <li
                      key={`convert-${r.filename ?? "file"}-${i}`}
                      className={`p-3 rounded-lg ${
                        r.ok
                          ? "bg-blue-50 ring-1 ring-blue-200"
                          : "bg-red-50 ring-1 ring-red-200"
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {r.filename ?? "파일"} — {r.ok ? "변환 성공" : "변환 실패"}
                      </p>
                      {r.ok ? (
                        <div className="text-xs text-neutral-600">
                          <p>PDF Key: {r.pdfKey || "?"}</p>
                          <p>전체 페이지: {r.totalPages ?? "?"} • 업로드 성공: {r.uploaded ?? "?"} • 실패: {r.failed ?? 0}</p>
                          {r.results && Array.isArray(r.results) && r.results.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-blue-700 hover:underline">
                                페이지별 결과 보기
                              </summary>
                              <ul className="mt-2 space-y-1 ml-4">
                                {r.results.map((pageResult, idx) => {
                                  if (!pageResult) return null;
                                  
                                  return (
                                    <li key={`page-${idx}`} className={`text-xs ${
                                      pageResult.status === 'success' 
                                        ? 'text-green-700' 
                                        : 'text-red-700'
                                    }`}>
                                      페이지 {pageResult.page ?? idx + 1}: {pageResult.message || "?"} (Status: {pageResult.statusCode || "?"})
                                    </li>
                                  );
                                })}
                              </ul>
                            </details>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-red-700 whitespace-pre-wrap">
                          {r.error || "알 수 없는 오류"}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* AI 분석 결과 표시 */}
          {Array.isArray(analysisResults) && analysisResults.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">AI 분석 결과</h3>
                <button
                  type="button"
                  onClick={copyAllResults}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 text-sm"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="w-4 h-4"
                  >
                    <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 013.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0121 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 017.5 16.125V3.375z" />
                    <path d="M15 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0017.25 7.5h-1.875A.375.375 0 0115 7.125V5.25zM4.875 6H6v10.125A3.375 3.375 0 009.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V7.875C3 6.839 3.84 6 4.875 6z" />
                  </svg>
                  전체 결과 복사
                </button>
              </div>
              <ul className="space-y-4">
                {analysisResults.map((result, i) => {
                  if (!result) return null;
                  
                  return (
                    <li
                      key={`analysis-${result.filename ?? "file"}-${i}`}
                      className={`p-4 rounded-lg ${
                        result.ok
                          ? "bg-purple-50 ring-2 ring-purple-200"
                          : "bg-red-50 ring-1 ring-red-200"
                      }`}
                    >
                      <p className="text-base font-bold mb-2">
                        📄 {result.filename ?? "파일"} — {result.ok ? "분석 완료" : "분석 실패"}
                      </p>
                      
                      {result.ok ? (
                        <div className="space-y-3">
                          {result.results && Array.isArray(result.results) && result.results.map((pageResult, pageIdx) => {
                            if (!pageResult) return null;
                            
                            return (
                              <div key={`page-${pageIdx}`} className="bg-white p-3 rounded-lg shadow-sm">
                                <p className="font-semibold text-sm mb-2">
                                  📖 페이지 {pageResult.page ?? pageIdx + 1}
                                </p>
                                
                                {pageResult.steps && Array.isArray(pageResult.steps) && pageResult.steps.map((step, stepIdx) => {
                                  if (!step) return null;
                                  
                                  return (
                                    <div key={`step-${stepIdx}`} className="mt-2 pl-3 border-l-2 border-purple-300">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-xs font-semibold text-purple-700">
                                          Step {step.step ?? stepIdx + 1}: {step.prompt || "(프롬프트 없음)"}
                                        </p>
                                        {step.withImage ? (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            🖼️
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                            📝
                                          </span>
                                        )}
                                      </div>
                                      {step.success ? (
                                        <div className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap bg-neutral-50 p-2 rounded">
                                          {step.response || "(응답 없음)"}
                                        </div>
                                      ) : (
                                        <p className="mt-1 text-xs text-red-700">
                                          ❌ {step.error || "알 수 없는 오류"}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-red-700 whitespace-pre-wrap">
                          {result.error || "알 수 없는 오류"}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
