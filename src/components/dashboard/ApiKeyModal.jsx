import React from 'react';
import { KeyRound, X } from 'lucide-react';

export default function ApiKeyModal({ apiKeyInput, setApiKeyInput, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-surface relative z-10 w-full max-w-md p-8 rounded-3xl border border-pink-500/30 shadow-[0_0_50px_rgba(236,72,153,0.15)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-bold flex items-center gap-2 text-pink-400">
            <KeyRound /> Configurar Asesor IA
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-white p-2">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-text-muted mb-6">
          Para usar el asesor de IA de forma gratuita para ti, necesitas proporcionar tu propia clave mágica de <strong>Google Gemini API</strong>.
          <br /><br />
          Esta clave se guardará <strong>solo en tu navegador actual</strong> y no se comparte con nadie más.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2 font-medium">
            Pega tu "API KEY" aquí:
            <input
              required type="password"
              placeholder="AIzaSyA..."
              className="bg-background border border-white/10 p-3 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all font-mono"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
            />
          </label>

          <button
            type="submit"
            className="w-full bg-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-pink-500 transition-colors shadow-lg"
          >
            Guardar y Analizar Mi Mes
          </button>

          <div className="text-center mt-2">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">
              ¿No tienes una? Consíguela gratis aquí.
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
