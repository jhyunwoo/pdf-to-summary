export default function PromptItem({
  prompt,
  withImage,
  index,
  onRemove,
  isSaving,
}) {
  return (
    <li className="flex items-center justify-between gap-3 p-3 rounded-lg ring-2 ring-sky-800 bg-white">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="whitespace-pre-wrap break-words font-semibold">
            {index + 1}. {prompt}
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
        onClick={() => onRemove(index)}
        disabled={isSaving}
        className={`px-2 py-1 rounded-md text-xs ${
          isSaving
            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
            : "bg-red-600 text-white hover:bg-red-700"
        }`}
        aria-label={`Prompt ${index + 1} 삭제`}
      >
        삭제
      </button>
    </li>
  );
}
