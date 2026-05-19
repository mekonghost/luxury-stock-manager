import React, { useState, useMemo } from 'react';
import { History, ArrowUpRight, ArrowDownRight, Package, Calendar, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StockAdjustment } from '../types';

interface StockHistoryProps {
  logs: StockAdjustment[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StockHistory({ logs }: StockHistoryProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'INTAKE' | 'OUTTAKE'>('ALL');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (!log.createdAt) return false;
      const date = log.createdAt.toDate();
      
      const matchesDay = selectedDay === null || date.getDay() === selectedDay;
      
      let matchesDate = true;
      if (selectedDate) {
        const logDateStr = date.toISOString().split('T')[0];
        matchesDate = logDateStr === selectedDate;
      }

      const matchesType = selectedType === 'ALL' || log.type === selectedType;

      return matchesDay && matchesDate && matchesType;
    });
  }, [logs, selectedDay, selectedDate, selectedType]);

  const clearFilters = () => {
    setSelectedDay(null);
    setSelectedDate('');
    setSelectedType('ALL');
  };

  const DAYS_ORDER = [
    { name: 'MON', id: 1 },
    { name: 'TUE', id: 2 },
    { name: 'WED', id: 3 },
    { name: 'THU', id: 4 },
    { name: 'FRI', id: 5 },
    { name: 'SAT', id: 6 },
    { name: 'SUN', id: 0 },
  ];

  if (logs.length === 0) {
    return (
      <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] py-32 text-center">
        <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-slate-700 mx-auto mb-6">
          <History size={32} />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">No Movement Data Recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between px-4 gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-50 tracking-tight italic">AUDIT LOGS</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Immutable Transaction History</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/80 backdrop-blur-xl p-2 rounded-[2rem] border border-slate-800">
          {/* Day Selector */}
          <div className="flex bg-slate-950 p-1 rounded-2xl overflow-hidden shadow-inner">
            {DAYS_ORDER.map((day) => (
              <button
                key={day.name}
                onClick={() => setSelectedDay(selectedDay === day.id ? null : day.id)}
                className={`w-10 h-10 rounded-xl text-[10px] font-black tracking-tighter transition-all ${
                  selectedDay === day.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {day.name}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-slate-800 mx-2 hidden sm:block" />

          {/* Type Filter */}
          <div className="flex bg-slate-950 p-1 rounded-2xl overflow-hidden shadow-inner">
            {(['ALL', 'INTAKE', 'OUTTAKE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 h-10 rounded-xl text-[9px] font-black tracking-widest transition-all ${
                  selectedType === type
                    ? type === 'INTAKE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                    : type === 'OUTTAKE' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-slate-700 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {type === 'INTAKE' ? '+ STOCK' : type === 'OUTTAKE' ? '- STOCK' : 'ALL'}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-slate-800 mx-2 hidden sm:block" />

          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-blue-500 transition-colors" size={14} />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-blue-500 transition-all cursor-pointer"
            />
          </div>

          {(selectedDay !== null || selectedDate || selectedType !== 'ALL') && (
            <button 
              onClick={clearFilters}
              className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90"
              title="Clear Filters"
            >
              <X size={16} />
            </button>
          )}

          <div className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 ml-2">
            {filteredLogs.length} Events
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Identity</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Action</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Prev</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Delta</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Post</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              <AnimatePresence mode="popLayout">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                       <Filter className="mx-auto text-slate-800 mb-4" size={40} />
                       <p className="text-slate-600 font-black uppercase tracking-widest text-[10px]">No logs match the current filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, i) => (
                    <motion.tr 
                      layout
                      key={log.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.01 }}
                      className="group hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-slate-500 font-black font-mono text-[10px]">
                            <Calendar size={12} className="text-blue-500" />
                            {log.createdAt?.toDate().toLocaleDateString(undefined, { weekday: 'long', month: 'numeric', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-[9px] text-slate-700 font-bold uppercase tracking-widest mt-1 ml-5">
                            {log.createdAt?.toDate().toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-bold text-slate-50">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                             <Package size={14} />
                           </div>
                           <span className="truncate max-w-[150px] tracking-tight">{log.productName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          log.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {log.amount > 0 ? '+ STOCK' : '- STOCK'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right font-mono font-black text-slate-500">
                        {log.previousQuantity.toLocaleString(undefined, { minimumFractionDigits: log.unit === 'kg' ? 2 : 0 })}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className={`flex items-center justify-end gap-1 font-black font-mono ${
                          log.amount > 0 ? 'text-blue-400' : 'text-red-400'
                        }`}>
                          {log.amount > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {Math.abs(log.amount).toLocaleString(undefined, { minimumFractionDigits: log.unit === 'kg' ? 2 : 0 })}
                          <span className="text-[8px] uppercase tracking-tighter opacity-50 ml-0.5">{log.unit}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right font-mono font-black text-slate-50 text-base italic tracking-tighter">
                        {log.newQuantity.toLocaleString(undefined, { minimumFractionDigits: log.unit === 'kg' ? 2 : 0 })}
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
