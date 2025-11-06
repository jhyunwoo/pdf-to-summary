import { useEffect, useState } from "react";
import { usePrompts } from "./hooks/usePrompts";
import { usePdfAnalysis } from "./hooks/usePdfAnalysis";
import ChainOfThoughtSection from "./components/ChainOfThoughtSection";
import UploadSection from "./components/UploadSection";
import {
  getAiApiOptions,
  getAiApiIndex,
  setAiApiIndex,
  getAiApi,
} from "./api/variables";

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

  const [aiOptions, setAiOptions] = useState([]);
  const [aiIndex, setAiIndexState] = useState(0);

  useEffect(() => {
    setAiOptions(getAiApiOptions());
    setAiIndexState(getAiApiIndex());
  }, []);

  const handleChangeAi = (e) => {
    const idx = Number(e.target.value);
    setAiApiIndex(idx);
    setAiIndexState(idx);
  };

  const handleAnalyze = () => {
    analyze(pdfs, prompts);
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-8 bg-neutral-100">
      <div className="bg-neutral-50 p-8 rounded-xl w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">PDF to Summary</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-600">AI API</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={aiIndex}
              onChange={handleChangeAi}
            >
              {aiOptions.map((url, idx) => (
                <option key={url} value={idx}>{`#${idx + 1} - ${url}`}</option>
              ))}
            </select>
          </div>
        </div>

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
