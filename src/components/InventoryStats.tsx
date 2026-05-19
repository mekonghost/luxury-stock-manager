import { AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';

export default function InventoryStats({ products }: { products: Product[] }) {
  const totalItems = products.length;
  const outOfStock = products.filter(p => p.quantity === 0).length;
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.minStockLevel).length;

  const stats = [
    { label: 'Asset Total', value: totalItems, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Inactive Items', value: outOfStock, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Low Stock Level', value: lowStock, icon: TrendingDown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-slate-900/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800 hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <p className="text-4xl font-black text-slate-50 tracking-tighter">{stat.value}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
