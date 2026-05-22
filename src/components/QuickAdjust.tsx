import React, { useState } from 'react';
import { Search, Package2, Zap, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { useLanguage } from '../lib/LanguageContext';

interface QuickAdjustProps {
  products: Product[];
  onAdjust: (id: string, amount: number, grade?: string, size?: string) => Promise<void>;
}

export default function QuickAdjust({ products, onAdjust }: QuickAdjustProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, string>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { grade: string; size: string }>>({});

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjust = async (id: string, amount: number) => {
    setAdjustingId(id);
    const product = products.find(p => p.id === id);
    const variant = selectedVariants[id];
    
    if (product?.section === 'Finish' && (product.availableBases?.length ?? 0) > 0 && (product.availableSizes?.length ?? 0) > 0) {
      const defaultGrade = product.availableBases?.[0] || 'Base A';
      const defaultSize = product.availableSizes?.[0] || '18L';
      await onAdjust(id, amount, variant?.grade || defaultGrade, variant?.size || defaultSize);
    } else {
      await onAdjust(id, amount);
    }
    setAdjustingId(null);
  };

  const updateVariant = (id: string, grade: string, size: string) => {
    setSelectedVariants({
      ...selectedVariants,
      [id]: { grade, size }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2.5rem] border border-slate-300 shadow-xl shadow-slate-250/20 transition-all">
        <div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-3 italic">
            <Zap className="text-blue-600" size={24} fill="currentColor" />
            {t('burstMode').toUpperCase()}
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">{t('realTimeTerminal')}</p>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={t('searchStock')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-bold placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        <AnimatePresence mode="popLayout">
          {filtered.map((p) => {
            const availableBases = p.availableBases || ['Base A', 'Base B', 'Base C', 'Base D'];
            const availableSizes = p.availableSizes || ['18L', '15L', '5L', '4L', '1L'];
            const currentVariant = selectedVariants[p.id!] || { 
               grade: (p.availableBases && p.availableBases.length > 0) ? p.availableBases[0] : 'Base A', 
               size: (p.availableSizes && p.availableSizes.length > 0) ? p.availableSizes[0] : '18L' 
            };

            const hasVariants = (p.availableBases?.length ?? 0) > 0 && (p.availableSizes?.length ?? 0) > 0;

             return (
              <motion.div
                layout
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`bg-white p-6 rounded-[2rem] border-2 ${
                  p.section === 'Materials' ? 'border-l-[12px] border-l-blue-600 border-y-slate-300 border-r-slate-300' : 'border-l-[12px] border-l-indigo-600 border-y-slate-300 border-r-slate-300'
                } shadow-md shadow-slate-200 hover:shadow-2xl hover:shadow-slate-300 hover:border-r-slate-400 hover:border-y-slate-400 hover:-translate-y-1 transition-all duration-300 group`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-300 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors">
                    <Package2 className="text-slate-400 group-hover:text-white" size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-slate-900 break-words whitespace-normal leading-tight tracking-tight">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-blue-100">
                        {p.quantity.toLocaleString(undefined, { minimumFractionDigits: p.unit === 'kg' ? 2 : 0 })} {p.unit}
                      </span>
                      {p.section === 'Finish' && hasVariants ? (
                        <span className="text-[10px] font-black text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-indigo-100 animate-pulse">
                          Variant Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-slate-150">
                          Unit: {p.unit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {p.section === 'Finish' && hasVariants && (
                  <div className="mb-4 space-y-3">
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1.5 overflow-x-auto no-scrollbar border border-slate-300 shadow-inner">
                      {p.availableSizes!.map(s => (
                        <button 
                          key={s}
                          onClick={() => updateVariant(p.id!, currentVariant.grade, s)}
                          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                            currentVariant.size === s 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                              : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'
                          }`}
                        >
                           {s}
                        </button>
                      ))}
                    </div>
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1.5 overflow-x-auto no-scrollbar border border-slate-300 shadow-inner">
                      {p.availableBases!.map(g => (
                        <button 
                          key={g}
                          onClick={() => updateVariant(p.id!, g, currentVariant.size)}
                          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                            currentVariant.grade === g 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' 
                              : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'
                          }`}
                        >
                           {g.startsWith('Base ') ? g.split(' ')[1] : g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              <div className="pt-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 text-center">Adjust Quantity</p>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[2rem] border border-slate-300 shadow-inner">
                  <button 
                    onClick={() => {
                      const val = parseFloat(manualAdjustments[p.id!]);
                      if (!isNaN(val) && val > 0) {
                        handleAdjust(p.id!, -val);
                        setManualAdjustments({ ...manualAdjustments, [p.id!]: '' });
                      }
                    }}
                    disabled={!manualAdjustments[p.id!] || adjustingId === p.id}
                    className="w-12 h-12 bg-red-500/10 text-red-600 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 disabled:opacity-30 disabled:hover:bg-red-500/10 disabled:hover:text-red-500 shadow-lg shrink-0"
                    title="Subtract Amount"
                  >
                    <Minus size={20} strokeWidth={3} />
                  </button>

                  <input 
                    type="number"
                    placeholder="0.00"
                    value={manualAdjustments[p.id!] || ''}
                    onChange={(e) => setManualAdjustments({ ...manualAdjustments, [p.id!]: e.target.value })}
                    className="flex-1 h-12 bg-transparent text-center text-sm font-black text-slate-800 outline-none placeholder:text-slate-300 min-w-0"
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
          );
        })}
      </AnimatePresence>
    </div>
  </div>
);
}
