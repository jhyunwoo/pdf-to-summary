export default function ConvertResults({ convertResults }) {
  if (!Array.isArray(convertResults) || convertResults.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <h3 className="font-semibold">JPG 변환 결과</h3>
      <ul className="space-y-2">
        {convertResults.map((r, i) => {
          if (!r) return null;

          return (
            <li
              key={`convert-${r.filename ?? "file"}-${i}`}
              className={`p-3 rounded-lg ${
                r.ok
                  ? "bg-blue-50 ring-1 ring-blue-200"
                  : "bg-red-50 ring-1 ring-red-200"
              }`}
            >
              <p className="text-sm font-medium">
                {r.filename ?? "파일"} — {r.ok ? "변환 성공" : "변환 실패"}
              </p>
              {r.ok ? (
                <div className="text-xs text-neutral-600">
                  <p>PDF Key: {r.pdfKey || "?"}</p>
                  <p>
                    전체 페이지: {r.totalPages ?? "?"} • 업로드 성공:{" "}
                    {r.uploaded ?? "?"} • 실패: {r.failed ?? 0}
                  </p>
                  {r.results &&
                    Array.isArray(r.results) &&
                    r.results.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-700 hover:underline">
                          페이지별 결과 보기
                        </summary>
                        <ul className="mt-2 space-y-1 ml-4">
                          {r.results.map((pageResult, idx) => {
                            if (!pageResult) return null;

                            return (
                              <li
                                key={`page-${idx}`}
                                className={`text-xs ${
                                  pageResult.status === "success"
                                    ? "text-green-700"
                                    : "text-red-700"
                                }`}
                              >
                                페이지 {pageResult.page ?? idx + 1}:{" "}
                                {pageResult.message || "?"} (Status:{" "}
                                {pageResult.statusCode || "?"})
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    )}
                </div>
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
