import React, { useState } from 'react';
import { Code, Copy, Check, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface ApiIntegrationPanelProps {
  lang: 'en' | 'km';
}

export const ApiIntegrationPanel: React.FC<ApiIntegrationPanelProps> = ({ lang }) => {
  const [apiKey] = useState('luxury-paint-stock-sharing-key-2026-xyz');
  const [isCopiedKey, setIsCopiedKey] = useState(false);
  const [isCopiedUrl, setIsCopiedUrl] = useState(false);
  const [isCopiedSnippet, setIsCopiedSnippet] = useState(false);
  
  // Playground State
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);
  const [isPlaygroundLoading, setIsPlaygroundLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const apiUrl = `${window.location.origin}/api/external/products`;

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testApi = async () => {
    setIsPlaygroundLoading(true);
    setPlaygroundResponse(null);
    try {
      let queryParams = [];
      if (categoryFilter) queryParams.push(`category=${categoryFilter}`);
      const fullUrl = queryParams.length > 0 ? `${apiUrl}?${queryParams.join('&')}` : apiUrl;

      const res = await fetch(fullUrl, {
        headers: {
          'X-API-Key': apiKey
        }
      });
      const data = await res.json();
      setPlaygroundResponse(data);
    } catch (err: any) {
      setPlaygroundResponse({ error: 'Connection failed', message: err.message });
    } finally {
      setIsPlaygroundLoading(false);
    }
  };

  const jsSnippet = `// Example: Fetch ONLY finish products & stock levels for your Order Website
fetch('${apiUrl}', {
  method: 'GET',
  headers: {
    'X-API-Key': '${apiKey}',
    'Accept': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => {
    // Only 'Finish' products are returned. Materials are excluded.
    console.log("Found " + data.products.length + " finish products:", data.products);
  })
  .catch(error => console.error("Error fetching paint stocks:", error));`;

  const t = {
    title: lang === 'km' ? 'ការតភ្ជាប់ប្រឡាយ API' : 'External API Connection',
    subtitle: lang === 'km' ? 'ប្រើប្រាស់ API នេះសម្រាប់មើលចំនួនស្តុកលម្អិតនៃផលិតផលសម្រេច (Finish Products)។ មិនគាំទ្រសម្ភារៈដើម (Materials) ឬការកែប្រែចំនួនស្តុកឡើយ។' : 'Use this read-only API to fetch stock levels of Finish products. Materials and stock modifications are restricted.',
    apiCredentials: lang === 'km' ? 'ព័ត៌មានសម្ងាត់ API (API Credentials)' : 'API Credentials',
    endpointUrl: lang === 'km' ? 'អាសយដ្ឋាន API (Endpoint URL)' : 'Endpoint URL',
    apiKeyLabel: lang === 'km' ? 'កូដសម្ងាត់ API (X-API-Key)' : 'API Secret Key (X-API-Key)',
    copy: lang === 'km' ? 'ចម្លង' : 'Copy',
    copied: lang === 'km' ? 'បានចម្លង ✓' : 'Copied ✓',
    authGuide: lang === 'km' ? 'របៀបបញ្ជូនកូដសម្ងាត់ (Authentication)' : 'Authentication Methods',
    guideText: lang === 'km' 
      ? 'អ្នកអាចបញ្ជូនកូដសម្ងាត់តាមរយៈ HTTP Header ឬ Query Parameter បានយ៉ាងងាយស្រួល ៖' 
      : 'You can authenticate your requests using either HTTP headers (recommended) or query parameters:',
    queryFilter: lang === 'km' ? 'ការចម្រាញ់ទិន្នន័យ (Query Filters)' : 'Query Filters',
    playground: lang === 'km' ? 'សាកល្បងម៉ាស៊ីន API (Live API Playground)' : 'Live API Playground',
    sendRequest: lang === 'km' ? 'ផ្ញើសំណើរសាកល្បង' : 'Send Test Request',
    loading: lang === 'km' ? 'កំពុងទាញយកទិន្នន័យ...' : 'Fetching live data...',
    codeSnippet: lang === 'km' ? 'កូដគំរូ JavaScript (JavaScript Code Snippet)' : 'JavaScript Code Snippet'
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-2">
      {/* Introduction Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-5 pointer-events-none">
          <Code size={300} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              <span>Developer API</span>
            </div>
            <h1 className="text-3xl font-black italic tracking-tight uppercase leading-tight">{t.title}</h1>
            <p className="text-slate-300 text-xs font-semibold leading-relaxed max-w-xl">{t.subtitle}</p>
          </div>
          <div className="shrink-0">
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest block bg-slate-950/40 p-3 rounded-2xl border border-slate-700">
              Authorized Email: <strong className="text-white">chhayheng@luxury-paint.com</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Credentials & Snaps */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Endpoint Details */}
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              {t.apiCredentials}
            </h2>

            {/* URL bar */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">{t.endpointUrl}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 font-mono text-[11px] bg-slate-50 p-4 rounded-xl border border-slate-200 select-all overflow-x-auto whitespace-nowrap text-slate-700 flex items-center">
                  <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-black mr-2">GET</span>
                  {apiUrl}
                </div>
                <button
                  onClick={() => copyToClipboard(apiUrl, setIsCopiedUrl)}
                  className={`px-4 py-3 bg-slate-100 text-slate-650 hover:bg-slate-200 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-slate-200/60 cursor-pointer ${isCopiedUrl ? 'bg-emerald-50 text-emerald-600 border-emerald-250' : ''}`}
                >
                  {isCopiedUrl ? <Check size={14} /> : <Copy size={14} />}
                  <span>{isCopiedUrl ? t.copied : t.copy}</span>
                </button>
              </div>
            </div>

            {/* Secret Key bar */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">{t.apiKeyLabel}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 font-mono text-[11px] bg-slate-50 p-4 rounded-xl border border-slate-200 select-all overflow-x-auto whitespace-nowrap text-slate-700 flex items-center">
                  {apiKey}
                </div>
                <button
                  onClick={() => copyToClipboard(apiKey, setIsCopiedKey)}
                  className={`px-4 py-3 bg-slate-100 text-slate-650 hover:bg-slate-200 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-slate-200/60 cursor-pointer ${isCopiedKey ? 'bg-emerald-50 text-emerald-600 border-emerald-250' : ''}`}
                >
                  {isCopiedKey ? <Check size={14} /> : <Copy size={14} />}
                  <span>{isCopiedKey ? t.copied : t.copy}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Authentication Guide */}
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              {t.authGuide}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">{t.guideText}</p>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 block">Method 1: Custom HTTP Header (Recommended)</span>
                <p className="text-slate-450 text-[10px] font-bold">Pass the secret API key using the custom header:</p>
                <div className="font-mono text-[10px] bg-slate-900 text-green-400 p-3 rounded-lg border border-slate-800 select-all">
                  X-API-Key: {apiKey}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 block">Method 2: Standard Bearer Token Header</span>
                <p className="text-slate-450 text-[10px] font-bold">Standard authorization token:</p>
                <div className="font-mono text-[10px] bg-slate-900 text-green-400 p-3 rounded-lg border border-slate-800 select-all">
                  Authorization: Bearer {apiKey}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 block">Method 3: Query Parameter</span>
                <p className="text-slate-450 text-[10px] font-bold">Append the key directly into the request URL:</p>
                <div className="font-mono text-[10px] bg-slate-900 text-green-400 p-3 rounded-lg border border-slate-800 select-all overflow-x-auto whitespace-nowrap">
                  {apiUrl}?apiKey={apiKey}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Playground & Query Parameters */}
        <div className="lg:col-span-12 xl:col-span-5 lg:order-last space-y-8">
          
          {/* Query Filters */}
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              {t.queryFilter}
            </h2>
            
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100">
                <div>
                  <code className="bg-slate-100 text-slate-800 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">section</code>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Product Type Restriction</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded italic font-bold">Finish Only</span>
                  <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded italic line-through font-bold ml-1">Materials Disabled</span>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 py-2.5">
                <div>
                  <code className="bg-slate-100 text-slate-800 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">category</code>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Filter by category name</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded italic font-bold">e.g., Red, Wall Paint</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Playground */}
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse animate-duration-1000" />
              {t.playground}
            </h2>

            {/* Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider block mb-1">Section</label>
                <div className="w-full text-xs font-bold text-emerald-700 border border-emerald-100 rounded-xl p-2.5 bg-emerald-50/50 flex items-center justify-between">
                  <span>Finish Products</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
              
              <div>
                <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider block mb-1">Category</label>
                <input
                  type="text"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  placeholder="All categories"
                  className="w-full text-xs font-bold text-slate-755 border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              onClick={testApi}
              disabled={isPlaygroundLoading}
              className="w-full h-12 bg-amber-500 text-white hover:bg-amber-600 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest hover:shadow-lg hover:shadow-amber-500/15 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isPlaygroundLoading ? "animate-spin" : ""} />
              <span>{isPlaygroundLoading ? t.loading : t.sendRequest}</span>
            </button>

            {/* Sandbox Console Output */}
            {playgroundResponse && (
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-sans">Response JSON</span>
                <pre className="text-[10px] font-mono text-emerald-400 bg-slate-900 border border-slate-800 p-4 rounded-2xl max-h-[220px] overflow-y-auto overflow-x-auto select-all leading-tight">
                  {JSON.stringify(playgroundResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Code Snippet Card */}
      <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            {t.codeSnippet}
          </h2>
          <button
            onClick={() => copyToClipboard(jsSnippet, setIsCopiedSnippet)}
            className={`p-2 px-3 bg-slate-100 text-slate-650 hover:bg-slate-200 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 border border-slate-200/60 cursor-pointer ${isCopiedSnippet ? 'bg-emerald-50 text-emerald-600 border-emerald-250' : ''}`}
          >
            {isCopiedSnippet ? <Check size={12} /> : <Copy size={12} />}
            <span>{isCopiedSnippet ? t.copied : t.copy}</span>
          </button>
        </div>
        
        <pre className="text-[10px] sm:text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 p-6 rounded-[1.5rem] overflow-x-auto whitespace-pre leading-relaxed select-all">
          {jsSnippet}
        </pre>
      </div>
    </div>
  );
};
