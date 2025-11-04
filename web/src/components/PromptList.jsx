import PromptItem from "./PromptItem";

export default function PromptList({ prompts, onRemove, isSaving }) {
  if (!Array.isArray(prompts) || prompts.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2 list-decimal pt-4">
      {prompts.map((item, idx) => {
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
          <PromptItem
            key={`prompt-${idx}`}
            prompt={promptText}
            withImage={withImage}
            index={idx}
            onRemove={onRemove}
            isSaving={isSaving}
          />
        );
      })}
    </ul>
  );
}
