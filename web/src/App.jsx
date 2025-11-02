import { useState, useRef, useCallback, useEffect } from "react";
import PDFDropzone from "./components/PDFDropzone";

const API_BASE = "https://pdf-to-summary-api.moveto.workers.dev";
const STORAGE_BASE = "https://pdf-to-summary.moveto.kr";
const PDF_TO_JPG_API = "https://pdf-to-jpg.moveto.kr";
const AI_API = "https://pdf-to-summary-ai.moveto.kr";


function App() {
  const [prompts, setPrompts] = useState([]); // 프롬프트 저장 변수
  const [pdfs, setPdfs] = useState([]); // 드롭존에서 선택된 PDF 목록
  const [withImage, setWithImage] = useState(true); // 이미지 포함 여부 (기본값: true)
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [converting, setConverting] = useState(false);
  const [convertResults, setConvertResults] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [analysisProgress, setAnalysisProgress] = useState({
    current: 0,
    total: 0,
    step: 0,
    totalSteps: 0,
  });
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false); // 초기 로드 플래그
  const [isSavingPrompts, setIsSavingPrompts] = useState(false); // 프롬프트 저장 중 플래그

  const composingRef = useRef(false);

  const handleSubmit = (e) => {
    try {
      e?.preventDefault();

      if (!e?.currentTarget) {
        console.error("Form 요소를 찾을 수 없습니다");
        return;
      }

      // 프롬프트 입력 가져오기
      const fd = new FormData(e.currentTarget);
      const text = (fd.get("prompt") || "").toString().trim();

      // 프롬프트가 비어있으면 리셋하고 종료
      if (!text) {
        e.currentTarget.reset();
        return;
      }

      // 프롬프트 저장
      setPrompts((prev) => {
        const newPrompt = { prompt: text, withImage: Boolean(withImage) };
        return Array.isArray(prev) ? [...prev, newPrompt] : [newPrompt];
      });

      // 프롬프트 입력 초기화
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
    if (typeof idxToRemove !== "number" || idxToRemove < 0) {
      console.error("유효하지 않은 인덱스:", idxToRemove);
      return;
    }

    setPrompts((prev) => {
      if (!Array.isArray(prev)) return [];
      return prev.filter((_, idx) => idx !== idxToRemove);
    });
  };

  // 프롬프트를 API에 저장하는 함수
  const savePrompts = useCallback(async (promptItems) => {
    setIsSavingPrompts(true);

    try {
      if (
        !promptItems ||
        !Array.isArray(promptItems) ||
        promptItems.length === 0
      ) {
        // 빈 배열인 경우에도 저장 (전체 삭제)
        try {
          // TASK 1
          // 프롬프트 저장 API 요청
          
        } catch (err) { // API 요청에 실패할 경우
          console.error("프롬프트 저장 실패 (빈 배열):", err);
        } finally {
          setIsSavingPrompts(false);
        }
        return;
      }

      // 전체 프롬프트 객체를 정제하여 저장 (withImage 정보 포함)
      const promptsToSave = promptItems
        .map((item) => {
          if (!item) return null;

  
            const promptText = String(item.prompt || "").trim();
            if (!promptText) return null;
            return {
              prompt: promptText,
              withImage: Boolean(item.withImage ?? true),
            };
        })
        .filter((p) => p !== null);

      console.log(`💾 프롬프트 저장 중... (${promptsToSave.length}개)`);
      console.log(`저장할 프롬프트:`, promptsToSave);

      // TASK 2 프롬프트 저장 API 요청
      

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

      // TASK 3
      // 저장된 Prompts를 불러오는 API 요청
      

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
            if (typeof p === "string") {
              const trimmed = p.trim();
              return trimmed ? { prompt: trimmed, withImage: true } : null;
            }

            // 객체 형식: { prompt: string, withImage: boolean }
            if (p && typeof p === "object" && "prompt" in p) {
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
          setPrompts(loadedPrompts);
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
    // 초기 로드 중이거나 prompt가 배열이 아니면 저장하지 않음
    if (isLoadingPrompts || !Array.isArray(prompts)) return;

    // 디바운스: 500ms 후에 저장 (빠른 입력 시 여러 번 저장 방지)
    const timeoutId = setTimeout(() => {
      savePrompts(prompts);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [prompts, savePrompts, isLoadingPrompts]);

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
      console.log(
        `📤 업로드 시작: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      );

      const resp = await fetch(
        url,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/pdf",
          },
          body: file,
        }
      );

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
          error:
            json?.error ||
            `업로드 실패 (${resp.status}${resp.statusText ? ": " + resp.statusText : ""})`,
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
        errorMessage =
          "업로드 시간 초과 - 파일이 너무 크거나 네트워크가 느립니다.";
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
    if (!pdfKey || typeof pdfKey !== "string") {
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
      const resp = await fetch(
        `${PDF_TO_JPG_API}/convert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pdfUrl,
            uploadUrl,
          }),
        }
      );

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
          error:
            json?.error ||
            json?.message ||
            `변환 실패 (${resp.status}${resp.statusText ? ": " + resp.statusText : ""})`,
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
      console.log("\n📸 이미지 URL 추출 시작...");
      console.log("PDF to JPG API 응답:", json);

      const imageUrls = [];
      if (json.results && Array.isArray(json.results)) {
        for (const result of json.results) {
          console.log(`\n페이지 ${result.page || "?"} 처리:`, result);

          if (result.status === "success") {
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
              console.log(
                `  ✓ response.key 사용: ${result.response.key} → ${imageUrl}`,
              );
            }
            // 직접 key 필드가 있는 경우
            else if (result.key) {
              imageUrl = `${STORAGE_BASE}/${result.key}`;
              console.log(`  ✓ key 사용: ${result.key} → ${imageUrl}`);
            }
            // imageKey 필드가 있는 경우
            else if (result.imageKey) {
              imageUrl = `${STORAGE_BASE}/${result.imageKey}`;
              console.log(
                `  ✓ imageKey 사용: ${result.imageKey} → ${imageUrl}`,
              );
            }

            if (imageUrl) {
              imageUrls.push(imageUrl);
              console.log(`  ✅ 추가됨: ${imageUrl}`);
            } else {
              console.warn("  ⚠️ 이미지 URL을 찾을 수 없음:", result);
            }
          } else {
            console.warn(`  ❌ 상태가 success가 아님: ${result.status}`);
          }
        }
      }

      console.log(`\n✅ 총 ${imageUrls.length}개 이미지 URL 추출 완료`);
      console.log("📋 최종 이미지 URLs:");
      imageUrls.forEach((url, idx) => {
        console.log(`  ${idx + 1}. ${url}`);
      });

      // 이미지가 하나도 추출되지 않은 경우 경고
      if (imageUrls.length === 0) {
        console.warn("⚠️ 이미지가 하나도 추출되지 않았습니다!");
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
        errorMessage =
          "PDF 변환 시간 초과 - PDF 파일이 너무 크거나 복잡합니다.";
      } else if (err.message?.includes("Failed to fetch")) {
        errorMessage =
          "변환 서버에 연결할 수 없습니다. 네트워크를 확인해주세요.";
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
    if (!prompts || prompts.length === 0) {
      alert("분석할 프롬프트를 추가해주세요.");
      return;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`PDF 분석 프로세스 시작`);
    console.log(`PDF 파일 수: ${pdfs.length}`);
    console.log(`프롬프트 단계: ${prompts.length}개`);
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
        pdfs.map((pdf) =>
          uploadOneToR2(pdf).catch((err) => ({
            ok: false,
            error: `예외 발생: ${err.message}`,
            filename: pdf?.name || "unknown",
          })),
        ),
      );

      setUploadResults(uploadResultsList);
      setUploading(false);

      // 업로드 성공한 항목만 필터링
      const successfulUploads = uploadResultsList.filter(
        (r) => r && r.ok && r.key,
      );
      console.log(
        `✅ PDF 업로드 완료: ${successfulUploads.length}/${uploadResultsList.length} 성공`,
      );

      if (successfulUploads.length === 0) {
        alert("업로드된 PDF가 없습니다. 업로드 결과를 확인해주세요.");
        return;
      }

      // 2단계: PDF를 JPG로 변환
      console.log(`\n🖼️  [2/3] PDF → JPG 변환 시작...`);
      setConverting(true);

      const conversionResults = await Promise.all(
        successfulUploads.map((item) =>
          convertPdfToJpg(item.key, item.filename).catch((err) => ({
            ok: false,
            error: `예외 발생: ${err.message}`,
            filename: item.filename,
            pdfKey: item.key,
          })),
        ),
      );

      setConvertResults(conversionResults);
      setConverting(false);

      // 변환 성공한 항목만 필터링
      const successfulConversions = conversionResults.filter(
        (r) =>
          r &&
          r.ok &&
          r.imageUrls &&
          Array.isArray(r.imageUrls) &&
          r.imageUrls.length > 0,
      );

      const totalImages = successfulConversions.reduce(
        (sum, r) => sum + (r.imageUrls?.length || 0),
        0,
      );
      console.log(
        `✅ JPG 변환 완료: ${successfulConversions.length}/${conversionResults.length} 파일 성공`,
      );
      console.log(`   총 ${totalImages}개 이미지 생성됨`);

      if (successfulConversions.length === 0) {
        alert("JPG로 변환된 이미지가 없습니다. 변환 결과를 확인해주세요.");
        return;
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
            name="prompt"
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
                  ?.querySelector('textarea[name="prompt"]')
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
          {Array.isArray(prompts) &&
            prompts.map((item, idx) => {
              if (!item) return null;

              // item이 문자열인 경우와 객체인 경우 모두 처리
              const promptText =
                typeof item === "string"
                  ? item.trim()
                  : item && typeof item === "object" && "prompt" in item
                    ? String(item.prompt || "").trim()
                    : String(item || "").trim();

              const withImage =
                typeof item === "string"
                  ? true // 기본값
                  : item && typeof item === "object" && "withImage" in item
                    ? Boolean(item.withImage)
                    : true; // 기본값

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
                    aria-label={`Prompt ${idx + 1} 삭제`}
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
                  📊 페이지 {analysisProgress.current || 0}/
                  {analysisProgress.total || 0} 분석 중
                </p>
                <p className="text-xs text-purple-700">
                  Step {analysisProgress.step || 0}/
                  {analysisProgress.totalSteps || 0} 실행 중...
                </p>
                <div className="mt-2 bg-purple-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-full transition-all duration-300"
                    style={{
                      width: `${
                        analysisProgress.total > 0 &&
                        analysisProgress.totalSteps > 0
                          ? Math.min(
                              100,
                              Math.max(
                                0,
                                ((analysisProgress.current - 1) /
                                  analysisProgress.total) *
                                  100 +
                                  (1 / analysisProgress.total) *
                                    (analysisProgress.step /
                                      analysisProgress.totalSteps) *
                                    100,
                              ),
                            )
                          : 0
                      }%`,
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
                        {r.filename ?? "파일"} —{" "}
                        {r.ok ? "변환 성공" : "변환 실패"}
                      </p>
                      {r.ok ? (
                        <div className="text-xs text-neutral-600">
                          <p>PDF Key: {r.pdfKey || "?"}</p>
                          <p>
                            전체 페이지: {r.totalPages ?? "?"} • 업로드 성공:{" "}
                            {r.uploaded ?? "?"} • 실패: {r.failed ?? 0}
                          </p>
                          {r.results &&
                            Array.isArray(r.results) &&
                            r.results.length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-blue-700 hover:underline">
                                  페이지별 결과 보기
                                </summary>
                                <ul className="mt-2 space-y-1 ml-4">
                                  {r.results.map((pageResult, idx) => {
                                    if (!pageResult) return null;

                                    return (
                                      <li
                                        key={`page-${idx}`}
                                        className={`text-xs ${
                                          pageResult.status === "success"
                                            ? "text-green-700"
                                            : "text-red-700"
                                        }`}
                                      >
                                        페이지 {pageResult.page ?? idx + 1}:{" "}
                                        {pageResult.message || "?"} (Status:{" "}
                                        {pageResult.statusCode || "?"})
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

        </section>
      </div>
    </div>
  );
}

export default App;
