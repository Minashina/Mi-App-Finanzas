import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { addMonths, subMonths, format, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MonthSelector() {
  const { globalMonth, setGlobalMonth } = useFinance();

  const handlePrevMonth = () => {
    setGlobalMonth(subMonths(globalMonth, 1));
  };

  const handleNextMonth = () => {
    setGlobalMonth(addMonths(globalMonth, 1));
  };

  const handleReset = () => {
    setGlobalMonth(new Date());
  };

  const isCurrentMonth = isSameMonth(globalMonth, new Date());
  const monthName = format(globalMonth, 'MMMM yyyy', { locale: es }).toUpperCase();

  return (
    <div className="bg-surface/80 backdrop-blur-md border-b border-white/10 sticky top-[72px] z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between lg:justify-center gap-4">
        
        <button 
          onClick={handlePrevMonth}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-white"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex flex-col items-center justify-center min-w-[200px]">
          <span className="text-lg font-bold tracking-widest text-primary-light">
            {monthName}
          </span>
          {!isCurrentMonth && (
            <button onClick={handleReset} className="text-[10px] text-text-muted hover:text-white flex items-center gap-1 mt-0.5">
              <CalendarDays size={10} /> Volver al mes actual
            </button>
          )}
        </div>

        <button 
          onClick={handleNextMonth}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-white"
        >
          <ChevronRight size={24} />
        </button>

      </div>
    </div>
  );
}
