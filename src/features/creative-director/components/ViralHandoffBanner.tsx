import { useState, useEffect } from 'react';
import { LucideIcon } from '../../../components/Common';
import { 
  getPendingViralHandoff, 
  clearViralHandoff, 
  ViralIdeaPayload 
} from '../../../utils/viralHandoff';

interface ViralHandoffBannerProps {
  onImportBriefing: (payload: ViralIdeaPayload) => void;
  onCompileScenes: (payload: ViralIdeaPayload) => void;
}

export function ViralHandoffBanner({ onImportBriefing, onCompileScenes }: ViralHandoffBannerProps) {
  const [payload, setPayload] = useState<ViralIdeaPayload | null>(null);

  useEffect(() => {
    const pending = getPendingViralHandoff();
    if (pending) {
      setPayload(pending);
    }
  }, []);

  if (!payload) {
    return null;
  }

  const handleDiscard = () => {
    clearViralHandoff();
    setPayload(null);
  };

  const handleImport = () => {
    onImportBriefing(payload);
    clearViralHandoff();
    setPayload(null);
  };

  const handleCompile = () => {
    onCompileScenes(payload);
    clearViralHandoff();
    setPayload(null);
  };

  return (
    <div className="mb-6 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-purple-950/70 p-4 shadow-lg backdrop-blur-md relative overflow-hidden animate-fadeIn">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <LucideIcon name="lightbulb" className="w-3 h-3 text-yellow-400" />
              Ideia Viral Recebida
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Nicho: <strong className="text-slate-200">{payload.niche || 'Geral'}</strong>
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              • Ângulo: <strong className="text-slate-200">{payload.angle}</strong>
            </span>
          </div>

          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <span>{payload.title}</span>
          </h4>

          <p className="text-xs text-slate-300 italic line-clamp-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
            <strong className="text-yellow-400 not-italic">Gancho (0-3s): </strong>
            "{payload.hook}"
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleImport}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-sm hover:shadow-indigo-500/20 cursor-pointer"
            title="Importar como briefing textual nas instruções"
          >
            <LucideIcon name="file-text" className="w-3.5 h-3.5" />
            Importar briefing textual
          </button>

          <button
            onClick={handleCompile}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-sm hover:shadow-emerald-500/20 cursor-pointer"
            title="Compilar em blocos de cena 8s Flow-ready deterministicamente"
          >
            <LucideIcon name="film" className="w-3.5 h-3.5" />
            Compilar em blocos Flow-ready
          </button>

          <button
            onClick={handleDiscard}
            className="px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-950/40 border border-slate-700/60 hover:border-rose-800/50 transition cursor-pointer"
            title="Descartar ideia sem alterar os campos"
          >
            <LucideIcon name="x" className="w-3.5 h-3.5" />
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
