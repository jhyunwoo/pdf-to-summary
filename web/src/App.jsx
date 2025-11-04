import { useState } from "react";
import { usePrompts } from "./hooks/usePrompts";
import { usePdfAnalysis } from "./hooks/usePdfAnalysis";
import ChainOfThoughtSection from "./components/ChainOfThoughtSection";
import UploadSection from "./components/UploadSection";

function App() {
  const [pdfs, setPdfs] = useState([]);
  const { prompts, setPrompts, isSavingPrompts, handleRemove } = usePrompts();
  const {
    uploading,
    uploadResults,
    converting,
    convertResults,
    analyzing,
    analysisResults,
    analysisProgress,
    analyze,
    copyAllResults,
  } = usePdfAnalysis();

  const handleAnalyze = () => {
    analyze(pdfs, prompts);
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-8 bg-neutral-100">
      <div className="bg-neutral-50 p-8 rounded-xl w-full max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">PDF to Summary</h1>

        <ChainOfThoughtSection
          prompts={prompts}
          onPromptsChange={setPrompts}
          onRemove={handleRemove}
          isSaving={isSavingPrompts}
        />

        <UploadSection
          pdfs={pdfs}
          onPdfsChange={setPdfs}
          onAnalyze={handleAnalyze}
          uploading={uploading}
          converting={converting}
          analyzing={analyzing}
          analysisProgress={analysisProgress}
          uploadResults={uploadResults}
          convertResults={convertResults}
          analysisResults={analysisResults}
          onCopyAllResults={copyAllResults}
        />
      </div>
    </div>
  );
}

export default App;
