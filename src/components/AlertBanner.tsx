import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { useState } from 'react';
import { useLanguage } from '../lib/LanguageContext';

interface AlertBannerProps {
  products: Product[];
}

export default function AlertBanner({ products }: AlertBannerProps) {
  const { t } = useLanguage();
  const outOfStockItems = products.filter(p => p.quantity === 0);
  const lowStockItems = products.filter(p => p.quantity > 0 && p.quantity <= p.minStockLevel);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const totalAlerts = outOfStockItems.length + lowStockItems.length;

  if (totalAlerts === 0 || dismissed === 'all') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`${outOfStockItems.length > 0 ? 'bg-red-600' : 'bg-amber-500'} text-white overflow-hidden border-b border-white/10`}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <AlertCircle className="shrink-0 animate-pulse" size={20} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <p className="font-black uppercase tracking-widest text-[10px] sm:text-xs">
                {outOfStockItems.length > 0 ? t('criticalAlert') : t('stockWarning')}
              </p>
              <div className="w-1 h-1 rounded-full bg-white/40 hidden sm:block" />
              <p className="font-bold text-sm">
                {outOfStockItems.length > 0 
                  ? `${outOfStockItems.length} ${t('itemsExhausted')}`
                  : `${lowStockItems.length} ${t('itemsRunningLow')}`}
                <span className="hidden md:inline font-medium opacity-80 decoration-white/30 decoration-1 underline ml-2">
                   {t('checkInventory')}
                </span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => setDismissed('all')}
            className="p-2 hover:bg-white/20 rounded-xl transition-all active:scale-95 flex items-center gap-2 group"
          >
            <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">{t('dismiss')}</span>
            <X size={18} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
