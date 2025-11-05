import { API_BASE, STORAGE_BASE, PDF_TO_JPG_API } from "./variables";

// 이미지 URL 검증 함수
function validateImageUrl(imageUrl) {
  try {
    new URL(imageUrl);
    return true;
  } catch {
    return false;
  }
}

// PDF를 JPG로 변환하는 함수
export async function convertPdfToJpg(pdfKey, filename) {
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
    const resp = await fetch(`${PDF_TO_JPG_API}/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pdfUrl,
        uploadUrl,
      }),
    });

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
            console.log(`  ✓ imageKey 사용: ${result.imageKey} → ${imageUrl}`);
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
}

export { validateImageUrl };
