import React, { useState } from "react";
import {
  Award,
  AlertTriangle,
  ClipboardList,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Hash,
  ArrowRight,
  TrendingUp,
  FileText,
  BookmarkCheck,
} from "lucide-react";
import { EvaluationResult } from "../types";
import BulletImprover from "./BulletImprover";

interface ResultsDashboardProps {
  result: EvaluationResult;
  jobDescription: string;
}

export default function ResultsDashboard({ result, jobDescription }: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"texto" | "keywords" | "impact" | "redflags">("texto");
  const [copied, setCopied] = useState(false);

  // States to track which improvements or issues the user has resolved
  const [resolvedKeywords, setResolvedKeywords] = useState<Record<string, boolean>>({});
  const [resolvedImpact, setResolvedImpact] = useState<Record<number, boolean>>({});
  const [resolvedRedflags, setResolvedRedflags] = useState<Record<number, boolean>>({});

  const handleCopyText = () => {
    navigator.clipboard.writeText(result.textoRespuestaObligatoria);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleKeyword = (kw: string) => {
    setResolvedKeywords((prev) => ({ ...prev, [kw]: !prev[kw] }));
  };

  const toggleImpact = (idx: number) => {
    setResolvedImpact((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleRedflag = (idx: number) => {
    setResolvedRedflags((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Metrics summary
  const totalKeywords = result.palabrasClaveFaltantes.length;
  const resolvedKeywordsCount = Object.values(resolvedKeywords).filter(Boolean).length;

  const totalImpacts = result.impactoYLogros.length;
  const resolvedImpactsCount = Object.values(resolvedImpact).filter(Boolean).length;

  const totalRedflags = result.alertasRojas.length;
  const resolvedRedflagsCount = Object.values(resolvedRedflags).filter(Boolean).length;

  // Total checklist progress
  const totalItems = totalKeywords + totalImpacts + totalRedflags;
  const totalResolved = resolvedKeywordsCount + resolvedImpactsCount + resolvedRedflagsCount;
  const checklistProgress = totalItems > 0 ? Math.round((totalResolved / totalItems) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. STATE & SCORE HEADER CARD */}
      <div className="bg-[#141414] border border-[#222] rounded-2xl shadow-xl overflow-hidden p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Match Score Gauge */}
          <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-[#222]">
            <span className="text-[10px] font-bold text-[#a1a1a1] uppercase tracking-widest mb-3">
              Coincidencia
            </span>
            <div className="relative flex items-center justify-center w-32 h-32">
              {/* Radial background bar */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-[#1f1f1f]"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className={`${
                    result.pasaFiltro ? "stroke-[#d4af37]" : "stroke-[#ff4b4b]"
                  } transition-all duration-1000 ease-out`}
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - result.puntuacion / 100)}
                  strokeLinecap="round"
                />
              </svg>
              {/* Score text */}
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-serif text-[#d4af37]">
                  {result.puntuacion}%
                </span>
                <span className="text-[9px] font-bold text-[#777] uppercase tracking-wider mt-0.5">
                  Match ATS
                </span>
              </div>
            </div>
          </div>

          {/* Filter Status Badge & Core Feedback */}
          <div className="md:col-span-2 flex flex-col justify-center space-y-4">
            <div>
              <span className="text-[10px] font-bold text-[#a1a1a1] uppercase tracking-widest">
                Estado del Filtro
              </span>
              <div className="flex items-center space-x-2 mt-1.5">
                {result.pasaFiltro ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-bold bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="uppercase tracking-wider">✅ Pasa el filtro ATS</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-bold bg-[#ff4b4b]/10 text-[#ff4b4b] border border-[#ff4b4b]/30">
                    <XCircle className="w-4 h-4" />
                    <span className="uppercase tracking-wider">❌ No pasa el filtro ATS</span>
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-[#999] leading-relaxed italic">
              {result.pasaFiltro
                ? "¡Excelente trabajo! Tu CV tiene un alineamiento muy fuerte con la vacante. Cumple con la mayoría de habilidades críticas y posee un formato adecuado. Te recomendamos revisar pequeñas oportunidades de mejora para maximizar tu impacto."
                : "Tu CV requiere optimizaciones clave para pasar el filtro automático. Faltan métricas críticas de impacto requeridas por empresas Tier-1 en USA."}
            </p>

            {/* Micro progress bar for user updates */}
            {totalItems > 0 && (
              <div className="pt-3 border-t border-[#222]">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-[#a1a1a1] flex items-center uppercase tracking-wider text-[10px]">
                    <BookmarkCheck className="w-3.5 h-3.5 mr-1.5 text-[#d4af37]" />
                    Progreso de tus Optimizaciones:
                  </span>
                  <span className="font-mono text-[#d4af37] font-bold">
                    {totalResolved}/{totalItems} completadas ({checklistProgress}%)
                  </span>
                </div>
                <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden border border-[#222]">
                  <div
                    className="bg-[#d4af37] h-full transition-all duration-300"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. TAB CONTROLS */}
      <div className="flex border border-[#222] overflow-x-auto whitespace-nowrap bg-[#111] p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("texto")}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === "texto"
              ? "bg-[#1a1a1a] text-white border border-[#2c2c2c] shadow-md"
              : "text-[#777] hover:text-white"
          }`}
        >
          <ClipboardList className="w-4 h-4 text-[#d4af37]" />
          <span>Feedback Oficial</span>
        </button>

        <button
          onClick={() => setActiveTab("keywords")}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === "keywords"
              ? "bg-[#1a1a1a] text-white border border-[#2c2c2c] shadow-md"
              : "text-[#777] hover:text-white"
          }`}
        >
          <Hash className="w-4 h-4 text-[#d4af37]" />
          <span>Palabras Clave ({totalKeywords})</span>
          {resolvedKeywordsCount > 0 && (
            <span className="bg-[#d4af37] text-black text-[10px] px-1.5 py-0.5 rounded font-bold">
              {resolvedKeywordsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("impact")}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === "impact"
              ? "bg-[#1a1a1a] text-white border border-[#2c2c2c] shadow-md"
              : "text-[#777] hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-[#d4af37]" />
          <span>Impacto ({totalImpacts})</span>
          {resolvedImpactsCount > 0 && (
            <span className="bg-[#d4af37] text-black text-[10px] px-1.5 py-0.5 rounded font-bold">
              {resolvedImpactsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("redflags")}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === "redflags"
              ? "bg-[#1a1a1a] text-white border border-[#2c2c2c] shadow-md"
              : "text-[#777] hover:text-white"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-[#ff4b4b]" />
          <span>Alertas Rojas ({totalRedflags})</span>
          {resolvedRedflagsCount > 0 && (
            <span className="bg-[#ff4b4b] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
              {resolvedRedflagsCount}
            </span>
          )}
        </button>
      </div>

      {/* 3. TAB PANELS */}
      <div className="bg-[#141414] border border-[#222] rounded-2xl shadow-xl p-6" id="dashboard-tab-content">
        {/* Tab 1: TEXTO OFICIAL (Markdown copy box) */}
        {activeTab === "texto" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-serif italic text-lg text-white">
                  Respuesta Oficial de Evaluación
                </h4>
                <p className="text-xs text-[#777]">
                  Esta es la estructura obligatoria de evaluación para tu CV. Cópiala directamente para tus notas.
                </p>
              </div>
              <button
                onClick={handleCopyText}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#222] text-[#d4af37] hover:text-white rounded-lg text-xs font-semibold transition-colors border border-[#333] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Feedback</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#0d0d0d] rounded-xl p-5 border border-[#222] font-mono text-xs text-[#e0e0e0] whitespace-pre-wrap overflow-auto max-h-96 leading-relaxed">
              {result.textoRespuestaObligatoria}
            </div>
          </div>
        )}

        {/* Tab 2: PALABRAS CLAVE FALTANTES */}
        {activeTab === "keywords" && (
          <div className="space-y-4">
            <div>
              <h4 className="font-serif italic text-lg text-white">
                Palabras Clave Faltantes para Optimizar
              </h4>
              <p className="text-xs text-[#777]">
                Los sistemas ATS analizan la presencia de estas palabras para darte puntuación. Haz clic en cada una para marcarla como agregada en tu CV.
              </p>
            </div>

            {result.palabrasClaveFaltantes.length === 0 ? (
              <div className="p-8 text-center text-[#777] border border-dashed border-[#333] rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-[#d4af37] mx-auto mb-2" />
                <p className="font-semibold text-white">¡Ninguna palabra clave faltante!</p>
                <p className="text-xs text-[#777] mt-1">Tu CV ya incluye los términos principales requeridos por el puesto.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {result.palabrasClaveFaltantes.map((kw, idx) => {
                  const isResolved = resolvedKeywords[kw] || false;
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleKeyword(kw)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 select-none ${
                        isResolved
                          ? "bg-[#d4af37]/10 border-[#d4af37]/40 text-[#d4af37]"
                          : "bg-[#111] hover:bg-[#181818] border-[#1f1f1f] text-[#e0e0e0] hover:border-[#333]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          isResolved
                            ? "bg-[#d4af37] border-[#d4af37] text-black"
                            : "border-[#333] bg-black"
                        }`}
                      >
                        {isResolved && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </div>
                      <span className={`text-sm font-medium ${isResolved ? "line-through text-[#666]" : ""}`}>
                        {kw}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: IMPACTO Y LOGROS GRID */}
        {activeTab === "impact" && (
          <div className="space-y-4">
            <div>
              <h4 className="font-serif italic text-lg text-white">
                Impacto y Logros (U.S. Style)
              </h4>
              <p className="text-xs text-[#777]">
                Los reclutadores en USA buscan saber exactamente qué lograste, no solo qué hacías. Compara tu redacción original con la alternativa de impacto optimizada.
              </p>
            </div>

            {result.impactoYLogros.length === 0 ? (
              <div className="p-8 text-center text-[#777] border border-dashed border-[#333] rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-[#d4af37] mx-auto mb-2" />
                <p className="font-semibold text-white">¡Excelente redacción de logros!</p>
                <p className="text-xs text-[#777] mt-1">No se detectaron viñetas pasivas. Tu CV describe bien tus métricas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {result.impactoYLogros.map((item, idx) => {
                  const isResolved = resolvedImpact[idx] || false;
                  return (
                    <div
                      key={idx}
                      className={`border rounded-2xl transition-all overflow-hidden ${
                        isResolved ? "border-[#d4af37]/40 bg-[#d4af37]/5" : "border-[#1f1f1f]"
                      }`}
                    >
                      {/* Header bar of comparison */}
                      <div
                        onClick={() => toggleImpact(idx)}
                        className={`px-4 py-3 border-b flex justify-between items-center cursor-pointer select-none ${
                          isResolved ? "bg-[#d4af37]/10 border-[#d4af37]/20" : "bg-[#111] border-[#1f1f1f]"
                        }`}
                      >
                        <span className="text-[10px] font-bold text-[#a1a1a1] uppercase tracking-wider font-mono">
                          Optimización de Impacto #{idx + 1}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${isResolved ? "text-[#d4af37]" : "text-[#777]"}`}>
                            {isResolved ? "Cambio aplicado" : "Marcar como corregido"}
                          </span>
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                              isResolved
                                ? "bg-[#d4af37] border-[#d4af37] text-black"
                                : "border-[#333] bg-black"
                            }`}
                          >
                            {isResolved && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                          </div>
                        </div>
                      </div>

                      {/* Content Comparison */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Before */}
                        <div className="bg-[#1a1a1a]/40 border border-rose-950/40 rounded-xl p-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#ff4b4b]/10 text-[#ff4b4b] border border-[#ff4b4b]/20 uppercase mb-2 font-mono tracking-wider">
                            Original en tu CV
                          </span>
                          <p className="text-xs text-[#a1a1a1] italic">"{item.original}"</p>
                        </div>

                        {/* After */}
                        <div className="bg-black/50 border border-[#d4af37]/20 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 uppercase font-mono tracking-wider">
                              Estilo USA (Con Logro y Métrica)
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(item.sugerencia);
                                alert("Copiado al portapapeles: " + item.sugerencia);
                              }}
                              className="text-xs text-[#d4af37] hover:text-white flex items-center space-x-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copiar frase</span>
                            </button>
                          </div>
                          <p className="text-sm text-white font-medium font-sans">
                            {item.sugerencia}
                          </p>
                        </div>
                      </div>

                      {/* Explanation */}
                      <div className="px-4 pb-4 pt-1 flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 rounded bg-[#d4af37] shrink-0 mt-2" />
                        <p className="text-xs text-[#999] leading-relaxed">
                          <strong className="text-white uppercase font-mono text-[9px] tracking-wider">Por qué es importante:</strong> {item.explicacion}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: ALERTAS ROJAS DEL MERCADO USA */}
        {activeTab === "redflags" && (
          <div className="space-y-4">
            <div>
              <h4 className="font-serif italic text-lg text-white">
                Alertas Rojas (Mercado USA)
              </h4>
              <p className="text-xs text-[#777]">
                En EE.UU., las leyes laborales prohíben incluir fotos, fecha de nacimiento, estado civil, o dirección exacta en los CVs para evitar sesgos. Eliminar estos elementos es obligatorio para evitar descartes inmediatos.
              </p>
            </div>

            {result.alertasRojas.length === 0 ? (
              <div className="p-8 text-center text-[#777] border border-dashed border-[#333] rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-[#d4af37] mx-auto mb-2" />
                <p className="font-semibold text-white">¡Tu CV está libre de alertas rojas!</p>
                <p className="text-xs text-[#777] mt-1">Cumple perfectamente con los estándares de privacidad y formato estadounidenses.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {result.alertasRojas.map((alert, idx) => {
                  const isResolved = resolvedRedflags[idx] || false;
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleRedflag(idx)}
                      className={`p-4 border rounded-xl flex items-center space-x-3 transition-colors cursor-pointer select-none ${
                        isResolved
                          ? "bg-emerald-950/10 border-emerald-900/20 text-[#666]"
                          : "bg-[#1a1a1a]/50 border-rose-950/40 hover:bg-[#1a1a1a]/80 text-[#e0e0e0]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          isResolved
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-rose-900 bg-black"
                        }`}
                      >
                        {isResolved ? (
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isResolved ? "line-through text-[#666]" : ""}`}>
                          {alert}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. SEAMLESS REWRITE BOX TO IMPROVE CURRENT CV ITEMS */}
      <BulletImprover jobDescription={jobDescription} />
    </div>
  );
}
