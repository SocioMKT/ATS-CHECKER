import React, { useState } from "react";
import { FileText, Clipboard, Sparkles, UserCheck, AlertCircle, HelpCircle } from "lucide-react";
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_CV } from "./SampleData";

interface NewEvaluationProps {
  onAnalyze: (jobDesc: string, cvText: string) => void;
  loading: boolean;
}

export default function NewEvaluation({ onAnalyze, loading }: NewEvaluationProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [cvText, setCvText] = useState("");

  const handleLoadJobSample = () => {
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
  };

  const handleLoadCvSample = () => {
    setCvText(SAMPLE_CV);
  };

  const handleLoadBothSamples = () => {
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setCvText(SAMPLE_CV);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jobDescription.trim() && cvText.trim()) {
      onAnalyze(jobDescription, cvText);
    }
  };

  const isFormValid = jobDescription.trim() && cvText.trim();

  return (
    <div className="bg-[#141414] border border-[#222] rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-[#111] border border-[#2c2c2c] text-white rounded-xl p-5 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 z-10">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#d4af37] text-black font-mono uppercase tracking-wider mb-1.5">
            USA REMOTO 🇺🇸
          </span>
          <h2 className="font-serif italic text-xl text-white tracking-tight">
            ¿Pasará tu CV de LATAM el Filtro ATS de USA?
          </h2>
          <p className="text-[#a1a1a1] text-xs max-w-xl leading-relaxed">
            Las empresas estadounidenses usan sistemas automáticos (ATS) para descartar al 75%. Además, los reclutadores descartan en 6 segundos si detectan alertas rojas culturales (como fotos o fecha de nacimiento).
          </p>
        </div>
        <button
          onClick={handleLoadBothSamples}
          type="button"
          className="bg-[#d4af37] hover:bg-[#c5a12e] text-black px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-md shrink-0 flex items-center space-x-1.5 z-10 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Probar con Ejemplo</span>
        </button>

        {/* Decorative backdrop mesh */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Job Description Column */}
          <div className="space-y-2 flex flex-col">
            <div className="flex justify-between items-center">
              <label className="text-xs text-[#a1a1a1] uppercase font-bold tracking-[0.1em] border-l-2 border-[#d4af37] pl-3 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-[#d4af37]" />
                <span>1. Job Description de USA</span>
              </label>
              <button
                onClick={handleLoadJobSample}
                type="button"
                className="text-xs text-[#d4af37] hover:text-[#e5c158] hover:underline font-semibold cursor-pointer"
              >
                Cargar plantilla USA
              </button>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Pega aquí todo el texto de la oferta de trabajo publicada en USA (preferiblemente en inglés)..."
              className="flex-1 w-full h-80 px-4 py-3 bg-[#0d0d0d] hover:bg-[#111] focus:bg-[#080808] border border-[#2c2c2c] focus:border-[#d4af37] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#d4af37]/10 text-[#e0e0e0] placeholder-slate-600 text-sm transition-all resize-none font-mono"
            />
          </div>

          {/* Candidate CV Column */}
          <div className="space-y-2 flex flex-col">
            <div className="flex justify-between items-center">
              <label className="text-xs text-[#a1a1a1] uppercase font-bold tracking-[0.1em] border-l-2 border-[#d4af37] pl-3 flex items-center space-x-1.5">
                <Clipboard className="w-4 h-4 text-[#d4af37]" />
                <span>2. Tu CV Actual (LATAM)</span>
              </label>
              <button
                onClick={handleLoadCvSample}
                type="button"
                className="text-xs text-[#d4af37] hover:text-[#e5c158] hover:underline font-semibold cursor-pointer"
              >
                Cargar plantilla LATAM
              </button>
            </div>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Pega aquí el texto extraído de tu CV actual (puedes copiar y pegar todo el texto de tu PDF o Word)..."
              className="flex-1 w-full h-80 px-4 py-3 bg-[#0d0d0d] hover:bg-[#111] focus:bg-[#080808] border border-[#2c2c2c] focus:border-[#d4af37] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#d4af37]/10 text-[#e0e0e0] placeholder-slate-600 text-sm transition-all resize-none font-mono"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-[#222] flex flex-col items-center justify-center space-y-3">
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full md:w-80 py-3.5 px-6 bg-gradient-to-r from-[#d4af37] to-[#e5c158] hover:from-[#c5a12e] hover:to-[#d4af37] disabled:from-[#222] disabled:to-[#222] disabled:text-[#555] text-black font-extrabold text-xs uppercase font-mono tracking-wider rounded-xl transition-all shadow-lg shadow-[#d4af37]/5 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Analizando con IA de Reclutador...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>EVALUAR PASO DE FILTRO ATS</span>
              </>
            )}
          </button>

          {!isFormValid && (
            <p className="text-[11px] text-[#777] text-center font-mono">
              Debes completar ambos campos para iniciar el escaneo de optimización.
            </p>
          )}
        </div>
      </form>

      {/* Warning/Educational grid */}
      <div className="pt-4 border-t border-[#222] grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#111] rounded-xl border border-[#1f1f1f] flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-[#ff4b4b] mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Cero discriminación</h4>
            <p className="text-[11px] text-[#999] leading-relaxed">
              En USA está prohibido por ley incluir foto, edad, fecha de nacimiento, género o estado civil. Su presencia causa descarte instantáneo.
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#111] rounded-xl border border-[#1f1f1f] flex items-start space-x-2.5">
          <HelpCircle className="w-4 h-4 text-[#d4af37] mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Habilidades del Job Description</h4>
            <p className="text-[11px] text-[#999] leading-relaxed">
              Los ATS buscan coincidencia semántica exacta de tecnologías y habilidades. Si el JD dice "PostgreSQL" y tu CV dice "DBs relacionales", el ATS no te dará puntaje.
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#111] rounded-xl border border-[#1f1f1f] flex items-start space-x-2.5">
          <Sparkles className="w-4 h-4 text-[#d4af37] mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">El Idioma del Éxito</h4>
            <p className="text-[11px] text-[#999] leading-relaxed">
              Para puestos remotos en USA, tu CV final debe estar escrito 100% en inglés. El Evaluador analiza el contexto para ayudarte a traducirlo de forma efectiva.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
