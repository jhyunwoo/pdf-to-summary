import { useRef } from "react";

export default function PromptInputForm({
  withImage,
  onWithImageChange,
  onSubmit,
  onKeyDown,
}) {
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
      onSubmit(text);

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
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
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
            onChange={(e) => onWithImageChange(e.target.checked)}
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
            requestAnimationFrame(() => e.currentTarget.form?.requestSubmit());
          }
        }}
        className="w-full p-1 px-2 rounded-lg bg-sky-600 text-neutral-50"
      >
        추가
      </button>
    </form>
  );
}
