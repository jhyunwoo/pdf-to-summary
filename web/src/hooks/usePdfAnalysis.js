import { useState, useCallback } from "react";
import { uploadOneToR2 } from "../api/upload";
import { convertPdfToJpg } from "../api/convert";
import { analyzeWithAI } from "../api/analyze";

export function usePdfAnalysis() {
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

  const analyze = useCallback(
    async (pdfs, prompts) => {
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

          console.log(
            `\n--- 파일: ${conversion.filename} (${conversion.imageUrls.length}개 페이지) ---`,
          );

          try {
            const analysisResult = await analyzeWithAI(
              conversion.imageUrls,
              prompts,
              setAnalysisProgress,
            );
            aiResults.push({
              filename: conversion.filename,
              pdfKey: conversion.pdfKey,
              ...analysisResult,
            });
          } catch (analysisErr) {
            console.error(
              `분석 중 예외 발생 (${conversion.filename}):`,
              analysisErr,
            );
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
    },
    [uploading, converting, analyzing],
  );

  const copyAllResults = useCallback(async () => {
    if (!analysisResults || analysisResults.length === 0) {
      alert("복사할 분석 결과가 없습니다.");
      return;
    }

    try {
      let textContent = "# PDF AI 분석 결과\n\n";
      textContent += `분석 일시: ${new Date().toLocaleString("ko-KR")}\n`;
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

            if (
              pageResult.steps &&
              Array.isArray(pageResult.steps) &&
              pageResult.steps.length > 0
            ) {
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
          const textarea = document.createElement("textarea");
          textarea.value = textContent;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();

          const successful = document.execCommand("copy");
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
  }, [analysisResults]);

  return {
    uploading,
    uploadResults,
    converting,
    convertResults,
    analyzing,
    analysisResults,
    analysisProgress,
    analyze,
    copyAllResults,
  };
}
