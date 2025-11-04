import { useState } from "react";
import PromptInputForm from "./PromptInputForm";
import PromptList from "./PromptList";

export default function ChainOfThoughtSection({
  prompts,
  onPromptsChange,
  onRemove,
  isSaving,
}) {
  const [withImage, setWithImage] = useState(true);

  const handleSubmit = (text) => {
    onPromptsChange((prev) => {
      const newPrompt = { prompt: text, withImage: Boolean(withImage) };
      return Array.isArray(prev) ? [...prev, newPrompt] : [newPrompt];
    });
  };

  return (
    <section>
      <h2 className="text-lg font-semibold">Chain-of-Thought</h2>
      <p>LLM 모델이 순차적으로 실행할 명령어를 정의합니다.</p>
      <p>
        ex. 내용 요약해줘 ➡️ 수업 내용 중 중요한 부분 퀴즈로 만들어줘 ➡️ 퀴즈
        정답 작성해줘
      </p>
      <PromptInputForm
        withImage={withImage}
        onWithImageChange={setWithImage}
        onSubmit={handleSubmit}
      />
      <PromptList prompts={prompts} onRemove={onRemove} isSaving={isSaving} />
    </section>
  );
}
