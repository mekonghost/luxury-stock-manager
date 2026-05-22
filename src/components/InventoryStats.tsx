import { AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { useLanguage } from '../lib/LanguageContext';

interface InventoryStatsProps {
  products: Product[];
  activeFilter?: 'all' | 'inactive' | 'low_stock';
  onFilterChange?: (filter: 'all' | 'inactive' | 'low_stock') => void;
}

export default function InventoryStats({ products, activeFilter = 'all', onFilterChange }: InventoryStatsProps) {
  const { t } = useLanguage();
  const totalItems = products.length;
  const outOfStock = products.filter(p => p.quantity === 0).length;
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.minStockLevel).length;

  const stats = [
    { 
      type: 'all' as const,
      label: t('assetTotal'), 
      value: totalItems, 
      icon: Package, 
      color: 'text-blue-600', 
      bg: 'bg-blue-500/10',
      activeBorder: 'border-[3px] border-blue-600 bg-blue-50/30 ring-4 ring-blue-500/10',
      badgeColor: 'bg-blue-600 text-white'
    },
    { 
      type: 'inactive' as const,
      label: t('inactiveItems'), 
      value: outOfStock, 
      icon: AlertTriangle, 
      color: 'text-red-600', 
      bg: 'bg-red-500/10',
      activeBorder: 'border-[3px] border-red-600 bg-red-50/30 ring-4 ring-red-500/10',
      badgeColor: 'bg-red-600 text-white'
    },
    { 
      type: 'low_stock' as const,
      label: t('lowStockLevel'), 
      value: lowStock, 
      icon: TrendingDown, 
      color: 'text-amber-600', 
      bg: 'bg-amber-500/10',
      activeBorder: 'border-[3px] border-amber-600 bg-amber-50/30 ring-4 ring-amber-500/10',
      badgeColor: 'bg-amber-600 text-white'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {stats.map((stat, i) => {
        const isActive = activeFilter === stat.type;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onFilterChange?.(stat.type)}
            className={`cursor-pointer p-8 rounded-[2rem] transition-all duration-300 relative group flex flex-col justify-between ${
              isActive 
                ? `${stat.activeBorder} shadow-2xl -translate-y-1` 
                : 'border-2 border-slate-800 bg-white hover:border-slate-950 shadow-md hover:shadow-xl hover:bg-slate-50/30'
            }`}
          >
            {/* Active Highlight Radio bubble */}
            <div className="absolute top-5 right-5 flex items-center gap-1.5">
              {isActive ? (
                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${stat.badgeColor} shadow-md border border-black/10`}>
                  ACTIVE FILTER
                </span>
              ) : (
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  CLICK TO FILTER
                </span>
              )}
            </div>

            <div className="flex items-center gap-6 mt-2">
              <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} shrink-0 group-hover:scale-110 transition-transform border-2 border-slate-800`}>
                <stat.icon size={26} strokeWidth={3} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-4xl font-black tracking-tighter transition-colors ${isActive ? 'text-slate-950 font-black' : 'text-slate-900'}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
