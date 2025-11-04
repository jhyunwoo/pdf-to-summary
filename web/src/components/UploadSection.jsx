import PDFDropzone from "./PDFDropzone";
import ProgressIndicator from "./ProgressIndicator";
import UploadResults from "./UploadResults";
import ConvertResults from "./ConvertResults";
import AnalysisResults from "./AnalysisResults";

export default function UploadSection({
  pdfs,
  onPdfsChange,
  onAnalyze,
  uploading,
  converting,
  analyzing,
  analysisProgress,
  uploadResults,
  convertResults,
  analysisResults,
  onCopyAllResults,
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">PDF 업로드</h2>
      <PDFDropzone
        value={pdfs}
        onFilesChange={onPdfsChange}
        multiple={true}
        maxSizeMB={100}
      />

      {/* 업로드/분석 버튼 */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!pdfs.length || uploading || converting || analyzing}
          className={`w-full px-4 py-2 rounded-lg text-white ${
            !pdfs.length || uploading || converting || analyzing
              ? "bg-neutral-300 cursor-not-allowed"
              : "bg-sky-600 hover:bg-sky-700"
          }`}
        >
          {uploading
            ? "업로드 중..."
            : converting
              ? "JPG 변환 중..."
              : analyzing
                ? "AI 분석 중..."
                : "AI 분석"}
        </button>

        {/* 진행 상황 표시 */}
        {analyzing && <ProgressIndicator analysisProgress={analysisProgress} />}
      </div>

      {/* 결과 표시 */}
      <UploadResults uploadResults={uploadResults} />
      <ConvertResults convertResults={convertResults} />
      <AnalysisResults
        analysisResults={analysisResults}
        onCopyAll={onCopyAllResults}
      />
    </section>
  );
}
