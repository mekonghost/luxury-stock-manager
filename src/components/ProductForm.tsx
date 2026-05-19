import React, { useState, useEffect } from 'react';
import { X, Save, Package2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';

interface ProductFormProps {
  product?: Product | null;
  onSave: (product: Partial<Product>) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

export default function ProductForm({ product, onSave, onClose, isSaving }: ProductFormProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    quantity: 0,
    unit: 'bucket',
    category: '',
    section: 'Materials',
    minStockLevel: 5,
  });

  useEffect(() => {
    if (product) {
      setFormData(product);
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/20">
              <Package2 size={20} />
            </div>
            <div>
              <h2 className="font-black text-xl text-slate-50 tracking-tight">{product ? 'Edit Item' : 'New Asset'}</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inventory Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Product Name</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold placeholder:text-slate-600"
                placeholder="e.g. Premium Cement"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Department / Section</label>
              <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, section: 'Materials' })}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.section === 'Materials' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Materials
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, section: 'Finish' })}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.section === 'Finish' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Finish
                </button>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold placeholder:text-slate-600"
                placeholder="e.g. Building"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Standard Unit</label>
              <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, unit: 'bucket' })}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.unit === 'bucket' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Bucket
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, unit: 'kg' })}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.unit === 'kg' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  KG
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, unit: 'unit' })}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.unit === 'unit' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Unit
                </button>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">
                Current Stock ({formData.unit})
              </label>
              <input
                required
                type="number"
                step={formData.unit === 'kg' ? '0.01' : '1'}
                min="0"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-black text-lg"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Low Stock Alert Level</label>
              <input
                type="number"
                min="0"
                value={formData.minStockLevel}
                onChange={e => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) })}
                className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-black"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Product ID / Barcode</label>
              <input
                type="text"
                value={formData.barcode || ''}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-bold"
                placeholder="Unique identifier..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all h-28 resize-none font-medium placeholder:text-slate-600"
                placeholder="Optional details..."
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 rounded-2xl bg-slate-800 text-slate-300 font-black uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all border border-slate-700 shadow-xl shadow-black/20"
            >
              Cancel
            </button>
            <button
              disabled={isSaving}
              type="submit"
              className="flex-[2] bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-blue-500/20 active:scale-95"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  <span>Commit Records</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
