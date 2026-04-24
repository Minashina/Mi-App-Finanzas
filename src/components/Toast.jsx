import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

const styles = {
    success: {
        container: 'bg-green-950 border-green-500/40 text-green-100',
        icon: <CheckCircle2 size={18} className="text-green-400 shrink-0 mt-0.5" />,
    },
    error: {
        container: 'bg-red-950 border-red-500/40 text-red-100',
        icon: <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />,
    },
    warning: {
        container: 'bg-amber-950 border-amber-500/40 text-amber-100',
        icon: <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />,
    },
};

export default function Toast({ message, type = 'success', onDismiss }) {
    const [visible, setVisible] = useState(false);
    const { container, icon } = styles[type] ?? styles.success;

    useEffect(() => {
        const frame = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    return (
        <div
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl w-80 max-w-[calc(100vw-2rem)]
                transition-all duration-300 ease-out
                ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}
                ${container}`}
        >
            {icon}
            <p className="text-sm flex-1 leading-snug">{message}</p>
            <button
                onClick={onDismiss}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
                aria-label="Cerrar notificación"
            >
                <X size={14} />
            </button>
        </div>
    );
}
