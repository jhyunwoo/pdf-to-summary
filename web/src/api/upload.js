import { API_BASE } from "./variables";

// 단일 파일을 R2로 업로드 (PUT /upload/:filename)
export async function uploadOneToR2(file) {
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

    const resp = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf",
      },
      body: file,
    });

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
}
