/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  LogOut, 
  Store, 
  Edit2, 
  Trash2, 
  Package,
  Zap,
  Lock,
  Mail,
  Eye,
  EyeOff,
  BellRing, 
  Minus,
  History as HistoryIcon,
  ChevronRight,
  Database,
  FileUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  orderBy,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, loginWithEmail, createAccount, logout } from './lib/firebase';
import { 
  Product, 
  OperationType,
  StockAdjustment
} from './types';
import InventoryStats from './components/InventoryStats';
import AlertBanner from './components/AlertBanner';
import ProductForm from './components/ProductForm';
import StockHistory from './components/StockHistory';
import QuickAdjust from './components/QuickAdjust';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'inventory' | 'history' | 'quick-adjust' | 'admin'>('inventory');
  const [activeSection, setActiveSection] = useState<'Materials' | 'Finish'>('Materials');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<StockAdjustment[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Login state
  const [email, setEmail] = useState('test@gmail.com');
  const [password, setPassword] = useState('12345678');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      return;
    }

    const q = query(
      collection(db, 'products'),
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      return;
    }

    const q = query(
      collection(db, 'stock_logs'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: StockAdjustment[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as StockAdjustment);
      });
      setLogs(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stock_logs');
    });

    return () => unsubscribe();
  }, [user]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => (l.section || 'Materials') === activeSection);
  }, [logs, activeSection]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSection = p.section === activeSection;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (selectedCategory === 'Low Stock') {
        return matchesSection && matchesSearch && p.quantity <= p.minStockLevel;
      }
      
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSection && matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory, activeSection]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setLoginError('Invalid credentials. Check if Email Auth is enabled in Firebase.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateAdmin = async () => {
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await createAccount(email, password);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdjustStock = async (id: string, amount: number) => {
    if (!user) return;
    try {
      const product = products.find(p => p.id === id);
      if (!product) return;
      
      const newQuantity = Math.max(0, product.quantity + amount);
      const batch = writeBatch(db);
      
      const productRef = doc(db, 'products', id);
      batch.update(productRef, {
        quantity: newQuantity,
        updatedAt: serverTimestamp(),
      });

      const logRef = doc(collection(db, 'stock_logs'));
      batch.set(logRef, {
        productId: id,
        productName: product.name,
        amount: amount,
        unit: product.unit || 'bucket',
        section: product.section,
        previousQuantity: product.quantity,
        newQuantity: newQuantity,
        type: amount > 0 ? 'INTAKE' : 'OUTTAKE',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'products');
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (editingProduct?.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...productData,
          updatedAt: serverTimestamp(),
        });
        showToast('Item Updated');
      } else {
        const batch = writeBatch(db);
        const productRef = doc(collection(db, 'products'));
        batch.set(productRef, {
          ...productData,
          section: activeSection,
          ownerId: user.uid,
          updatedAt: serverTimestamp(),
        });

        const logRef = doc(collection(db, 'stock_logs'));
        batch.set(logRef, {
          productId: productRef.id,
          productName: productData.name,
          amount: productData.quantity,
          unit: productData.unit || 'bucket',
          section: activeSection,
          previousQuantity: 0,
          newQuantity: productData.quantity,
          type: 'INTAKE',
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });

        await batch.commit();
        showToast('Item Created');
      }
      setIsFormOpen(false);
      setEditingProduct(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Confirm Deletion?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      showToast('Item Deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
    }
  };

  const handleImportStockList = async () => {
    if (!user || !window.confirm('Import 100+ items to Materials registry?')) return;
    setIsLoggingIn(true);
    try {
      const items: { name: string; unit: 'kg' | 'unit' }[] = [
        // Page 1
        { name: "Box Painting (5L & 1L) 39*39*27", unit: "unit" },
        { name: "Box Painting 45*45*23", unit: "unit" },
        { name: "Box Painting Metrol 1L (6pcs)", unit: "unit" },
        { name: "Box Painting Metrol 39*39*22", unit: "unit" },
        { name: "Box Painting Pro Shield 45*45*24", unit: "unit" },
        { name: "Can Anti Shield 18L", unit: "unit" },
        { name: "Can Anti Shield 5L", unit: "unit" },
        { name: "Can Elephant Flex2K 15L", unit: "unit" },
        { name: "Can Elephant Flex2K 5L", unit: "unit" },
        { name: "Can Flex 828 1L", unit: "unit" },
        { name: "Can Flex 828 4L", unit: "unit" },
        { name: "Can Latex Easy Clean 18L", unit: "unit" },
        { name: "Can Latex Easy Clean 5L", unit: "unit" },
        { name: "Can LV 18L", unit: "unit" },
        { name: "Can LV Gold 18L", unit: "unit" },
        { name: "Can LV Plus", unit: "unit" },
        { name: "Can Metrol 15L", unit: "unit" },
        { name: "Can Metrol 1L", unit: "unit" },
        { name: "Can Metrol 4L", unit: "unit" },
        { name: "Can Metrol Gold 15L", unit: "unit" },
        { name: "Can Metrol Gold 1L", unit: "unit" },
        { name: "Can Metrol Gold 4L", unit: "unit" },
        { name: "Can Metrol Silver 1L", unit: "unit" },
        { name: "Can Metrol Silver 4L", unit: "unit" },
        { name: "Can Plastic 1L (for Water Proof)", unit: "unit" },
        { name: "Can Plastic 5L (for Water Proof)", unit: "unit" },
        { name: "Can Premium 18L", unit: "unit" },
        { name: "Can Premium 5L", unit: "unit" },
        { name: "Can Premium Plus 18L", unit: "unit" },
        { name: "Can Premium Plus 5L", unit: "unit" },
        { name: "Can Pro Shield 15L", unit: "unit" },
        { name: "Can Pro Shield 5L", unit: "unit" },
        { name: "Can Sealer A2030 18L", unit: "unit" },
        { name: "Can Sealer A2030 5L", unit: "unit" },
        { name: "Can Sealer A297 5L", unit: "unit" },
        { name: "Can Semigloss 18L", unit: "unit" },
        { name: "Can Semigloss 5L", unit: "unit" },
        { name: "Can Super Hishield 18L", unit: "unit" },
        { name: "Can Super Hishield 5L", unit: "unit" },
        { name: "Can Superlux Matt 18L", unit: "unit" },
        
        // Page 2
        { name: "Can Superlux Matt 5L", unit: "unit" },
        { name: "Can Top Silk 18L", unit: "unit" },
        { name: "Can Top Silk 5L", unit: "unit" },
        { name: "RM-15-S-40", unit: "kg" },
        { name: "RM-Acrysol DR1", unit: "kg" },
        { name: "RM-Acrysol RM 2020 NPR", unit: "kg" },
        { name: "RM-Acrysol RM 825", unit: "kg" },
        { name: "RM-Alcosperse 602N", unit: "kg" },
        { name: "RM-Almatex A297 (AS-356)", unit: "kg" },
        { name: "RM-Almatex A9086 (AC-261)", unit: "kg" },
        { name: "RM-AMP 95", unit: "kg" },
        { name: "RM-Black Color 8594", unit: "kg" },
        { name: "RM-Butyl Carbitol", unit: "kg" },
        { name: "RM-Capstone FS61", unit: "kg" },
        { name: "RM-Cellosize QP52000H", unit: "kg" },
        { name: "RM-Chemistry Water Proof 5L", unit: "kg" },
        { name: "RM-Coatosil-2287", unit: "kg" },
        { name: "RM-CoCa3 White For Paint (GCC 700)", unit: "kg" },
        { name: "RM-CoCa3 White For Paint (NSS800)", unit: "kg" },
        { name: "RM-Gold Pigment 1133", unit: "kg" },
        { name: "RM-HPS", unit: "kg" },
        { name: "RM-Kaolin", unit: "kg" },
        { name: "RM-Kathon LXE", unit: "kg" },
        { name: "RM-Maincoat-HG100", unit: "kg" },
        { name: "RM-Orotan 731D", unit: "kg" },
        { name: "RM-Premix Binder", unit: "kg" },
        { name: "RM-Primal AS8000", unit: "kg" },
        { name: "RM-Propylene Glycol", unit: "kg" },
        { name: "RM-Rocima 363", unit: "kg" },
        { name: "RM-Rocima 623", unit: "kg" },
        { name: "RM-Sand 120-140Mesh", unit: "kg" },
        { name: "RM-Shield 22", unit: "kg" },
        { name: "RM-SHP 60", unit: "kg" },
        { name: "RM-Silver Pigment 350", unit: "kg" },
        { name: "RM-Titan 595", unit: "kg" },
        { name: "RM-Titanium White", unit: "kg" },
        { name: "RM-Triton X405", unit: "kg" },
        { name: "RM-Ucar Filmer IBT", unit: "kg" },
        { name: "RM-UV 3065", unit: "kg" },
        { name: "RM-WS 960", unit: "kg" },
        { name: "Plastic Bing Go", unit: "kg" },
        { name: "Plastic Blue Star", unit: "kg" },

        // Page 3
        { name: "Plastic Elephant 20Kg", unit: "kg" },
        { name: "Plastic Elephant 40Kg", unit: "kg" },
        { name: "Plastic Elephant Tile", unit: "kg" },
        { name: "Plastic In 25Kg", unit: "kg" },
        { name: "Plastic In 40Kg", unit: "kg" },
        { name: "Plastic Joint Compound", unit: "kg" },
        { name: "Plastic Luxury Mastic 25Kg", unit: "kg" },
        { name: "Plastic Luxury Skim Coat 25Kg", unit: "kg" },
        { name: "Plastic Premium Gold", unit: "kg" },
        { name: "Plastic SH Star", unit: "kg" },
        { name: "Plastic Sky Star", unit: "kg" },
        { name: "Plastic Supper A", unit: "kg" },
        { name: "RM-Black Cement", unit: "kg" },
        { name: "RM-Cement (White)", unit: "kg" },
        { name: "RM-CoCa3 (White)", unit: "kg" },
        { name: "RM-CoCa3 For Luxury Joint Compound", unit: "kg" },
        { name: "RM-MC001 Sodium", unit: "kg" },
        { name: "RM-MC003 HPMC", unit: "kg" },
        { name: "RM-MP EV for Tile / AE", unit: "kg" },
        { name: "RM-RPP / VAE", unit: "kg" },
        { name: "RM-Sand 120-140Mesh", unit: "kg" }
      ];

      const batch = writeBatch(db);
      
      items.forEach(item => {
        const productRef = doc(collection(db, 'products'));
        batch.set(productRef, {
          name: item.name,
          category: item.name.startsWith('RM-') ? 'Raw Materials' : (item.unit === 'unit' ? 'Paint Products' : 'Packaging'),
          section: 'Materials',
          quantity: 0,
          unit: item.unit,
          minStockLevel: 5,
          ownerId: user.uid,
          updatedAt: serverTimestamp(),
        });

        const logRef = doc(collection(db, 'stock_logs'));
        batch.set(logRef, {
          productId: productRef.id,
          productName: item.name,
          amount: 0,
          unit: item.unit,
          section: 'Materials',
          previousQuantity: 0,
          newQuantity: 0,
          type: 'INTAKE',
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
      showToast(`${items.length} Items Imported`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleClearAll = async () => {
    if (!user || !window.confirm('DANGER: Clear all products and logs? This cannot be undone.')) return;
    setIsLoggingIn(true);
    try {
      const batch = writeBatch(db);
      
      // Clear products
      const pSnapshot = await getDocs(query(collection(db, 'products'), where('ownerId', '==', user.uid)));
      pSnapshot.forEach(d => batch.delete(d.ref));
      
      // Clear logs
      const lSnapshot = await getDocs(query(collection(db, 'stock_logs'), where('ownerId', '==', user.uid)));
      lSnapshot.forEach(d => batch.delete(d.ref));
      
      await batch.commit();
      showToast('All Data Cleared', 'info');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 bg-grid-white">
        <div className="w-full max-w-md relative">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-slate-800 relative z-10"
          >
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-600/20">
                <Store size={32} />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Inventory OS</h1>
              <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest text-[10px]">Secure Storage Management</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Identifier</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-14 pr-5 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                    placeholder="Email Address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Access Key</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-14 pr-12 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                    placeholder="Password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="text-red-400 text-[10px] font-black text-center bg-red-500/10 p-4 rounded-2xl border border-red-500/20 uppercase tracking-wider">
                  {loginError}
                </div>
              )}

              <div className="flex flex-col gap-4 mt-8">
                <button
                  disabled={isLoggingIn}
                  type="submit"
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 active:scale-[0.98] transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Initialize Interface</span>
                  )}
                </button>

                <button
                  disabled={isLoggingIn}
                  type="button"
                  onClick={handleCreateAdmin}
                  className="text-slate-500 py-2 text-[9px] font-black uppercase tracking-[0.2em] hover:text-slate-300 transition-colors"
                >
                  Regenerate Admin Records
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-100">
      <AlertBanner products={products} />
      
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Store size={22} />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-lg tracking-tight text-white uppercase italic">Inventory OS</h1>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Terminal v1.2</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden md:flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50">
              <button
                onClick={() => setView('inventory')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Package size={14} />
                <span>Registry</span>
              </button>
              <button
                onClick={() => setView('quick-adjust')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'quick-adjust' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Zap size={14} />
                <span>Burst Mode</span>
              </button>
              <button
                onClick={() => setView('history')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <HistoryIcon size={14} />
                <span>Logs</span>
              </button>
              <button
                onClick={() => setView('admin')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Database size={14} />
                <span>Admin</span>
              </button>
            </nav>

            <div className="flex items-center gap-3 md:pl-4 md:border-l border-slate-800 md:ml-4">
               <div className="text-right">
                  <p className="text-[10px] font-black text-white leading-none">{user.email?.split('@')[0].toUpperCase()}</p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Super User</p>
               </div>
               <button 
                onClick={() => logout()}
                className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg"
               >
                 <LogOut size={16} />
               </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-12">
        <div className="flex justify-center mb-8">
           <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 shadow-2xl">
            <button
              onClick={() => setActiveSection('Materials')}
              className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'Materials' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Materials
            </button>
            <button
              onClick={() => setActiveSection('Finish')}
              className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'Finish' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Finish
            </button>
          </div>
        </div>

        <InventoryStats products={products} />

        <AnimatePresence mode="wait">
          {view === 'inventory' ? (
            <motion.div
              key="inventory-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="px-4">
                <h2 className="text-2xl font-black text-slate-50 tracking-tight italic uppercase">Asset Registry</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Master Inventory Database</p>
              </div>

              {/* Controls */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder="Scan asset registry..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black"
                  />
                </div>
                

                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-400 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95"
                >
                  <Plus size={18} strokeWidth={3} />
                  <span>Register Item</span>
                </button>
              </div>

              {/* Modern High-Density List / Mobile Cards */}
              <div className="grid grid-cols-1 gap-4 mb-32">
                {filteredProducts.length === 0 ? (
                  <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-16 text-center">
                    <div className="w-16 h-16 bg-slate-800 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Package size={32} />
                    </div>
                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No Records Found</p>
                    <p className="text-slate-700 text-[10px] mt-2 font-bold uppercase tracking-[0.2em]">Ready for initialization</p>
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <motion.div
                      layout
                      key={p.id}
                      className="group bg-slate-900/50 hover:bg-slate-900 p-5 sm:p-6 rounded-[2.5rem] border border-slate-800/50 hover:border-blue-500/30 transition-all flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex w-12 h-12 sm:w-14 sm:h-14 bg-slate-800 rounded-2xl items-center justify-center text-slate-400 font-black font-mono text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                          {p.name[0].toUpperCase()}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-black text-base sm:text-lg text-slate-50 truncate tracking-tight">{p.name}</h3>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-500 rounded-md text-[8px] font-black uppercase tracking-widest border border-slate-700/50">
                              {p.category || 'General'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest truncate">
                            {p.description || 'System Authenticated Asset'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 border-t sm:border-t-0 sm:border-r border-slate-800 pt-4 sm:pt-0 sm:pr-6 shrink-0">
                        <div className="flex flex-col items-start sm:items-end">
                          <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-1 sm:hidden">Current Level</p>
                          <div className="flex items-center gap-2">
                             <span className={`font-mono font-black text-2xl tracking-tighter ${p.quantity <= p.minStockLevel ? 'text-red-500' : 'text-slate-50'}`}>
                               {p.quantity.toLocaleString(undefined, { minimumFractionDigits: p.unit === 'kg' ? 2 : 0 })}
                             </span>
                             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">{p.unit}</span>
                          </div>
                          <div className={`text-[9px] font-black uppercase tracking-[0.2em] mt-0.5 ${p.quantity === 0 ? 'text-red-500 animate-pulse' : p.quantity <= p.minStockLevel ? 'text-amber-500' : 'text-blue-500'}`}>
                             {p.quantity === 0 ? 'Exhausted' : p.quantity <= p.minStockLevel ? 'Low Level' : 'Secure'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={() => handleAdjustStock(p.id!, p.unit === 'kg' ? -0.1 : -1)}
                            className="w-12 h-12 flex items-center justify-center bg-slate-800 text-slate-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-90"
                          >
                            <Minus size={16} strokeWidth={3} />
                          </button>
                          <button 
                            onClick={() => handleAdjustStock(p.id!, p.unit === 'kg' ? 0.1 : 1)}
                            className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-90"
                          >
                            <Plus size={16} strokeWidth={3} />
                          </button>
                          <div className="flex flex-col gap-1 ml-2">
                            <button 
                              onClick={() => {
                                setEditingProduct(p);
                                setIsFormOpen(true);
                              }}
                              className="p-2 sm:p-2.5 bg-slate-800/50 text-slate-500 rounded-lg hover:bg-slate-700 hover:text-white transition-all"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(p.id!)}
                              className="p-2 sm:p-2.5 bg-slate-800/50 text-slate-500 rounded-lg hover:bg-red-500/20 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Session ID Footer */}
              <div className="pt-20 border-t border-slate-900 pb-12 flex flex-col items-center gap-4">
                 <p className="text-slate-700 text-[8px] font-bold uppercase tracking-[0.3em]">Session ID: {user.uid.slice(0, 8)}</p>
              </div>
            </motion.div>
          ) : view === 'quick-adjust' ? (
            <motion.div
              key="quick-adjust-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <QuickAdjust products={filteredProducts} onAdjust={handleAdjustStock} />
            </motion.div>
          ) : view === 'admin' ? (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-slate-800 border-dashed">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-black text-slate-50 uppercase tracking-tight italic">Global Admin Panel</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Manage System Metadata & Registry</p>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setIsFormOpen(true);
                    }}
                    className="flex flex-col items-center justify-center p-12 bg-slate-800/50 hover:bg-slate-800 rounded-[2.5rem] border border-slate-700/50 transition-all group w-full max-w-md"
                  >
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-blue-600/20 group-hover:scale-110 transition-transform">
                      <Plus size={32} />
                    </div>
                    <span className="font-black text-xs uppercase tracking-widest text-slate-50">Register New Asset</span>
                  </button>
                </div>
              </div>

               <div className="flex flex-col items-center opacity-50 py-10">
                 <p className="text-slate-500 font-mono text-[10px] uppercase">Kernel Status: Operational</p>
                 <p className="text-slate-700 font-mono text-[9px] mt-1 uppercase">UID: {user.uid}</p>
               </div>
            </motion.div>
          ) : (
            <motion.div
              key="history-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StockHistory logs={filteredLogs} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className={`px-8 py-4 rounded-[2rem] shadow-2xl border-2 border-slate-800 backdrop-blur-3xl flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-slate-800 text-white shadow-black/20'
            }`}>
              {toast.type === 'info' ? <BellRing size={16} className="animate-bounce" /> : <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              <p className="font-black uppercase tracking-[0.2em] text-[10px] italic">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Components - Removed duplicate section toggle */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-2xl border-t border-slate-800 md:hidden p-4 pb-8 flex items-center justify-between gap-2 shadow-2xl">
        <button
          onClick={() => setView('inventory')}
          className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-all ${view === 'inventory' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-500'}`}
        >
          <Package size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Registry</span>
        </button>
        <button
          onClick={() => setView('history')}
          className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-all ${view === 'history' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-500'}`}
        >
          <HistoryIcon size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Logs</span>
        </button>
        <button
          onClick={() => setView('admin')}
          className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-all ${view === 'admin' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
        >
          <Database size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Admin</span>
        </button>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <ProductForm
            product={editingProduct}
            isSaving={isSaving}
            onClose={() => {
              setIsFormOpen(false);
              setEditingProduct(null);
            }}
            onSave={handleSaveProduct}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
