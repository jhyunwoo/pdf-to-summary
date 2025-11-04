export default function ProgressIndicator({ analysisProgress }) {
  if (!analysisProgress || analysisProgress.total === 0) {
    return null;
  }

  const progressPercentage =
    analysisProgress.total > 0 && analysisProgress.totalSteps > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((analysisProgress.current - 1) / analysisProgress.total) * 100 +
              (1 / analysisProgress.total) *
                (analysisProgress.step / analysisProgress.totalSteps) *
                100,
          ),
        )
      : 0;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
      <p className="text-sm font-semibold text-purple-900 mb-1">
        📊 페이지 {analysisProgress.current || 0}/{analysisProgress.total || 0}{" "}
        분석 중
      </p>
      <p className="text-xs text-purple-700">
        Step {analysisProgress.step || 0}/{analysisProgress.totalSteps || 0}{" "}
        실행 중...
      </p>
      <div className="mt-2 bg-purple-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-purple-600 h-full transition-all duration-300"
          style={{
            width: `${progressPercentage}%`,
          }}
        />
      </div>
    </div>
  );
}
