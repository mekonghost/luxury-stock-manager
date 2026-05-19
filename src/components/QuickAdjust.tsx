import React, { useState } from 'react';
import { Search, Package2, Zap, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

interface QuickAdjustProps {
  products: Product[];
  onAdjust: (id: string, amount: number) => Promise<void>;
}

export default function QuickAdjust({ products, onAdjust }: QuickAdjustProps) {
  const [search, setSearch] = useState('');
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, string>>({});

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjust = async (id: string, amount: number) => {
    setAdjustingId(id);
    await onAdjust(id, amount);
    setAdjustingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800 transition-all">
        <div>
          <h2 className="text-2xl font-black text-slate-50 tracking-tight flex items-center gap-3 italic">
            <Zap className="text-blue-500" size={24} fill="currentColor" />
            BURST ENTRY
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">High-Frequency Stock Control</p>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search specific record..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        <AnimatePresence mode="popLayout">
          {filtered.map((p) => (
            <motion.div
              layout
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-800 hover:border-slate-700 transition-all group"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors">
                  <Package2 className="text-slate-500 group-hover:text-white" size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-50 truncate leading-tight tracking-tight">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {p.quantity.toLocaleString(undefined, { minimumFractionDigits: p.unit === 'kg' ? 2 : 0 })} {p.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2 mb-2 text-center">Adjust Quantity</p>
                <div className="flex items-center gap-3 bg-slate-800/30 p-2 rounded-[2rem] border border-slate-800/50 shadow-inner">
                  <button 
                    onClick={() => {
                      const val = parseFloat(manualAdjustments[p.id!]);
                      if (!isNaN(val) && val > 0) {
                        handleAdjust(p.id!, -val);
                        setManualAdjustments({ ...manualAdjustments, [p.id!]: '' });
                      }
                    }}
                    disabled={!manualAdjustments[p.id!] || adjustingId === p.id}
                    className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 disabled:opacity-30 disabled:hover:bg-red-500/10 disabled:hover:text-red-500 shadow-lg shrink-0"
                    title="Subtract Amount"
                  >
                    <Minus size={20} strokeWidth={3} />
                  </button>

                  <input 
                    type="number"
                    placeholder="0.00"
                    value={manualAdjustments[p.id!] || ''}
                    onChange={(e) => setManualAdjustments({ ...manualAdjustments, [p.id!]: e.target.value })}
                    className="flex-1 h-12 bg-transparent text-center text-sm font-black text-white outline-none placeholder:text-slate-700 min-w-0"
                  />

                  <button 
                    onClick={() => {
                      const val = parseFloat(manualAdjustments[p.id!]);
                      if (!isNaN(val) && val > 0) {
                        handleAdjust(p.id!, val);
                        setManualAdjustments({ ...manualAdjustments, [p.id!]: '' });
                      }
                    }}
                    disabled={!manualAdjustments[p.id!] || adjustingId === p.id}
                    className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all active:scale-90 disabled:opacity-30 disabled:hover:bg-blue-600 shrink-0"
                    title="Add Amount"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
