import React from 'react';
import { Sparkles, X } from 'lucide-react';

const renderBold = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
};

export default function AiAdvisorModal({ aiAdvice, isAiLoading, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-surface relative z-10 w-full max-w-lg p-8 rounded-3xl border border-pink-500/20 shadow-[0_0_50px_rgba(236,72,153,0.1)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            <Sparkles className="text-pink-400" /> Mi Asesor IA
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
            disabled={isAiLoading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-background/50 border border-white/5 rounded-2xl p-6 min-h-[200px] flex flex-col justify-center">
          {isAiLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 h-full py-8 text-pink-400">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" />
              <p className="animate-pulse font-medium text-center">
                Analizando tus movimientos del mes...<br />
                <span className="text-xs text-text-muted">Generando recomendaciones precisas</span>
              </p>
            </div>
          ) : (
            <div className="prose prose-invert prose-p:leading-relaxed max-w-none text-sm md:text-base">
              {aiAdvice ? (
                aiAdvice.split('\n').map((line, i) => {
                  if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                    const text = line.replace(/^[-*]\s/, '');
                    return (
                      <div key={i} className="flex gap-3 mb-4 last:mb-0 bg-white/5 p-4 rounded-xl items-start">
                        <span className="text-pink-400 mt-1">•</span>
                        <span>{renderBold(text)}</span>
                      </div>
                    );
                  }
                  if (line.trim() !== '') {
                    return <p key={i} className="mb-4">{renderBold(line)}</p>;
                  }
                  return null;
                })
              ) : (
                <p className="text-center text-danger">No se pudo cargar el análisis.</p>
              )}
            </div>
          )}
        </div>

        <p className="text-[10px] text-center text-text-muted mt-6 opacity-60">
          Los consejos de IA están generados con Gemini de acuerdo a tus saldos y deudas actuales, agrupados y asegurados privadamente sin comprometer información externa conectable.
        </p>
      </div>
    </div>
  );
}
