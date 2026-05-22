import React, { useState, useMemo, useEffect } from 'react';
import { History, ArrowUpRight, ArrowDownRight, Package, Calendar, Filter, X, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StockAdjustment, Product } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLanguage } from '../lib/LanguageContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface StockHistoryProps {
  logs: StockAdjustment[];
  products?: Product[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Custom tooltip component for the stock level history chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border-2 border-slate-800 px-4 py-3 rounded-2xl shadow-xl text-white font-mono text-[10px]">
        <p className="font-sans font-black uppercase tracking-wider text-slate-400 mb-1">{payload[0].payload.date}</p>
        <p className="text-emerald-400 font-bold">
          Stock Level: <span className="text-white text-xs font-black">{payload[0].value.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

const formatNarrativeLog = (log: StockAdjustment, lang: 'en' | 'km'): string => {
  const date = log.createdAt?.toDate();
  const dateStr = date ? date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : '';

  const email = log.userEmail || 'unknown@luxury-paint.com';
  const isIntake = log.type === 'INTAKE';
  const actionText = isIntake ? (lang === 'km' ? 'បានបន្ថែម' : 'added') : (lang === 'km' ? 'បានដកចេញ' : 'removed');
  const plusMinus = isIntake ? '+' : '-';
  const amountStr = `${plusMinus}${Math.abs(log.amount)}`;
  const variantStr = (log.grade || log.size) ? ` (${[log.grade, log.size].filter(Boolean).join(' - ')})` : '';
  const prodName = `${log.productName}${variantStr}`;
  const prevStr = lang === 'km' ? 'មុន' : 'Previous';
  const newStr = lang === 'km' ? 'ថ្មី' : 'New';
  const onStr = lang === 'km' ? 'នៅថ្ងៃទី' : 'on';

  return `${email} ${actionText} ${amountStr} ${prodName} (${prevStr}: ${log.previousQuantity} → ${newStr}: ${log.newQuantity}) ${onStr} ${dateStr}`;
};

export default function StockHistory({ logs, products }: StockHistoryProps) {
  const { t, lang } = useLanguage();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'INTAKE' | 'OUTTAKE'>('ALL');
  const [selectedChartProductId, setSelectedChartProductId] = useState<string>('');
  const [viewStyle, setViewStyle] = useState<'table' | 'narrative'>('narrative');

  const productOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    logs.forEach(l => {
      if (l.productId && l.productName) {
        map.set(l.productId, { id: l.productId, name: l.productName });
      }
    });
    products?.forEach(p => {
      if (p.id) {
        map.set(p.id, { id: p.id, name: p.name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs, products]);

  useEffect(() => {
    if (!selectedChartProductId && productOptions.length > 0) {
      setSelectedChartProductId(productOptions[0].id);
    }
  }, [productOptions, selectedChartProductId]);

  const chartData = useMemo(() => {
    if (!selectedChartProductId) return [];
    
    const productLogs = logs
      .filter(l => l.productId === selectedChartProductId && l.createdAt)
      .sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());
    
    const data = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const day = new Date();
      day.setDate(now.getDate() - i);
      day.setHours(23, 59, 59, 999);
      
      const dayStr = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      const logsBeforeOrOnDay = productLogs.filter(l => l.createdAt.toDate() <= day);
      
      let stockLevel = 0;
      if (logsBeforeOrOnDay.length > 0) {
        stockLevel = logsBeforeOrOnDay[logsBeforeOrOnDay.length - 1].newQuantity;
      } else {
        if (productLogs.length > 0) {
          stockLevel = productLogs[0].previousQuantity;
        } else {
          const currentProduct = products?.find(p => p.id === selectedChartProductId);
          stockLevel = currentProduct?.quantity ?? 0;
        }
      }
      
      data.push({
        date: dayStr,
        stock: stockLevel
      });
    }
    
    return data;
  }, [selectedChartProductId, logs, products]);

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

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Luxury-Paint-Stock Report', 14, 22);
    
    // Add generation date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    
    // Define the table columns and rows
    const tableColumn = ["Date", "Product", "Action", "Previous", "Delta", "New"];
    const tableRows = filteredLogs.map(log => {
      const date = log.createdAt?.toDate();
      const dateStr = date ? `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` : 'N/A';
      const variantStr = (log.grade || log.size) ? ` (${[log.grade, log.size].filter(Boolean).join(' - ')})` : '';
      const isIntake = log.type === 'INTAKE';
      
      return [
        dateStr,
        `${log.productName}${variantStr}`,
        isIntake ? '+ STOCK' : '- STOCK',
        log.previousQuantity.toLocaleString(undefined, { minimumFractionDigits: log.unit === 'kg' ? 2 : 0 }),
        `${isIntake ? '+' : ''}${log.amount.toLocaleString(undefined, { minimumFractionDigits: log.unit === 'kg' ? 2 : 0 })} ${log.unit}`,
        log.newQuantity.toLocaleString(undefined, { minimumFractionDigits: log.unit === 'kg' ? 2 : 0 })
      ];
    });

    // Generate the table
    autoTable(doc, {
      startY: 35,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 50 },
        2: { cellWidth: 20 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    // Save the PDF
    const filename = `luxury-paint-stock-report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  const DAYS_ORDER = [
    { name: lang === 'km' ? 'ចន្ទ' : 'MON', id: 1 },
    { name: lang === 'km' ? 'អង្គារ' : 'TUE', id: 2 },
    { name: lang === 'km' ? 'ពុធ' : 'WED', id: 3 },
    { name: lang === 'km' ? 'ព្រហ' : 'THU', id: 4 },
    { name: lang === 'km' ? 'សុក្រ' : 'FRI', id: 5 },
    { name: lang === 'km' ? 'សៅរ៍' : 'SAT', id: 6 },
    { name: lang === 'km' ? 'អាទិត្យ' : 'SUN', id: 0 },
  ];

  if (logs.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-205 rounded-[3rem] py-32 text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-3xl border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-6">
          <History size={32} />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">{t('noMovementData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between px-4 gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">{t('auditLogs').toUpperCase()}</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{t('immutableHistory')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-250/15">
          {/* Day Selector */}
          <div className="flex bg-slate-100 p-1 rounded-2xl overflow-hidden shadow-inner">
            {DAYS_ORDER.map((day) => (
              <button
                key={day.name}
                onClick={() => setSelectedDay(selectedDay === day.id ? null : day.id)}
                className={`w-10 h-10 rounded-xl text-[10px] font-black tracking-tighter transition-all ${
                  selectedDay === day.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-slate-550 hover:text-slate-800'
                }`}
              >
                {day.name}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />

          {/* Type Filter */}
          <div className="flex bg-slate-100 p-1 rounded-2xl overflow-hidden shadow-inner">
            {(['ALL', 'INTAKE', 'OUTTAKE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 h-10 rounded-xl text-[9px] font-black tracking-widest transition-all ${
                  selectedType === type
                    ? type === 'INTAKE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                    : type === 'OUTTAKE' ? 'bg-red-650 text-white shadow-lg shadow-red-600/30'
                    : 'bg-slate-700 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {type === 'INTAKE' ? `+ ${t('stock')}` : type === 'OUTTAKE' ? `- ${t('stock')}` : t('all')}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />

          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-blue-600 transition-colors" size={14} />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-[10px] font-black text-slate-800 uppercase tracking-widest outline-none focus:border-blue-600 focus:bg-white transition-all cursor-pointer"
            />
          </div>

          {(selectedDay !== null || selectedDate || selectedType !== 'ALL') && (
            <button 
              onClick={clearFilters}
              className="w-10 h-10 bg-red-500/10 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90"
              title={t('clearFilters')}
            >
              <X size={16} />
            </button>
          )}

          <div className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-650/20 ml-2">
            {filteredLogs.length} {t('events')}
          </div>

          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-slate-150 text-slate-800 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 border border-slate-250 shadow-md"
            title="Download PDF Report"
          >
            <FileDown size={14} />
            <span>{t('report')}</span>
          </button>
        </div>
      </div>

      {/* Stock Level History Line Chart */}
      {productOptions.length > 0 && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 sm:p-8 shadow-xl shadow-slate-250/15 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-905 tracking-tight uppercase">📈 {t('history') || 'Stock Level History'} (Last 30 Days)</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Track daily inventory fluctuations and baseline levels</p>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Product:</label>
              <select
                value={selectedChartProductId}
                onChange={(e) => setSelectedChartProductId(e.target.value)}
                className="bg-slate-100 border-2 border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black text-slate-800 uppercase tracking-wider outline-none focus:border-blue-600 focus:bg-white transition-all cursor-pointer shadow-sm"
              >
                {productOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 9, fontWeight: 750 }}
                  dx={-5}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="stock" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={{ r: 3, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }} 
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Switcher Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center px-4 mb-6 mt-8 gap-4 border-t border-slate-200/60 pt-6 animate-in fade-in">
        <div>
          <h3 className="text-sm font-black text-slate-905 tracking-tight uppercase flex items-center gap-1.5">
            {viewStyle === 'narrative' ? '📄 Narrative Audit Feed' : '📊 Inventory Activity Table'}
          </h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
            {viewStyle === 'narrative' ? 'Detailed statement based action log report' : 'High-density column grid ledger view'}
          </p>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-300 w-fit">
          <button
            onClick={() => setViewStyle('narrative')}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              viewStyle === 'narrative' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Narrative
          </button>
          <button
            onClick={() => setViewStyle('table')}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              viewStyle === 'table' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {viewStyle === 'narrative' ? (
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-205 rounded-[3rem] py-20 text-center shadow-sm">
              <Filter className="mx-auto text-slate-300 mb-4" size={40} />
              <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">{t('noMovementData')}</p>
            </div>
          ) : (
            filteredLogs.map((log, i) => {
              const isIntake = log.type === 'INTAKE';
              return (
                <motion.div
                  key={log.id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className={`p-6 bg-white rounded-3xl border-2 hover:-translate-y-0.5 transition-all duration-300 shadow-md ${
                    isIntake ? 'border-l-[10px] border-l-emerald-500 border-y-slate-800 border-r-slate-800' : 'border-l-[10px] border-l-red-500 border-y-slate-800 border-r-slate-800'
                  } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shrink-0 border-2 shadow-sm ${
                      isIntake ? 'bg-emerald-500 border-emerald-600' : 'bg-red-550 border-red-650'
                    }`}>
                      {isIntake ? '+' : '-'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-slate-800 font-medium leading-relaxed">
                        {formatNarrativeLog(log, lang)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-left sm:text-right font-mono text-[9px] text-slate-400 uppercase tracking-widest font-black">
                    ⏱️ {log.createdAt?.toDate().toLocaleTimeString()}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-250/20">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150">
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('timestamp')}</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('identity')}</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('action')}</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('prev')}</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('delta')}</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('post')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-sm">
                <AnimatePresence mode="popLayout">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                         <Filter className="mx-auto text-slate-300 mb-4" size={40} />
                         <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">{t('noMovementData')}</p>
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
                        className="group hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-slate-500 font-black font-mono text-[10px]">
                              <Calendar size={12} className="text-blue-600" />
                              {log.createdAt?.toDate().toLocaleDateString(undefined, { weekday: 'long', month: 'numeric', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-1 ml-5 font-bold">
                              {log.createdAt?.toDate().toLocaleTimeString()}
                            </div>
                          </div>
                        </td>
                         <td className="px-8 py-6 font-bold text-slate-900">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-205 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                               <Package size={14} />
                             </div>
                             <div className="flex flex-col">
                               <span className="truncate max-w-[150px] tracking-tight text-slate-800">{log.productName}</span>
                               <div className="flex gap-2 mt-0.5 items-center">
                                 {log.grade && (
                                   <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest whitespace-nowrap bg-indigo-50 px-1 border border-indigo-100 rounded">
                                     {log.grade}
                                   </span>
                                 )}
                                 {log.size && (
                                   <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest bg-slate-50 px-1.5 border border-slate-200 rounded whitespace-nowrap">
                                     {log.size}
                                   </span>
                                 )}
                               </div>
                               <span className="text-[8.5px] font-extrabold tracking-tight text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 w-fit mt-1">
                                 👤 {log.userEmail || 'system@luxury-paint.com'}
                               </span>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            log.type === 'INTAKE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {log.type === 'INTAKE' ? '+ STOCK' : '- STOCK'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right font-mono font-black text-slate-500">
                          {log.previousQuantity.toLocaleString(undefined, { minimumFractionDigits: log.unit === 'kg' ? 2 : 0 })}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className={`flex items-center justify-end gap-1 font-black font-mono ${
                            log.type === 'INTAKE' ? 'text-blue-600' : 'text-red-650'
                          }`}>
                            {log.type === 'INTAKE' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {Math.abs(log.amount).toLocaleString(undefined, { minimumFractionDigits: log.unit === 'kg' ? 2 : 0 })}
                            <span className="text-[8px] uppercase tracking-tighter opacity-50 ml-0.5">{log.unit}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right font-mono font-black text-slate-900 text-base italic tracking-tighter">
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
      )}
    </div>
  );
}
