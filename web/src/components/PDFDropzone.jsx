import { useState, useRef, useCallback } from "react";

export default function PDFDropzone({
  value = [],
  onFilesChange,
  multiple = true,
  maxSizeMB = 100,
  className = "",
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const openFileDialog = () => inputRef.current?.click();

  const validateAndAdd = useCallback(
    (fileList) => {
      if (!fileList) {
        setError("파일을 선택할 수 없습니다.");
        return;
      }

      const files = Array.from(fileList || []);
      if (files.length === 0) {
        setError("선택된 파일이 없습니다.");
        return;
      }

      const accepted = [];
      const rejected = [];
      const maxBytes = maxSizeMB * 1024 * 1024;

      files.forEach((f) => {
        if (!f || !f.name) {
          rejected.push("유효하지 않은 파일입니다.");
          return;
        }

        const isPdf =
          f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
        const okSize = f.size <= maxBytes;

        if (!isPdf) {
          rejected.push(`${f.name}: PDF만 업로드 가능합니다.`);
          return;
        }
        if (!okSize) {
          rejected.push(
            `${f.name}: ${maxSizeMB}MB를 초과합니다 (현재: ${(f.size / 1024 / 1024).toFixed(2)}MB).`,
          );
          return;
        }
        if (f.size === 0) {
          rejected.push(`${f.name}: 파일이 비어있습니다.`);
          return;
        }

        accepted.push(f);
      });

      let newFiles = multiple
        ? [...(Array.isArray(value) ? value : []), ...accepted]
        : accepted.slice(0, 1);

      // 중복 제거 (name + size + lastModified)
      const seen = new Set();
      newFiles = newFiles.filter((f) => {
        if (!f || !f.name) return false;
        const key = `${f.name}|${f.size}|${f.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (typeof onFilesChange === "function") {
        onFilesChange(newFiles);
      }

      setError(rejected.length > 0 ? rejected.join("\n") : "");
    },
    [value, onFilesChange, multiple, maxSizeMB],
  );

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      validateAndAdd(e.dataTransfer.files);
    }
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e) => {
    if (e.currentTarget === e.target) setIsDragging(false);
  };

  const onChange = (e) => {
    if (e?.target?.files?.length) {
      validateAndAdd(e.target.files);
      e.target.value = ""; // 같은 파일 다시 선택 가능하게 초기화
    }
  };

  const removeAt = (idx) => {
    if (typeof onFilesChange === "function" && Array.isArray(value)) {
      onFilesChange(value.filter((_, i) => i !== idx));
    }
  };

  const clearAll = () => {
    if (typeof onFilesChange === "function") {
      onFilesChange([]);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        role="button"
        tabIndex={0}
        aria-label="PDF 업로드 드래그 앤 드롭 영역"
        onClick={openFileDialog}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openFileDialog();
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all select-none cursor-pointer outline-none
          ${
            isDragging
              ? "border-sky-600 bg-sky-50 ring-4 ring-sky-100"
              : "border-neutral-300 hover:border-sky-400 bg-neutral-50"
          }
        `}
      >
        {/* 간단한 업로드 아이콘 (inline SVG) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-10 h-10 text-sky-700"
        >
          <path d="M12 16a1 1 0 0 1-1-1V9.41l-1.3 1.3a1 1 0 1 1-1.4-1.42l3-3a1 1 0 0 1 1.4 0l3 3a1 1 0 1 1-1.4 1.42L13 9.4V15a1 1 0 0 1-1 1Zm-7 3a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h2a1 1 0 1 1 0 2H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2a1 1 0 1 1 0-2h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H5Z" />
        </svg>
        <p className="mt-2 text-sm text-neutral-700">
          PDF 파일을 드래그 앤 드롭하거나{" "}
          <span className="text-sky-700 underline">클릭하여 선택</span>
        </p>
        <p className="text-xs text-neutral-500">
          최대 {maxSizeMB}MB · {multiple ? "여러 개 선택 가능" : "1개만 선택"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple={multiple}
          className="hidden"
          onChange={onChange}
        />
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded-md whitespace-pre-wrap">
          {error}
        </div>
      )}

      {Array.isArray(value) && value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">선택된 파일 ({value.length})</h3>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs px-2 py-1 rounded-md bg-neutral-200 hover:bg-neutral-300"
            >
              모두 제거
            </button>
          </div>
          <ul className="space-y-2">
            {value.map((f, idx) => {
              if (!f || !f.name) return null;

              return (
                <li
                  key={`file-${f.name}-${f.lastModified}-${idx}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white ring-1 ring-neutral-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-neutral-500">
                      {((f.size || 0) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="px-2 py-1 rounded-md text-xs bg-red-600 text-white hover:bg-red-700"
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}