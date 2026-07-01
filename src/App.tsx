import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Clipboard,
  FileText,
  Check,
  Copy,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Hash,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  History,
  Trash2,
  ChevronRight,
  UploadCloud,
  File,
  X,
  ChevronDown,
  ChevronUp,
  Award,
  BookOpen,
  Download,
  Printer,
  Eye,
  Code
} from "lucide-react";
import { EvaluationResult, ScanHistoryItem } from "./types";
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_CV } from "./components/SampleData";

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [jobDescription, setJobDescription] = useState("");
  const [cvText, setCvText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep3, setLoadingStep3] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [optimizedCv, setOptimizedCv] = useState<{ optimizedCvDraft: string; summaryOfImprovements: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Base64 file state to send to backend for parsing
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  
  // Accordion active state for Paso 2 recommendations
  const [activeAccordion, setActiveAccordion] = useState<string | null>("personalization");

  // History tracking (stored locally, displayed at the bottom of Paso 1 for convenience)
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  // Individual bullet improver state
  const [customBullet, setCustomBullet] = useState("");
  const [customBulletLoading, setCustomBulletLoading] = useState(false);
  const [customBulletResults, setCustomBulletResults] = useState<{ version: string; explicacion: string }[]>([]);
  const [copiedBulletIndex, setCopiedBulletIndex] = useState<number | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [cvViewMode, setCvViewMode] = useState<"markdown" | "preview">("preview");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ats_scan_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error reading scan history:", err);
    }
  }, []);

  const saveHistory = (newHistory: ScanHistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem("ats_scan_history", JSON.stringify(newHistory));
    } catch (err) {
      console.error("Error writing scan history:", err);
    }
  };

  const handleLoadSamples = () => {
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setCvText(SAMPLE_CV);
    setUploadedFileName("curriculum_rodrigo_perez_chile.pdf");
    setUploadedFileSize("142 KB");
    setFileBase64(null);
    setFileMimeType(null);
  };

  const handleClearForm = () => {
    setJobDescription("");
    setCvText("");
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setFileBase64(null);
    setFileMimeType(null);
    setError(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setUploadedFileName(file.name);
    setUploadedFileSize(formatBytes(file.size));
    setFileMimeType(file.type || "application/octet-stream");
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        // Extract raw base64 part
        const base64Parts = result.split(",");
        const base64Data = base64Parts[1] || result;
        setFileBase64(base64Data);

        if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
          const textReader = new FileReader();
          textReader.onload = (e) => {
            const txt = e.target?.result as string;
            setCvText(txt || "");
          };
          textReader.readAsText(file);
        } else {
          // Clear cvText so backend knows to parse PDF/DOCX
          setCvText("");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Step 1 -> Step 2: Evaluate CV
  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!jobDescription.trim() || (!cvText.trim() && !fileBase64)) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          jobDescription, 
          cvText,
          fileBase64,
          fileMimeType,
          fileName: uploadedFileName
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al procesar la evaluación.");
      }

      const result: EvaluationResult = await response.json();
      setEvaluationResult(result);
      
      // Update cvText state with the extracted text from server to use it in Paso 3
      if (result.extractedCvText) {
        setCvText(result.extractedCvText);
      }
      
      // Save to history
      let extractedTitle = "Análisis de CV";
      const firstLine = jobDescription.split("\n")[0] || "Puesto";
      if (firstLine.trim().length > 3 && firstLine.trim().length < 60) {
        extractedTitle = firstLine.trim();
      }

      const newScanItem: ScanHistoryItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        timestamp: new Date().toISOString(),
        jobTitle: extractedTitle,
        jobDescription,
        cvSnippet: result.extractedCvText || cvText,
        result,
      };

      const updatedHistory = [newScanItem, ...history.filter(h => h.jobDescription !== jobDescription)];
      saveHistory(updatedHistory);

      // Move to Step 2
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ocurrió un error al analizar tu CV frente a los filtros ATS.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3: Generate fully optimized CV draft
  const handleOptimizeCV = async () => {
    setLoadingStep3(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-optimized-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, cvText }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al generar la optimización total.");
      }

      const result = await response.json();
      setOptimizedCv(result);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ocurrió un error al generar las mejoras completas para tu CV.");
    } finally {
      setLoadingStep3(false);
    }
  };

  // Custom bullet improver call
  const handleImproveCustomBullet = async (bulletToImprove: string) => {
    if (!bulletToImprove.trim()) return;
    setCustomBulletLoading(true);
    setError(null);
    setCustomBulletResults([]);

    try {
      const response = await fetch("/api/improve-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bullet: bulletToImprove, jobDescription }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al mejorar la viñeta.");
      }

      const data = await response.json();
      setCustomBulletResults(data.mejoras || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al conectar con la IA para mejorar tu viñeta.");
    } finally {
      setCustomBulletLoading(false);
    }
  };

  const handleCopyDraft = () => {
    if (!optimizedCv) return;
    navigator.clipboard.writeText(optimizedCv.optimizedCvDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const handleCopyBullet = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedBulletIndex(index);
    setTimeout(() => setCopiedBulletIndex(null), 2000);
  };

  const handleDownloadDocx = async () => {
    if (!optimizedCv) return;
    try {
      const response = await fetch("/api/download-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvDraftMarkdown: optimizedCv.optimizedCvDraft,
          fileName: `cv_optimizado_usa_${(uploadedFileName || "curriculum").replace(/\.[^/.]+$/, "")}.doc`
        }),
      });
      if (!response.ok) {
        throw new Error("No se pudo descargar el archivo de Word.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cv_optimizado_usa_${(uploadedFileName || "curriculum").replace(/\.[^/.]+$/, "")}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error downloading doc:", err);
      setError("Ocurrió un error al descargar el archivo Word (.doc).");
    }
  };

  const handlePrintPdf = () => {
    if (!optimizedCv) return;
    try {
      // Clean up markdown newlines
      const cleanedCv = (optimizedCv.optimizedCvDraft || "")
        .replace(/\\N/gi, "\n")
        .replace(/\\n/gi, "\n")
        .replace(/\\r/gi, "")
        .trim();

      // Open a clean blank tab
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        // Fallback to standard window.print if popup is blocked
        window.print();
        return;
      }

      const fileTitle = `CV_Optimizado_${(uploadedFileName || "USA").replace(/\.[^/.]+$/, "")}`;

      const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${fileTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap');
    
    @page {
      size: letter;
      margin: 0.75in;
    }
    
    body {
      font-family: 'Merriweather', 'Georgia', 'Times New Roman', serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000000;
      margin: 0;
      padding: 0;
      background-color: white;
      -webkit-print-color-adjust: exact;
    }
    
    #content-container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    h1 {
      font-size: 16pt;
      font-weight: bold;
      text-align: center;
      margin-top: 0;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000000;
    }
    
    .contact-info {
      text-align: center;
      font-size: 8.5pt;
      color: #444444;
      margin-bottom: 18px;
      line-height: 1.3;
    }
    
    h2 {
      font-size: 10.5pt;
      font-weight: bold;
      color: #000000;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 2px;
      margin-top: 20px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    h3 {
      font-size: 10pt;
      font-weight: bold;
      margin-top: 10px;
      margin-bottom: 4px;
      color: #111111;
    }
    
    p {
      margin: 0 0 5px 0;
      text-align: justify;
    }
    
    ul {
      margin: 0 0 8px 0;
      padding-left: 18px;
    }
    
    li {
      margin-bottom: 3px;
      list-style-type: disc;
      text-align: justify;
    }
    
    strong {
      font-weight: bold;
      color: #000000;
    }
    
    hr {
      border: none;
      border-top: 1.5px solid #000000;
      margin: 12px 0;
    }

    @media print {
      body {
        background-color: white;
      }
    }
  </style>
</head>
<body>
  <div id="content-container"></div>
  <script>
    const rawMarkdown = ${JSON.stringify(cleanedCv)};
    const lines = rawMarkdown.split('\\n');
    let html = '';
    let inList = false;
    
    const flushList = () => {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
    };

    const parseBold = (text) => {
      return text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        flushList();
        html += '<h1>' + trimmed.substring(2) + '</h1>';
      } else if (trimmed.startsWith('## ')) {
        flushList();
        html += '<h2>' + trimmed.substring(3) + '</h2>';
      } else if (trimmed.startsWith('### ')) {
        flushList();
        html += '<h3>' + trimmed.substring(4) + '</h3>';
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
        html += '<li>' + parseBold(trimmed.substring(2)) + '</li>';
      } else if (trimmed === '---') {
        flushList();
        html += '<hr />';
      } else if (trimmed !== '') {
        flushList();
        const parsed = parseBold(trimmed);
        const isHeaderLine = index < 8 && (trimmed.includes('|') || trimmed.includes('@') || trimmed.includes('•') || trimmed.includes('github.com') || trimmed.includes('linkedin.com'));
        if (isHeaderLine) {
          html += '<div class="contact-info">' + parsed + '</div>';
        } else {
          html += '<p>' + parsed + '</p>';
        }
      } else {
        flushList();
      }
    });
    
    flushList();
    
    document.getElementById('content-container').innerHTML = html;
    
    // Automatically trigger print dialog
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
      `;

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } catch (err) {
      console.error("Print popup window blocked or failed, falling back:", err);
      window.print();
    }
  };

  const renderMarkdownAsHtml = (markdown: string) => {
    // Sanitize any literal \N, \n or double backslashes in markdown text
    const sanitized = (markdown || "")
      .replace(/\\N/gi, "\n")
      .replace(/\\n/gi, "\n")
      .replace(/\\r/gi, "")
      .trim();

    const lines = sanitized.split("\n");
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];
    
    const flushList = (key: number) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${key}`} className="list-disc pl-5 mb-3.5 space-y-1 text-slate-900 text-[11.5px] leading-relaxed font-serif">
            {currentList.map((li, idx) => (
              <li key={idx} className="text-justify">{parseBold(li)}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const parseBold = (text: string) => {
      const parts = text.split(/\*\*(.*?)\*\*/g);
      return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold text-black">{part}</strong> : part));
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        flushList(index);
        elements.push(
          <h1 key={index} className="text-lg font-bold text-black text-center uppercase tracking-normal mt-2 mb-1.5 font-serif">
            {trimmed.substring(2)}
          </h1>
        );
      } else if (trimmed.startsWith("## ")) {
        flushList(index);
        elements.push(
          <h2 key={index} className="text-[11.5px] font-bold text-black uppercase tracking-wider border-b-1.5 border-black pb-0.5 mt-5 mb-2.5 font-serif text-left">
            {trimmed.substring(3)}
          </h2>
        );
      } else if (trimmed.startsWith("### ")) {
        flushList(index);
        elements.push(
          <h3 key={index} className="text-[11.5px] font-bold text-neutral-900 mt-3.5 mb-1 font-serif text-left">
            {trimmed.substring(4)}
          </h3>
        );
      } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        currentList.push(trimmed.substring(2));
      } else if (trimmed === "---") {
        flushList(index);
        elements.push(<hr key={index} className="border-t-1.5 border-black my-3" />);
      } else if (trimmed !== "") {
        flushList(index);
        // Check if it looks like contact details
        const isHeaderP = index < 8 && (trimmed.includes("|") || trimmed.includes("@") || trimmed.includes("•") || trimmed.includes("github.com") || trimmed.includes("linkedin.com"));
        elements.push(
          <p key={index} className={`text-slate-900 leading-relaxed text-[11.5px] mb-2 font-serif text-justify ${isHeaderP ? "text-center text-slate-600 font-sans text-[10px] tracking-normal mb-4" : ""}`}>
            {parseBold(trimmed)}
          </p>
        );
      } else {
        flushList(index);
      }
    });
    
    flushList(lines.length);
    return elements;
  };

  const handleReset = () => {
    setStep(1);
    setEvaluationResult(null);
    setOptimizedCv(null);
    setError(null);
    setCustomBullet("");
    setCustomBulletResults([]);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setCvText("");
  };

  const handleLoadHistoryItem = (item: ScanHistoryItem) => {
    setJobDescription(item.jobDescription);
    setCvText(item.cvSnippet);
    setUploadedFileName("curriculum_guardado_historial.pdf");
    setUploadedFileSize("128 KB");
    setEvaluationResult(item.result);
    setStep(2);
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    saveHistory(updated);
  };

  // UI helper for score colors
  const getScoreColor = (score: number) => {
    if (score >= 80) return { border: "stroke-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", badge: "Excelente" };
    if (score >= 60) return { border: "stroke-amber-500", text: "text-amber-600", bg: "bg-amber-50", badge: "Medio" };
    return { border: "stroke-rose-500", text: "text-rose-600", bg: "bg-rose-50", badge: "Crítico" };
  };

  const scoreInfo = evaluationResult ? getScoreColor(evaluationResult.puntuacion) : { border: "stroke-blue-500", text: "text-blue-600", bg: "bg-blue-50", badge: "Evaluando" };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-blue-600/10 selection:text-blue-900">
      
      {/* HEADER: strictly "ATS checker" only */}
      <header className="border-b border-slate-200 bg-white py-5 px-6 sticky top-0 z-50 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleReset}>
            <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-md shadow-blue-600/15">
              ✓
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ATS Checker - USA PLACEMENT PROGRAM
            </h1>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>LECTOR INTELIGENTE ACTIVO</span>
          </div>
        </div>
      </header>

      {/* STEP PROGRESS INDICATOR */}
      <div className="bg-white border-b border-slate-200 py-5 px-4 shadow-2xs">
        <div className="max-w-3xl mx-auto flex justify-between items-center text-xs font-mono">
          <button
            onClick={() => { if (step > 1) setStep(1); }}
            className={`flex items-center space-x-2 pb-1.5 border-b-2 transition-all cursor-pointer ${
              step === 1 ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-400 hover:text-slate-900"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] mr-1">1</span>
            <span>Importar CV</span>
          </button>
          <div className="h-px bg-slate-200 flex-1 mx-4 mb-1.5" />
          <button
            onClick={() => { if (evaluationResult) setStep(2); }}
            disabled={!evaluationResult}
            className={`flex items-center space-x-2 pb-1.5 border-b-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              step === 2 ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-400 hover:text-slate-900"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] mr-1">2</span>
            <span>Lectura y Resultados</span>
          </button>
          <div className="h-px bg-slate-200 flex-1 mx-4 mb-1.5" />
          <button
            onClick={() => { if (optimizedCv) setStep(3); }}
            disabled={!optimizedCv}
            className={`flex items-center space-x-2 pb-1.5 border-b-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              step === 3 ? "border-blue-600 text-blue-600 font-bold" : "border-transparent text-slate-400 hover:text-slate-900"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] mr-1">3</span>
            <span>CV Optimizado</span>
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* ERROR MESSAGE NOTIFICATION */}
        {error && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 animate-fadeIn">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-rose-500" />
            <div className="flex-1">
              <h4 className="font-bold text-sm text-rose-900">Hubo un detalle al procesar</h4>
              <p className="text-xs text-rose-800/80 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-rose-600 hover:underline font-mono font-bold"
            >
              CERRAR
            </button>
          </div>
        )}

        {/* LOADING SCREEN: STEP 1 TO STEP 2 */}
        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px] shadow-sm">
            <div className="relative flex items-center justify-center w-20 h-20">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping" />
              <div className="absolute inset-2 bg-blue-50 rounded-full animate-pulse" />
              <div className="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Leyendo y Analizando tu CV Conscientemente...
              </h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                El motor inteligente está escaneando la estructura de tu archivo, aislando datos personales, extrayendo viñetas de experiencia y cruzándolas con las palabras clave requeridas.
              </p>
            </div>
          </div>
        )}

        {/* LOADING SCREEN: STEP 2 TO STEP 3 */}
        {loadingStep3 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px] shadow-sm">
            <div className="relative flex items-center justify-center w-20 h-20">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping" />
              <div className="absolute inset-2 bg-blue-50 rounded-full animate-pulse" />
              <div className="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Redactando Borrador de Impacto en Inglés...
              </h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                Aplicando correcciones de formato de USA, transformando tus tareas de LATAM en logros con métricas cuantificables de alto impacto y redactando el resultado final.
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: IMPORT CV (FILE ONLY) & JOB DESCRIPTION */}
        {!loading && !loadingStep3 && step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            {/* INSTRUCTIONAL BANNER */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Escanea tu CV contra los filtros ATS de USA
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Nuestra IA analizará conscientemente tu currículum, detectará alertas rojas de formato y generará una versión optimizada en inglés para el mercado estadounidense.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Paso 1: Carga tus Datos de Postulación
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Sube tu archivo y pega la descripción del cargo para iniciar el análisis automático.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSamples}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Probar con ejemplo de la plataforma</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* LEFT BLOCK: CONSCIOUS FILE UPLOADER */}
                <div className="flex flex-col space-y-3">
                  <label className="text-xs text-slate-700 uppercase font-bold tracking-[0.1em] border-l-2 border-blue-600 pl-3 flex items-center space-x-2">
                    <span>1. Cargar tu CV o Resumen</span>
                    <span className="text-[10px] text-blue-600 font-mono italic">(PDF, DOCX, TXT)</span>
                  </label>

                  {!uploadedFileName ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      onClick={triggerFileInput}
                      className="border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-72"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.doc,.txt,.rtf,.md"
                        className="hidden"
                      />
                      <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-xs text-slate-400 mb-4 group-hover:text-blue-600 transition-colors">
                        <UploadCloud className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        Arrastra tu currículum aquí
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                        o haz clic para explorar tus archivos locales
                      </p>
                      <span className="text-[10px] text-slate-400 mt-4 font-mono">
                        Máximo 10MB • Solo lectura segura
                      </span>
                    </div>
                  ) : (
                    <div className="border border-slate-200 bg-blue-50/10 rounded-xl p-6 flex flex-col justify-between h-72">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                              <File className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                                {uploadedFileName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {uploadedFileSize}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedFileName(null);
                              setUploadedFileSize(null);
                              setCvText("");
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Remover archivo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                            Estado del Análisis
                          </span>
                          <div className="flex items-center space-x-1.5 text-xs text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-medium truncate">Archivo precargado correctamente</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            La IA leerá este archivo de manera consciente para detectar omisiones, formatos incorrectos y reestructurar tus logros.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold font-mono uppercase text-left hover:underline cursor-pointer"
                      >
                        Cambiar archivo
                      </button>
                    </div>
                  )}
                </div>

                {/* RIGHT BLOCK: JOB DESCRIPTION */}
                <div className="flex flex-col space-y-3">
                  <label className="text-xs text-slate-700 uppercase font-bold tracking-[0.1em] border-l-2 border-blue-600 pl-3 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>2. Pegar la Oferta / Job Description</span>
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Pega aquí la descripción del puesto o rol deseado en EE.UU. para poder calcular el nivel de compatibilidad de habilidades..."
                    className="w-full h-72 px-4 py-3 bg-slate-50 hover:bg-slate-100/40 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl focus:outline-hidden text-xs text-slate-700 transition-all font-mono resize-none leading-relaxed"
                  />
                </div>

              </div>

              {/* ACTION ROW */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={!uploadedFileName || !jobDescription.trim()}
                  className="w-full sm:w-72 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold text-xs uppercase font-mono tracking-wider rounded-lg transition-all flex items-center justify-center space-x-2 shadow-md shadow-blue-600/10 cursor-pointer"
                >
                  <span>Analizar Compatibilidad (Paso 2)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {(uploadedFileName || jobDescription.trim()) && (
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Limpiar todo e iniciar de cero
                  </button>
                )}
              </div>
            </div>

            {/* HISTORIAL LOCAL */}
            {history.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Historial de Análisis Anteriores</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleLoadHistoryItem(item)}
                      className="p-4 bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <span className="text-[9px] font-mono text-slate-400 block">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5 group-hover:text-blue-600 transition-colors">
                          {item.jobTitle}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-bold font-mono text-blue-600">
                            {item.result.puntuacion}% Match
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono uppercase">
                            • {item.result.pasaFiltro ? "Apto" : "Optimizar"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-slate-100 rounded transition-all"
                          title="Eliminar del registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: LECTURA Y RESULTADOS */}
        {!loading && !loadingStep3 && step === 2 && evaluationResult && (
          <div className="space-y-8 animate-fadeIn">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Paso 2: Evaluación y Lectura de Filtros ATS
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Resultados del análisis detallado. Hemos revisado la estructura del CV y detectado brechas contra la descripción de la oferta.
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Subir otro CV</span>
                </button>
              </div>

              {/* STRENGTH SCORE GAUGE BANNER */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                {/* Circular Gauge */}
                <div className="col-span-1 md:col-span-4 flex flex-col items-center justify-center py-2 border-b md:border-b-0 md:border-r border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 font-mono">
                    NIVEL DE COINCIDENCIA (STRENGTH)
                  </span>
                  
                  {/* Visual gauge matching the ResumeNow screenshot */}
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="50" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                      <circle
                        cx="64"
                        cy="64"
                        r="50"
                        stroke={evaluationResult.pasaFiltro ? "#10b981" : "#f59e0b"}
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 * (1 - evaluationResult.puntuacion / 100)}
                        className="transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-center flex flex-col items-center">
                      <span className={`text-4xl font-extrabold text-slate-900`}>
                        {evaluationResult.puntuacion}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                        {scoreInfo.badge}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score Status and quick action */}
                <div className="col-span-1 md:col-span-8 space-y-4 pl-0 md:pl-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {evaluationResult.pasaFiltro ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Apto para postulaciones USA</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                        <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                        <span>Requiere optimizar viñetas e info</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {evaluationResult.pasaFiltro
                      ? "Tu currículum está bien estructurado y listo. No obstante, puedes generar la traducción automática impecable y añadir viñetas cuantificables de impacto estilo americano en el Paso 3."
                      : "¡Detectamos oportunidades de mejora! Tu CV tiene alertas rojas (formato personal no admitido en EE. UU. o falta de métricas de impacto). Haz clic en el botón de abajo para generar tu borrador reestructurado."}
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={handleOptimizeCV}
                      className="w-full sm:w-auto py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase font-mono tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md shadow-blue-600/10 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Optimizar CV Completo con IA (Paso 3)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SPLIT VIEW: REAL CV MOCKUP WITH LABELS VS RECOMMENDED REWRITES */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: VISUAL CV DOCUMENT PREVIEW WITH REAL-TIME BADGES (Screenshot 3 style) */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
                  Vista Previa del CV Analizado (Borrador)
                </span>

                <div className="border border-slate-200 rounded-xl bg-slate-50/40 p-4 relative overflow-hidden">
                  {/* Top Header Mockup */}
                  <div className="border-b border-slate-200 pb-3 mb-4 space-y-2 relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 tracking-tight uppercase">
                          {evaluationResult.parsedName || "Rodrigo Alvarado"}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {evaluationResult.parsedTitle || "Especialista en Marketing / Paid Media"}
                        </p>
                      </div>
                      
                      {/* Alert indicator badge */}
                      {evaluationResult.alertasRojas && evaluationResult.alertasRojas.length > 0 ? (
                        <span className="bg-rose-50 text-rose-600 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-rose-200 flex items-center space-x-1 shrink-0">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                          <span>Info Personal • {evaluationResult.alertasRojas.length} Alertas</span>
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-600 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center space-x-1 shrink-0">
                          <span>Info Personal • Apto</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-500 italic leading-tight">
                      {evaluationResult.parsedContactInfo || "Perú | rodrigoalto25@gmail.com"}
                    </p>
                  </div>

                  {/* Summary Section Mockup */}
                  <div className="space-y-1 mb-4 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider font-mono">RESUMEN PROFESIONAL</span>
                      <span className="bg-emerald-50 text-emerald-600 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                        Pasa Filtro
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-relaxed">
                      {evaluationResult.parsedSummary || "Digital marketing specialist with experience in paid media, digital strategy, and social media management..."}
                    </p>
                  </div>

                  {/* Experience Section Mockup */}
                  <div className="space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider font-mono">EXPERIENCIA LABORAL</span>
                      {evaluationResult.impactoYLogros && evaluationResult.impactoYLogros.length > 0 ? (
                        <span className="bg-rose-50 text-rose-600 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-rose-200 flex items-center space-x-1">
                          <span>Experiencia • {evaluationResult.impactoYLogros.length} Alertas</span>
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-600 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-200">
                          Excelente
                        </span>
                      )}
                    </div>

                    {evaluationResult.parsedExperiences && evaluationResult.parsedExperiences.length > 0 ? (
                      <div className="space-y-3">
                        {evaluationResult.parsedExperiences.slice(0, 3).map((exp, expIdx) => (
                          <div key={expIdx} className="space-y-1 bg-slate-100/50 p-2 rounded border border-slate-200/50">
                            <p className="text-[9px] font-bold text-slate-800">{exp.companyAndRole}</p>
                            <ul className="text-[8.5px] text-slate-500 list-disc list-inside space-y-0.5 pl-1">
                              {exp.bullets.slice(0, 3).map((bullet, bulletIdx) => {
                                // check if this bullet has some overlap with a weak original bullet
                                const isWeak = evaluationResult.impactoYLogros.some(
                                  (imp) => imp.original.toLowerCase().includes(bullet.toLowerCase().trim()) || 
                                           bullet.toLowerCase().includes(imp.original.toLowerCase().trim())
                                );
                                return (
                                  <li key={bulletIdx} className={`${isWeak ? "text-amber-800 font-semibold bg-amber-50 px-1 rounded" : ""}`}>
                                    {bullet}
                                  </li>
                                );
                              })}
                            </ul>
                            {/* If any bullet in this experience was matched as weak, suggest quantifying */}
                            {exp.bullets.some(bullet => 
                              evaluationResult.impactoYLogros.some(
                                (imp) => imp.original.toLowerCase().includes(bullet.toLowerCase().trim()) || 
                                         bullet.toLowerCase().includes(imp.original.toLowerCase().trim())
                              )
                            ) && (
                              <div className="text-[8px] text-amber-600 font-mono mt-1 font-bold">
                                ⚠️ Falta cuantificar impacto (U.S. metrics)
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1 bg-rose-50/20 p-2 rounded border border-rose-100">
                        <p className="text-[9px] font-bold text-slate-800">Haley Marketing Group — Paid Media Manager</p>
                        <ul className="text-[9px] text-slate-500 list-disc list-inside space-y-0.5">
                          <li>Work with +20 clients doing PPC for the staffing industry</li>
                          <li>Created PPC frameworks, generated benchmarks</li>
                          <li>Invested over $70,000 monthly in Meta and Google Ads</li>
                        </ul>
                        <div className="text-[8px] text-rose-600 font-mono mt-1 font-bold">
                          ⚠️ Falta cuantificar impacto (U.S. metrics)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Skills Section Mockup */}
                  <div className="space-y-2 mt-4 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider font-mono">HABILIDADES</span>
                      {evaluationResult.palabrasClaveFaltantes && evaluationResult.palabrasClaveFaltantes.length > 0 ? (
                        <span className="bg-amber-50 text-amber-600 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-amber-200">
                          {evaluationResult.palabrasClaveFaltantes.length} Faltantes
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-600 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-200">
                          Completo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {evaluationResult.parsedSkills && evaluationResult.parsedSkills.slice(0, 8).map((skill, sIdx) => (
                        <span key={sIdx} className="text-[8px] bg-slate-150 text-slate-600 px-1.5 py-0.5 rounded font-mono border border-slate-200">
                          {skill}
                        </span>
                      ))}
                      {evaluationResult.palabrasClaveFaltantes && evaluationResult.palabrasClaveFaltantes.slice(0, 4).map((kw, kwIdx) => (
                        <span key={kwIdx} className="text-[8px] bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded font-mono font-bold">
                          {kw} ✗
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 text-[11px] text-slate-500 leading-relaxed font-mono">
                  💡 <strong className="text-slate-800">U.S. standard standard tip:</strong> En EE.UU. incluir estado civil, fecha de nacimiento o nacionalidad es motivo de descarte directo por leyes antidiscriminación. Nuestra optimización lo corregirá de inmediato.
                </div>
              </div>

              {/* RIGHT COLUMN: ACCORDION-STYLE IMPROVEMENT OPPORTUNITIES (Screenshot 2 style) */}
              <div className="lg:col-span-7 space-y-6">
                <h3 className="text-xs text-slate-500 uppercase font-bold tracking-[0.2em] border-l-2 border-blue-600 pl-3">
                  Oportunidades de Mejora Detectadas (U.S. Standard)
                </h3>

                {/* ACCORDION CONTAINER */}
                <div className="space-y-3">
                  
                  {/* Category 1: Personalization / Red Flags */}
                  <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                    <button
                      onClick={() => setActiveAccordion(activeAccordion === "personalization" ? null : "personalization")}
                      className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-rose-50 text-rose-600 rounded">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <span className="text-sm">1. Información Personal Inapropiada (Evitar Discriminación)</span>
                      </div>
                      {activeAccordion === "personalization" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    
                    {activeAccordion === "personalization" && (
                      <div className="px-5 pb-5 pt-1 space-y-3 border-t border-slate-100 bg-slate-50/10">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          La ley estadounidense prohíbe evaluar candidatos según edad, estado civil u origen geográfico. Debes eliminar estos datos sensibles de tu currículum:
                        </p>
                        {evaluationResult.alertasRojas.length === 0 ? (
                          <div className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                            <Check className="w-4 h-4" /> <span>¡Perfecto! Sin alertas sensibles de discriminación en tu archivo.</span>
                          </div>
                        ) : (
                          <ul className="space-y-1.5">
                            {evaluationResult.alertasRojas.map((alert, i) => (
                              <li key={i} className="text-xs text-slate-700 flex items-start space-x-2">
                                <span className="text-rose-500 font-bold shrink-0">•</span>
                                <span className="font-mono bg-rose-50/40 border border-rose-100/60 px-1 rounded text-rose-800">{alert}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Category 2: Tangible Achievements / Metrics */}
                  <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                    <button
                      onClick={() => setActiveAccordion(activeAccordion === "achievements" ? null : "achievements")}
                      className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className="text-sm">2. Redacción Orientada a Logros (Métricas Cuantificables)</span>
                      </div>
                      {activeAccordion === "achievements" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {activeAccordion === "achievements" && (
                      <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100 bg-slate-50/10">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          En EE. UU., los directores de contratación esperan ver verbos de acción fuertes y porcentajes o números medibles. Mira cómo reescribiremos tus viñetas:
                        </p>
                        
                        <div className="space-y-3">
                          {evaluationResult.impactoYLogros.map((item, idx) => (
                            <div key={idx} className="border border-slate-100 rounded-lg bg-white overflow-hidden">
                              <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">Recomendación #{idx + 1}</span>
                              </div>
                              <div className="p-3 space-y-2 text-xs">
                                <div className="text-slate-400">
                                  <strong className="text-rose-500 font-bold">Antes (Pasiva):</strong> "{item.original}"
                                </div>
                                <div className="text-slate-950 font-mono bg-blue-50/30 p-2 rounded border border-blue-100 text-blue-900">
                                  <strong className="text-blue-600">Después (Estilo USA):</strong> "{item.sugerencia}"
                                </div>
                                <div className="text-[10.5px] text-slate-500 italic">
                                  💡 <strong>Razonamiento:</strong> {item.explicacion}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Category 3: Keywords Gap */}
                  <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                    <button
                      onClick={() => setActiveAccordion(activeAccordion === "skills" ? null : "skills")}
                      className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded">
                          <Hash className="w-4 h-4" />
                        </div>
                        <span className="text-sm">3. Palabras Clave Obligatorias en el Perfil</span>
                      </div>
                      {activeAccordion === "skills" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {activeAccordion === "skills" && (
                      <div className="px-5 pb-5 pt-1 space-y-3 border-t border-slate-100 bg-slate-50/10">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Los softwares ATS puntúan los candidatos analizando la coincidencia exacta de términos clave. Tu CV necesita incluir estos términos de inmediato:
                        </p>
                        {evaluationResult.palabrasClaveFaltantes.length === 0 ? (
                          <p className="text-xs text-emerald-600 font-semibold">✓ Tienes todas las palabras clave necesarias.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {evaluationResult.palabrasClaveFaltantes.map((kw, i) => (
                              <span key={i} className="text-[11px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded font-mono font-bold">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* BOTTOM ACTION CARD */}
                <div className="bg-blue-600 p-6 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md shadow-blue-600/10">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-80">
                      ¿CÓMO RESOLVER ESTOS ERRORES?
                    </span>
                    <h4 className="text-base font-bold">Optimiza tu currículum de manera integral</h4>
                    <p className="text-xs text-blue-100 leading-relaxed">
                      Permite que la IA reescriba de manera inteligente todo tu CV en inglés adaptado al estándar americano en un solo clic.
                    </p>
                  </div>
                  <button
                    onClick={handleOptimizeCV}
                    className="w-full sm:w-auto py-3 px-6 bg-white text-blue-600 hover:bg-blue-50 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    Optimizar mi CV completo →
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* STEP 3: EL RESUMEN CON LAS MEJORAS */}
        {!loading && !loadingStep3 && step === 3 && optimizedCv && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* OPTIMIZED SCREEN MAIN LAYOUT */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <CheckCircle2 className="w-5.5 h-5.5 text-emerald-500" />
                    <span>Paso 3: Borrador Optimizado Estilo U.S.</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tu CV ha sido reestructurado de manera consciente, eliminando datos discriminatorios e inyectando palabras clave.
                  </p>
                </div>
                
                <button
                  onClick={handleReset}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider border border-slate-200 transition-colors cursor-pointer"
                >
                  Nuevo Análisis
                </button>
              </div>

              {/* RECRUITER CHANGES EXPLANATION CHIP */}
              <div className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider font-mono">
                    MEJORAS APLICADAS EN ESTE BORRADOR
                  </span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans pl-6">
                  {optimizedCv.summaryOfImprovements}
                </div>
              </div>

              {/* CORE CV DRAFT DISPLAY */}
              <div className="space-y-4 pt-2">
                <style>{`
                  @media print {
                    /* Hide ALL elements by default */
                    body * {
                      visibility: hidden !important;
                    }
                    /* Show only the CV print area and its children */
                    #cv-print-area-wrapper, #cv-print-area-wrapper * {
                      visibility: visible !important;
                    }
                    #cv-print-area-wrapper {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100% !important;
                      max-width: 100% !important;
                      border: none !important;
                      box-shadow: none !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      background: white !important;
                    }
                    #cv-print-area {
                      border: none !important;
                      box-shadow: none !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      max-height: none !important;
                      overflow: visible !important;
                    }
                    .no-print {
                      display: none !important;
                      visibility: hidden !important;
                    }
                  }
                `}</style>

                {/* TAB SWITCHER AND EXPORT ACTION BAR */}
                <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  {/* TABS */}
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCvViewMode("preview")}
                      className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        cvViewMode === "preview"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Diseño Profesional (PDF)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCvViewMode("markdown")}
                      className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        cvViewMode === "markdown"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Texto Plano Markdown (ATS)</span>
                    </button>
                  </div>

                  {/* DOWNLOAD ACTIONS */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadDocx}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      title="Descargar como archivo de Word (.doc)"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>Descargar Word (.doc)</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={handlePrintPdf}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                      title="Imprimir o guardar como PDF en tu navegador"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Guardar / Imprimir PDF</span>
                    </button>
                  </div>
                </div>

                {/* CONTENT AREA */}
                <div id="cv-print-area-wrapper" className="pt-2">
                  {cvViewMode === "preview" ? (
                    <div className="space-y-4">
                      <div className="no-print p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 leading-normal flex items-start space-x-2">
                        <span className="shrink-0 mt-0.5">💡</span>
                        <span>
                          <strong>Formato optimizado para EE.UU.:</strong> Diseñado en una sola columna limpia, con tipografía clásica, ideal para pasar los filtros de lectura de los ATS. Haz clic en <strong>Guardar / Imprimir PDF</strong> y selecciona la opción <strong>"Guardar como PDF"</strong> en la ventana emergente para obtener tu archivo.
                        </span>
                      </div>
                      
                      <div id="cv-print-area" className="bg-white border border-slate-300 rounded-xl p-8 sm:p-12 shadow-sm text-black font-serif max-w-3xl mx-auto cursor-text text-left max-h-[600px] overflow-y-auto select-text leading-relaxed">
                        <div className="prose prose-slate max-w-none font-serif">
                          {renderMarkdownAsHtml(optimizedCv.optimizedCvDraft)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="no-print flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest block">
                          CÓDIGO MARKDOWN LISTO PARA COPIAR:
                        </span>
                        
                        <button
                          type="button"
                          onClick={handleCopyDraft}
                          className="flex items-center justify-center space-x-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                        >
                          {copiedDraft ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>¡COPIADO!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>COPIAR TEXTO</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-6 bg-slate-900 border border-slate-950 rounded-xl font-mono text-xs text-slate-300 h-[600px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner">
                        {optimizedCv.optimizedCvDraft}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* BONUS CUSTOM INDIVIDUAL BULLET TUNER */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Mejorador de Viñetas Individuales Adicionales</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  ¿Quieres seguir puliendo logros adicionales de tu experiencia? Escribe cualquier tarea simple abajo y el motor de IA redactará 3 alternativas con métricas cuantificables de alto impacto.
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  value={customBullet}
                  onChange={(e) => setCustomBullet(e.target.value)}
                  placeholder="Ej: 'Mantenimiento del sitio web de la tienda y solución de bugs que reportaban.'"
                  className="w-full h-20 px-4 py-3 bg-slate-50 hover:bg-slate-100/40 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-700 transition-all font-mono resize-none"
                />

                <div className="flex justify-between items-center">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const sample = "Desarrollo de bases de datos relacionales en Postgres.";
                        setCustomBullet(sample);
                        handleImproveCustomBullet(sample);
                      }}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 px-2 py-1 rounded transition-colors font-mono cursor-pointer"
                    >
                      Probar ejemplo: "Desarrollo de bases de datos..."
                    </button>
                  </div>

                  <button
                    onClick={() => handleImproveCustomBullet(customBullet)}
                    disabled={customBulletLoading || !customBullet.trim()}
                    className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold text-[10px] uppercase font-mono tracking-wider rounded transition-all cursor-pointer"
                  >
                    {customBulletLoading ? "Analizando..." : "Mejorar Viñeta con IA"}
                  </button>
                </div>
              </div>

              {/* Bullet improvements rendering */}
              {customBulletResults.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-fadeIn">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest block">
                    3 ALTERNATIVAS DE LOGROS DE IMPACTO GENERADAS:
                  </span>
                  <div className="grid grid-cols-1 gap-3">
                    {customBulletResults.map((item, index) => (
                      <div key={index} className="p-4 bg-slate-50 border border-slate-200 hover:border-blue-200 rounded-xl relative group transition-all">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded uppercase">
                            Opción {index + 1}
                          </span>
                          <button
                            onClick={() => handleCopyBullet(item.version, index)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                            title="Copiar frase mejorada"
                          >
                            {copiedBulletIndex === index ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-900 font-mono font-medium leading-relaxed pr-6">{item.version}</p>
                        <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed border-t border-slate-200/60 pt-1.5">
                          <strong>Razonamiento del reclutador: </strong>{item.explicacion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RETURN BUTTON */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleReset}
                className="py-3 px-6 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 font-bold text-xs uppercase font-mono tracking-wider rounded-lg transition-all cursor-pointer"
              >
                ← Volver a Evaluar Otro Currículum
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-20 text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="font-mono">
            © {new Date().getFullYear()} ATS checker. Diseñado bajo estándares de reclutamiento Tier-1 de Estados Unidos.
          </p>
          <div className="flex space-x-4 font-mono uppercase text-[9px] tracking-wider">
            <a href="#" className="hover:text-slate-700 transition-colors">Privacidad</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-700 transition-colors">Normativa</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
