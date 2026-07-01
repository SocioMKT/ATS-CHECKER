import React from "react";
import { History, Trash2, Calendar, FileText, ChevronRight, BarChart } from "lucide-react";
import { ScanHistoryItem } from "../types";

interface HistorySidebarProps {
  history: ScanHistoryItem[];
  onSelect: (item: ScanHistoryItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  activeId?: string;
  onNewScan: () => void;
}

export default function HistorySidebar({
  history,
  onSelect,
  onDelete,
  activeId,
  onNewScan,
}: HistorySidebarProps) {
  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="bg-[#141414] border border-[#222] rounded-2xl shadow-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-[#222] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <History className="w-5 h-5 text-[#a1a1a1]" />
          <h3 className="font-serif italic text-base text-white font-medium">Historial</h3>
        </div>
        <span className="font-mono text-[10px] text-[#a1a1a1] bg-[#1a1a1a] border border-[#2c2c2c] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
          {history.length} scans
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e1e] p-2 max-h-[420px] md:max-h-[600px]">
        {history.length === 0 ? (
          <div className="py-12 px-6 text-center text-[#777]">
            <History className="w-10 h-10 mx-auto text-[#333] mb-3 stroke-1" />
            <p className="text-xs font-semibold text-[#999]">Sin historial de evaluaciones</p>
            <p className="text-[11px] text-[#666] mt-1.5 leading-relaxed">
              Las evaluaciones que realices se guardarán aquí de forma local.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => {
              const isActive = activeId === item.id;
              const isPassed = item.result.pasaFiltro;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={`group p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                    isActive
                      ? "bg-[#d4af37] text-black border-[#d4af37] shadow-lg shadow-[#d4af37]/10"
                      : "bg-[#111] hover:bg-[#181818] border-[#1f1f1f] text-[#e0e0e0] hover:border-[#333]"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center space-x-1.5 text-[10px] mb-1.5 font-bold font-mono tracking-wider">
                      <Calendar className={`w-3 h-3 ${isActive ? "text-black/70" : "text-[#777]"}`} />
                      <span className={isActive ? "text-black/80" : "text-[#777]"}>
                        {formatDate(item.timestamp)}
                      </span>
                    </div>

                    <h4 className={`text-xs font-bold truncate block mb-1 ${isActive ? "text-black font-extrabold" : "text-white"}`}>
                      {item.jobTitle || "Evaluación sin título"}
                    </h4>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-extrabold font-mono uppercase tracking-wider ${
                          isActive
                            ? "bg-black text-[#d4af37]"
                            : isPassed
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                            : "bg-rose-950/80 text-rose-400 border border-rose-800/50"
                        }`}
                      >
                        {item.result.puntuacion}% Match
                      </span>
                      <span className={`text-[10px] uppercase font-mono tracking-wider font-semibold ${isActive ? "text-black/70" : "text-[#777]"}`}>
                        {isPassed ? "Pasa" : "No pasa"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => onDelete(item.id, e)}
                      className={`p-1.5 rounded-lg transition-all border border-transparent ${
                        isActive
                          ? "text-black/60 hover:text-black hover:bg-black/10"
                          : "text-[#777] hover:text-[#ff4b4b] hover:bg-[#1e1e1e]"
                      }`}
                      title="Eliminar del historial"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isActive ? "text-black" : "text-[#555] group-hover:text-[#999]"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Scan Action */}
      <div className="p-4 border-t border-[#222] bg-[#111]">
        <button
          onClick={onNewScan}
          className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#222] text-[#d4af37] hover:text-white border border-[#333] hover:border-[#d4af37] font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-2 shadow-inner"
        >
          <span>+ Iniciar Nuevo Escaneo</span>
        </button>
      </div>
    </div>
  );
}
