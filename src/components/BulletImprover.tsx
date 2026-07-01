import React, { useState } from "react";
import { Sparkles, Copy, Check, ChevronRight, MessageSquare, ListTodo, Info } from "lucide-react";
import { BulletImprovement, ImproveBulletResponse } from "../types";

interface BulletImproverProps {
  jobDescription?: string;
}

export default function BulletImprover({ jobDescription }: BulletImproverProps) {
  const [bullet, setBullet] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulletImprovement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const sampleBullets = [
    "Hice mantenimiento de la base de datos de clientes",
    "Arreglé bugs reportados por los usuarios en la web de React",
    "Lideré el equipo de desarrollo para nuevos proyectos",
    "Subí fotos de productos y creé páginas en WordPress",
  ];

  const handleImprove = async (textToImprove: string) => {
    if (!textToImprove.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch("/api/improve-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullet: textToImprove,
          jobDescription: jobDescription || "",
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al mejorar la viñeta.");
      }

      const data: ImproveBulletResponse = await response.json();
      setResults(data.mejoras || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ocurrió un error inesperado al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-[#141414] border border-[#222] rounded-2xl shadow-xl p-6" id="bullet-improver-card">
      <div className="flex items-center space-x-3 mb-5">
        <div className="p-2.5 bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 rounded-xl">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-serif italic text-lg text-white">
            Mejorador de Viñetas de Impacto (U.S. Style)
          </h3>
          <p className="text-xs text-[#a1a1a1]">
            Convierte tus tareas en logros cuantificables con métricas impactantes para convencer a los ATS de USA.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Predefined prompts */}
        <div>
          <span className="text-[10px] font-bold text-[#777] tracking-widest uppercase block mb-2.5">
            Ejemplos para probar:
          </span>
          <div className="flex flex-wrap gap-2">
            {sampleBullets.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setBullet(sample);
                  handleImprove(sample);
                }}
                className="text-xs bg-[#111] hover:bg-[#181818] hover:text-[#d4af37] text-[#a1a1a1] px-3.5 py-1.5 rounded-lg border border-[#1f1f1f] hover:border-[#d4af37]/40 transition-colors text-left cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Custom input */}
        <div className="relative">
          <textarea
            value={bullet}
            onChange={(e) => setBullet(e.target.value)}
            placeholder="Escribe aquí tu viñeta o frase del CV (ej: 'Mantenimiento del sitio web y solución de bugs')"
            className="w-full h-24 px-4 py-3 bg-[#0d0d0d] hover:bg-[#111] focus:bg-[#080808] border border-[#2c2c2c] focus:border-[#d4af37] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#d4af37]/10 text-white placeholder-slate-600 text-sm transition-all resize-none font-sans"
          />
          <div className="absolute bottom-3 right-3">
            <button
              onClick={() => handleImprove(bullet)}
              disabled={loading || !bullet.trim()}
              className="px-4 py-1.5 bg-[#d4af37] hover:bg-[#c5a12e] disabled:bg-[#222] disabled:text-[#555] text-black font-extrabold text-xs uppercase font-mono tracking-wider rounded-lg transition-all shadow-md flex items-center space-x-1 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin mr-1" />
                  <span>Optimizando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  <span>Mejorar frase</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-3 bg-rose-950/40 text-rose-200 text-xs rounded-xl border border-rose-900/30 flex items-start space-x-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#ff4b4b]" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 space-y-4 pt-4 border-t border-[#222] animate-fadeIn">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <ListTodo className="w-4 h-4 text-[#d4af37]" />
              <span>3 Alternativas de Alto Impacto (Usa una de estas en tu CV en inglés):</span>
            </h4>

            <div className="space-y-3">
              {results.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-black/40 hover:bg-black/60 rounded-xl border border-[#1f1f1f] hover:border-[#d4af37]/30 transition-colors relative group"
                >
                  <div className="flex justify-between items-start mb-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 font-mono tracking-wider">
                      OPCIÓN {index + 1}
                    </span>
                    <button
                      onClick={() => handleCopy(item.version, index)}
                      className="text-[#777] hover:text-[#d4af37] p-1 rounded hover:bg-[#1a1a1a] transition-all opacity-100 cursor-pointer"
                      title="Copiar viñeta"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-[#d4af37] animate-scaleIn" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-white text-sm font-medium pr-8 leading-relaxed">
                    {item.version}
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-[#222] flex items-start space-x-2">
                    <Info className="w-3.5 h-3.5 text-[#777] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#999] leading-relaxed">
                      {item.explicacion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#777] italic text-center mt-2.5 font-mono">
              Tip: Los corchetes [como estos] representan números o métricas estimadas que debes personalizar con tus propios logros reales.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
