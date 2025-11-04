import { useState, useCallback, useEffect } from "react";
import {
  savePrompts as savePromptsAPI,
  loadPrompts as loadPromptsAPI,
} from "../api/prompts";

export function usePrompts() {
  const [prompts, setPrompts] = useState([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [isSavingPrompts, setIsSavingPrompts] = useState(false);

  // 프롬프트를 API에 저장하는 함수
  const savePrompts = useCallback(async (promptItems) => {
    setIsSavingPrompts(true);

    try {
      await savePromptsAPI(promptItems);
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
      const loadedPrompts = await loadPromptsAPI();
      if (loadedPrompts.length > 0) {
        setPrompts(loadedPrompts);
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

  const handleRemove = useCallback((idxToRemove) => {
    if (typeof idxToRemove !== "number" || idxToRemove < 0) {
      console.error("유효하지 않은 인덱스:", idxToRemove);
      return;
    }

    setPrompts((prev) => {
      if (!Array.isArray(prev)) return [];
      return prev.filter((_, idx) => idx !== idxToRemove);
    });
  }, []);

  return {
    prompts,
    setPrompts,
    isLoadingPrompts,
    isSavingPrompts,
    handleRemove,
  };
}
