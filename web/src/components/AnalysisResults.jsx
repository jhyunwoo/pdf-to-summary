export default function AnalysisResults({ analysisResults, onCopyAll }) {
  if (!Array.isArray(analysisResults) || analysisResults.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">AI 분석 결과</h3>
        <button
          type="button"
          onClick={onCopyAll}
          className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 text-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 013.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0121 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 017.5 16.125V3.375z" />
            <path d="M15 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0017.25 7.5h-1.875A.375.375 0 0115 7.125V5.25zM4.875 6H6v10.125A3.375 3.375 0 009.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V7.875C3 6.839 3.84 6 4.875 6z" />
          </svg>
          전체 결과 복사
        </button>
      </div>
      <ul className="space-y-4">
        {analysisResults.map((result, i) => {
          if (!result) return null;

          return (
            <li
              key={`analysis-${result.filename ?? "file"}-${i}`}
              className={`p-4 rounded-lg ${
                result.ok
                  ? "bg-purple-50 ring-2 ring-purple-200"
                  : "bg-red-50 ring-1 ring-red-200"
              }`}
            >
              <p className="text-base font-bold mb-2">
                📄 {result.filename ?? "파일"} —{" "}
                {result.ok ? "분석 완료" : "분석 실패"}
              </p>

              {result.ok ? (
                <div className="space-y-3">
                  {result.results &&
                    Array.isArray(result.results) &&
                    result.results.map((pageResult, pageIdx) => {
                      if (!pageResult) return null;

                      return (
                        <div
                          key={`page-${pageIdx}`}
                          className="bg-white p-3 rounded-lg shadow-sm"
                        >
                          <p className="font-semibold text-sm mb-2">
                            📖 페이지 {pageResult.page ?? pageIdx + 1}
                          </p>

                          {pageResult.steps &&
                            Array.isArray(pageResult.steps) &&
                            pageResult.steps.map((step, stepIdx) => {
                              if (!step) return null;

                              return (
                                <div
                                  key={`step-${stepIdx}`}
                                  className="mt-2 pl-3 border-l-2 border-purple-300"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs font-semibold text-purple-700">
                                      Step {step.step ?? stepIdx + 1}:{" "}
                                      {step.prompt || "(프롬프트 없음)"}
                                    </p>
                                    {step.withImage ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        🖼️
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        📝
                                      </span>
                                    )}
                                  </div>
                                  {step.success ? (
                                    <div className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap bg-neutral-50 p-2 rounded">
                                      {step.response || "(응답 없음)"}
                                    </div>
                                  ) : (
                                    <p className="mt-1 text-xs text-red-700">
                                      ❌ {step.error || "알 수 없는 오류"}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-red-700 whitespace-pre-wrap">
                  {result.error || "알 수 없는 오류"}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
