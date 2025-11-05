import { API_BASE } from "./variables";

// 프롬프트를 API에 저장하는 함수
export async function savePrompts(promptItems) {
  try {
    // 프롬프트가 비어 있을 경우 처리
    if (
      !promptItems ||
      !Array.isArray(promptItems) ||
      promptItems.length === 0
    ) {
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
    throw err;
  }
}

// 저장된 프롬프트를 불러오는 함수
export async function loadPrompts() {
  try {
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
      return [];
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
        return loadedPrompts;
      } else {
        console.log("📭 저장된 프롬프트 없음");
        return [];
      }
    }
    return [];
  } catch (err) {
    console.error("프롬프트 불러오기 중 오류:", err);
    return [];
  }
}
