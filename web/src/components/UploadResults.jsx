export default function UploadResults({ uploadResults }) {
  if (!Array.isArray(uploadResults) || uploadResults.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <h3 className="font-semibold">업로드 결과</h3>
      <ul className="space-y-2">
        {uploadResults.map((r, i) => {
          if (!r) return null;

          return (
            <li
              key={`upload-${r.filename ?? "file"}-${i}`}
              className={`p-3 rounded-lg ${
                r.ok
                  ? "bg-green-50 ring-1 ring-green-200"
                  : "bg-red-50 ring-1 ring-red-200"
              }`}
            >
              <p className="text-sm font-medium">
                {r.filename ?? "파일"} — {r.ok ? "성공" : "실패"}
              </p>
              {r.ok ? (
                <p className="text-xs text-neutral-600 break-all">
                  key: {r.key || "?"} • size: {r.size ?? "?"} • etag:{" "}
                  {r.etag ?? "-"}
                </p>
              ) : (
                <p className="text-xs text-red-700 whitespace-pre-wrap">
                  {r.error || "알 수 없는 오류"}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
