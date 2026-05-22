import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Package2, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { useLanguage } from '../lib/LanguageContext';

interface ProductFormProps {
  product?: Product | null;
  onSave: (product: Partial<Product>) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

export default function ProductForm({ product, onSave, onClose, isSaving }: ProductFormProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    quantity: 0,
    unit: 'bucket',
    category: '',
    section: 'Materials',
    minStockLevel: 100,
    finishStocks: {},
    availableSizes: [],
    availableBases: [],
    photoUrl: '',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        finishStocks: product.finishStocks || {},
        availableSizes: product.availableSizes || [],
        availableBases: product.availableBases || [],
        photoUrl: product.photoUrl || '',
      });
    }
  }, [product]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // scale down to max 400px
        const canvas = document.createElement('canvas');
        const max_size = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFormData(prev => ({ ...prev, photoUrl: compressedDataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const BASES = ['Base A', 'Base B', 'Base C', 'Base D', '4L (4)', '1L (18)', '1L (6)'];
  const SIZES = ['18L', '15L', '5L', '4L', '1L', '4L (4)', '1L (18)', '1L (6)'];

  const hasVariants = (formData.availableBases?.length ?? 0) > 0 && (formData.availableSizes?.length ?? 0) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let totalQty = formData.quantity || 0;
    if (formData.section === 'Finish' && hasVariants && formData.finishStocks) {
      const bases = formData.availableBases || [];
      const sizes = formData.availableSizes || [];
      totalQty = bases.reduce((acc: number, base: string) => {
        const baseStocks = formData.finishStocks?.[base] || {};
        const baseSum = sizes.reduce<number>((sAcc, size) => sAcc + (parseFloat(baseStocks[size] as any) || 0), 0);
        return acc + baseSum;
      }, 0);
    }
    await onSave({ ...formData, quantity: totalQty });
  };

  const toggleSize = (size: string) => {
    const currentSizes = formData.availableSizes || [];
    if (currentSizes.includes(size)) {
      setFormData({ ...formData, availableSizes: currentSizes.filter(s => s !== size) });
    } else {
      setFormData({ ...formData, availableSizes: [...currentSizes, size] });
    }
  };

  const toggleBase = (base: string) => {
    const currentBases = formData.availableBases || [];
    if (currentBases.includes(base)) {
      setFormData({ ...formData, availableBases: currentBases.filter(b => b !== base) });
    } else {
      setFormData({ ...formData, availableBases: [...currentBases, base] });
    }
  };

  const updateFinishStock = (base: string, size: string, value: string) => {
    const newVal = parseFloat(value) || 0;
    setFormData({
      ...formData,
      finishStocks: {
        ...formData.finishStocks,
        [base]: {
          ...(formData.finishStocks?.[base] || {}),
          [size]: newVal
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] border-2 border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="px-8 py-6 border-b-2 border-slate-800 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
              <Package2 size={20} />
            </div>
            <div>
              <h2 className="font-black text-xl text-slate-900 tracking-tight">{product ? t('editAsset') : t('newAsset')}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('inventoryManagement')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 animate-in fade-in duration-300">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Product Photo (Optional)</label>
              
              <div 
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[1.5rem] transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-blue-600 bg-blue-50/40 text-blue-600' 
                    : 'border-slate-800 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:border-slate-900 shadow-sm'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                {formData.photoUrl ? (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-md group/img" onClick={(e) => e.stopPropagation()}>
                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                      className="absolute inset-0 bg-slate-950/60 opacity-100 sm:opacity-0 sm:group-hover/img:opacity-100 flex items-center justify-center text-white transition-all duration-200"
                      title="Remove product photo"
                    >
                      <Trash2 size={20} className="text-red-400" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                      <Upload size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-705 uppercase tracking-widest">Upload or Drag Image</span>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">PNG, JPG, JPEG (compressed for speed)</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-[2px] bg-slate-200 flex-1" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] select-none">or</span>
                <div className="h-[2px] bg-slate-200 flex-1" />
              </div>

              <div className="mt-4 space-y-1">
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Paste custom photo link / URL</label>
                <input
                  type="url"
                  value={formData.photoUrl || ''}
                  onChange={e => setFormData(prev => ({ ...prev, photoUrl: e.target.value }))}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-800 rounded-xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-xs placeholder:text-slate-400"
                  placeholder="e.g., https://images.unsplash.com/... or imgur link"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">{t('assetName')}</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-800 rounded-2xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-black placeholder:text-slate-400"
                placeholder={t('productNamePlaceholder')}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">{t('departmentSection')}</label>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border-2 border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, section: 'Materials' })}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.section === 'Materials' ? 'bg-blue-600 text-white shadow-md border-2 border-blue-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {t('materials')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, section: 'Finish' })}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.section === 'Finish' ? 'bg-blue-600 text-white shadow-md border-2 border-blue-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {t('finish')}
                </button>
              </div>
            </div>

            {formData.section === 'Finish' ? (
              <div className="col-span-2 space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-3 px-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('activeSizes')}</label>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('activeBases')}</label>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {SIZES.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSize(size)}
                          className={`px-4 py-3 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                            formData.availableSizes?.includes(size)
                              ? 'bg-blue-600 border-blue-800 text-white shadow-lg'
                              : 'bg-slate-50 border-slate-800 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    <div className="flex bg-slate-50 p-1 rounded-2xl border-2 border-slate-800 gap-1 overflow-x-auto no-scrollbar">
                      {BASES.map(base => (
                        <button
                          key={base}
                          type="button"
                          onClick={() => toggleBase(base)}
                          className={`px-3 py-2 rounded-xl border-2 text-[8px] font-black uppercase tracking-tighter whitespace-nowrap transition-all ${
                            formData.availableBases?.includes(base)
                              ? 'bg-indigo-600 border-indigo-800 text-white shadow-sm'
                              : 'border-slate-800 bg-white text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {base.startsWith('Base ') ? base.split(' ')[1] : base}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-55 rounded-[2rem] border-2 border-slate-800 p-6 space-y-5">
                  <div className="grid grid-cols-4 gap-4 items-center mb-1 px-4 text-center">
                    <div className="col-span-2 text-left text-[8px] font-black text-slate-800 uppercase tracking-[0.3em]">{t('baseType')}</div>
                    {formData.availableSizes?.map(size => (
                      <div key={size} className="text-[8px] font-black text-slate-805 uppercase tracking-[0.3em] font-mono">{size}</div>
                    ))}
                  </div>
                  {BASES.filter(b => formData.availableBases?.includes(b)).map(base => (
                    <div key={base} className="grid grid-cols-4 gap-4 items-center animate-in fade-in slide-in-from-left-2 transition-all">
                      <div className="col-span-2 text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">{base}</div>
                      {formData.availableSizes?.map(size => (
                        <input
                          key={`${base}-${size}`}
                          type="number"
                          min="0"
                          value={formData.finishStocks?.[base]?.[size] ?? 0}
                          onChange={e => updateFinishStock(base, size, e.target.value)}
                          className="w-full px-2 py-3 bg-white border-2 border-slate-800 rounded-xl text-slate-950 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none text-center font-mono font-black"
                        />
                      ))}
                    </div>
                  ))}
                  {!hasVariants && (
                    <div className="space-y-4 pt-2">
                      <div className="flex bg-white border-2 border-slate-800 p-4 rounded-2xl items-center gap-4">
                        <div className="flex-1">
                          <label className="block text-[8px] font-black text-slate-800 uppercase tracking-widest mb-1">{t('unitOfMeasurement')}</label>
                          <select 
                            value={formData.unit}
                            onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                            className="bg-transparent text-slate-900 text-[10px] font-black uppercase outline-none"
                          >
                            <option value="bucket">Bucket</option>
                            <option value="unit">Unit</option>
                            <option value="kg">KG</option>
                            <option value="litre">Litre</option>
                          </select>
                        </div>
                        <div className="w-px h-8 bg-slate-800" />
                        <div className="flex-1">
                          <label className="block text-[8px] font-black text-slate-800 uppercase tracking-widest mb-1">{t('startingStockQty')}</label>
                          <input
                            type="number"
                            min="0"
                            step={formData.unit === 'kg' ? '0.01' : '1'}
                            value={formData.quantity}
                            onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                            className="bg-transparent text-slate-950 text-sm font-black outline-none w-full"
                          />
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-600 italic px-2">{t('variantHelp')}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">{t('unitOfMeasurement')}</label>
                  <div className="flex bg-slate-55 p-1.5 rounded-2xl border-2 border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, unit: 'bucket' })}
                      className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.unit === 'bucket' ? 'bg-blue-600 text-white shadow-md border-2 border-blue-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Bucket
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, unit: 'kg' })}
                      className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.unit === 'kg' ? 'bg-blue-600 text-white shadow-md border-2 border-blue-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      KG
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, unit: 'unit' })}
                      className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.unit === 'unit' ? 'bg-blue-600 text-white shadow-md border-2 border-blue-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Unit
                    </button>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">
                    {t('currentStock')} ({formData.unit})
                  </label>
                  <input
                    required
                    type="number"
                    step={formData.unit === 'kg' ? '0.01' : '1'}
                    min="0"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-800 rounded-2xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-mono font-black text-lg"
                  />
                </div>
              </>
            )}

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">{t('minStockWarning')}</label>
              <input
                required
                type="number"
                min="0"
                value={formData.minStockLevel ?? 100}
                onChange={e => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-800 rounded-2xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-mono font-black"
                placeholder="e.g. 100"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">{t('barcode')}</label>
              <input
                type="text"
                value={formData.barcode || ''}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-800 rounded-2xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-mono font-bold placeholder:text-slate-400"
                placeholder={t('barcodePlaceholder')}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">{t('description')}</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-800 rounded-2xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all h-28 resize-none font-medium placeholder:text-slate-400"
                placeholder={t('descriptionPlaceholder')}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 rounded-2xl bg-slate-100 text-slate-800 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all border-2 border-slate-800 shadow"
            >
              {t('cancel')}
            </button>
            <button
              disabled={isSaving}
              type="submit"
              className="flex-[2] bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-2 border-blue-800 shadow-xl"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  <span>{t('commitRecords')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
