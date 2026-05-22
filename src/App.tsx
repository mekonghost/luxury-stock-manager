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
  FileUp,
  LayoutDashboard,
  MonitorDown,
  Code
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
import { LanguageProvider, useLanguage } from './lib/LanguageContext';
import { getUserPermissions, PREDEFINED_ACCOUNTS } from './lib/permissions';
import AccountsPanel from './components/AccountsPanel';
import { ApiIntegrationPanel } from './components/ApiIntegrationPanel';

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
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { lang, setLang, t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'staff' | 'customer' | 'admin'>('staff');
  const [view, setView] = useState<'stock' | 'inventory' | 'history' | 'quick-adjust' | 'admin' | 'accounts' | 'api'>('stock');
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
  const [activeStatFilter, setActiveStatFilter] = useState<'all' | 'inactive' | 'low_stock'>('all');
  const [customUsersList, setCustomUsersList] = useState<any[]>([]);

  // Load custom user permissions from Firestore
  useEffect(() => {
    if (!user) {
      setCustomUsersList([]);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, 'user_permissions_config'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setCustomUsersList(list);
    }, (err) => {
      console.error("Error loading user permissions:", err);
    });
    return () => unsubscribe();
  }, [user]);

  const permissions = useMemo(() => {
    const defaultPerm = getUserPermissions(user?.email);
    if (!user || !user.email) return defaultPerm;
    
    const matchedCustom = customUsersList.find(
      u => u.email.toLowerCase() === user.email?.toLowerCase()
    );
    if (matchedCustom) {
      if (matchedCustom.isDeleted) {
        return {
          email: user.email.toLowerCase(),
          canSeeFinishSection: false,
          canManageFinishProducts: false,
          canChangeFinishStock: false,
          canManageMaterialsProducts: false,
          canChangeMaterialsStock: false,
          canSeeAdminMenu: false,
          canSeeRegistryMenu: false,
          canSeeBurstMode: false,
          canSeeLogs: false,
          canManageAccounts: false,
          roleLabel: 'Deactivated'
        };
      }
      return {
        ...defaultPerm,
        ...matchedCustom
      };
    }
    return defaultPerm;
  }, [user, customUsersList]);

  // Handle automatic routing restrictions based on permissions
  useEffect(() => {
    if (user) {
      if (!permissions.canSeeAdminMenu && view === 'admin') {
        setView('stock');
      }
      if (!permissions.canSeeRegistryMenu && view === 'inventory') {
        setView('stock');
      }
      if (!permissions.canSeeFinishSection && activeSection === 'Finish') {
        setActiveSection('Materials');
      }
      if (!permissions.canManageAccounts && view === 'accounts') {
        setView('stock');
      }
    }
  }, [view, permissions, user, activeSection]);

  // PWA Prompt status
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  
  // Login state
  const [email, setEmail] = useState('test@gmail.com');
  const [password, setPassword] = useState('12345678');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        if (u.email?.toLowerCase() === 'stuff@luxurypaint.com') {
          setRole('staff');
        } else if (u.email?.toLowerCase() === 'customer@luxurypaint.com') {
          setRole('customer');
          // Customers only see stock and history
          if (view !== 'stock' && view !== 'history') {
            setView('stock');
          }
        } else {
          setRole('admin'); // Default for other users (like the developer)
        }
      }
      setLoading(false);
    });
  }, [view]);

  // Handle PWA installation prompts
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If already running standalone on mobile/desktop
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install outcome: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    } else {
      // Fallback message for unsupported browsers/scenarios
      showToast('To install onto your Home Screen, choose "Add to Home Screen" or click the install icon in your browser\'s URL bar.', 'info');
    }
  };

  useEffect(() => {
    if (!user) {
      setProducts([]);
      return;
    }

    const q = query(
      collection(db, 'products'),
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

  const sectionProducts = useMemo(() => {
    return products.filter(p => {
      const section = p.section || 'Materials';
      const matchesSection = section === activeSection;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSection && matchesSearch;
    });
  }, [products, searchQuery, activeSection]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const section = p.section || 'Materials';
      const matchesSection = section === activeSection;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSection || !matchesSearch) return false;

      if (activeStatFilter === 'inactive') {
        return p.quantity === 0;
      }
      if (activeStatFilter === 'low_stock') {
        return p.quantity > 0 && p.quantity <= p.minStockLevel;
      }

      if (selectedCategory === 'Low Stock') {
        return p.quantity <= p.minStockLevel;
      }
      
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesCategory;
    });
  }, [products, searchQuery, selectedCategory, activeSection, activeStatFilter]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    const trimmedEmail = email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();

    // Check predefined static accounts
    const matchedPredefined = PREDEFINED_ACCOUNTS.find(
      acc => acc.email.toLowerCase() === normalizedEmail
    );

    try {
      // 1. Check custom permissions and overrides from Firestore first
      const { getDoc, doc } = await import('firebase/firestore');
      const customUserDoc = await getDoc(doc(db, 'user_permissions_config', normalizedEmail));
      const customUserData = customUserDoc.exists() ? customUserDoc.data() : null;

      if (customUserData?.isDeleted) {
        throw new Error(lang === 'km' ? 'គណនីនេះត្រូវបានលុប ឬផ្អាកដំណើរការ' : 'This account has been deactivated or deleted');
      }

      let isAllowed = false;

      if (customUserData) {
        isAllowed = (customUserData.password === password);
      } else if (matchedPredefined) {
        isAllowed = (matchedPredefined.password === password);
      } else {
        // Standard user login with standard Firebase Auth
        isAllowed = true;
      }

      if (!isAllowed) {
        throw new Error(lang === 'km' ? 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ' : 'Incorrect password');
      }

      // If allowed, sign in or auto-provision the user inside Firebase Auth
      if (customUserData || matchedPredefined) {
        try {
          await loginWithEmail(trimmedEmail, password);
        } catch (loginErr: any) {
          // If user does not exist in Firebase Auth yet, attempt to register them
          try {
            await createAccount(trimmedEmail, password);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              throw loginErr;
            }
            throw createErr;
          }
        }
      } else {
        // Standard Firebase Auth login
        await loginWithEmail(trimmedEmail, password);
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || 'Invalid credentials. Check if Email Auth is enabled in Firebase.');
    } finally {
      setIsLoggingIn(false);
    }
  };



  const handleAdjustStock = async (id: string, amount: number, grade?: string, size?: string) => {
    if (!user || role === 'customer') return;
    try {
      const product = products.find(p => p.id === id);
      if (!product) return;
      
      // Permission guards
      if (product.section === 'Finish' && !permissions.canChangeFinishStock) {
        showToast(lang === 'km' ? 'គ្មានសិទ្ធិកែប្រែស្តុកផលិតផលសម្រេចទេ' : 'No permission to adjust Finish Paint stocks', 'info');
        return;
      }
      if (product.section === 'Materials' && !permissions.canChangeMaterialsStock) {
        showToast(lang === 'km' ? 'គ្មានសិទ្ធិកែប្រែស្តុកវត្ថុធាតុដើមទេ' : 'No permission to adjust Materials stocks', 'info');
        return;
      }

      let newQuantity = product.quantity;
      let prevVarQty = product.quantity;
      let nextVarQty = product.quantity + amount;
      const updateData: any = { updatedAt: serverTimestamp() };
      
      if (product.section === 'Finish' && grade && size) {
        const finishStocks = product.finishStocks || {};
        const gradeStocks = finishStocks[grade] || {};
        prevVarQty = gradeStocks[size] || 0;
        nextVarQty = Math.max(0, prevVarQty + amount);
        
        const newFinishStocks = {
          ...finishStocks,
          [grade]: {
            ...gradeStocks,
            [size]: nextVarQty
          }
        };
        
        updateData.finishStocks = newFinishStocks;
        // Total sum of all bases and sizes
        newQuantity = Object.values(newFinishStocks).reduce((acc: number, sizes: any) => {
          const sizeSum = Object.values(sizes).reduce((sAcc: number, val: any) => sAcc + (parseFloat(val as string) || 0), 0) as number;
          return acc + sizeSum;
        }, 0);
        updateData.quantity = newQuantity;
      } else {
        newQuantity = Math.max(0, product.quantity + amount);
        updateData.quantity = newQuantity;
        nextVarQty = newQuantity;
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'products', id), updateData);

      const logRef = doc(collection(db, 'stock_logs'));
      batch.set(logRef, {
        productId: id,
        productName: product.name,
        amount: amount,
        unit: size || product.unit || 'bucket',
        section: product.section,
        grade: grade || '',
        size: size || '',
        previousQuantity: prevVarQty,
        newQuantity: nextVarQty,
        type: amount > 0 ? 'INTAKE' : 'OUTTAKE',
        ownerId: user.uid,
        userEmail: user.email || 'unknown@luxury-paint.com',
        createdAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'products');
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    if (!user || role === 'customer') return;
    setIsSaving(true);
    try {
      const finalSection = productData.section || activeSection;
      
      // Permission guards
      if (finalSection === 'Finish' && !permissions.canManageFinishProducts) {
        showToast(lang === 'km' ? 'គ្មានសិទ្ធិគ្រប់គ្រងផលិតផលសម្រេចទេ' : 'No permission to manage Finish products', 'info');
        setIsSaving(false);
        return;
      }
      if (finalSection === 'Materials' && !permissions.canManageMaterialsProducts) {
        showToast(lang === 'km' ? 'គ្មានសិទ្ធិគ្រប់គ្រងវត្ថុធាតុដើមទេ' : 'No permission to manage Materials products', 'info');
        setIsSaving(false);
        return;
      }

      if (editingProduct?.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...productData,
          minStockLevel: 100,
          updatedAt: serverTimestamp(),
        });
        showToast('Item Updated');
      } else {
        const batch = writeBatch(db);
        const productRef = doc(collection(db, 'products'));

        batch.set(productRef, {
          ...productData,
          minStockLevel: 100,
          section: finalSection,
          ownerId: user.uid,
          updatedAt: serverTimestamp(),
        });

        const logRef = doc(collection(db, 'stock_logs'));
        batch.set(logRef, {
          productId: productRef.id,
          productName: productData.name,
          amount: productData.quantity || 0,
          unit: productData.unit || (finalSection === 'Finish' ? 'total' : 'bucket'),
          section: finalSection,
          previousQuantity: 0,
          newQuantity: productData.quantity || 0,
          type: 'INTAKE',
          ownerId: user.uid,
          userEmail: user.email || 'unknown@luxury-paint.com',
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
    if (!user || role === 'customer') return;
    const product = products.find(p => p.id === id);
    if (!product) return;

    // Permission guard
    if (product.section === 'Finish' && !permissions.canManageFinishProducts) {
      showToast(lang === 'km' ? 'គ្មានសិទ្ធិលុបផលិតផលសម្រេចទេ' : 'No permission to delete Finish products', 'info');
      return;
    }
    if (product.section === 'Materials' && !permissions.canManageMaterialsProducts) {
      showToast(lang === 'km' ? 'គ្មានសិទ្ធិលុបវត្ថុធាតុដើមទេ' : 'No permission to delete Materials products', 'info');
      return;
    }

    if (!window.confirm(lang === 'km' ? 'តើអ្នកពិតជាចង់លុបទំនិញនេះមែនទេ?' : 'Confirm Deletion?')) return;

    try {
      await deleteDoc(doc(db, 'products', id));
      showToast('Item Deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
    }
  };

  const handleImportStockList = async () => {
    if (!user || role === 'customer' || !window.confirm('Import 100+ items to Materials registry?')) return;
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
          userEmail: user.email || 'unknown@luxury-paint.com',
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
    if (!user || role === 'customer' || !window.confirm('DANGER: Clear all products and logs? This cannot be undone.')) return;
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
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-12 h-12 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 bg-grid-white">
        <div className="w-full max-w-md relative">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] animate-pulse" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200/80 relative z-10"
          >
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-slate-100"
              >
                <span>🌐</span>
                <span>{lang === 'en' ? 'ភាសាខ្មែរ' : 'English'}</span>
              </button>
            </div>

            <div className="flex flex-col items-center mb-10 text-center">
              <img 
                src="https://i.imgur.com/MUGtlwi.jpeg" 
                alt="Luxury Paint" 
                className="h-20 w-auto mb-2 rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">{t('identifier')}</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-bold placeholder:text-slate-400"
                    placeholder={t('emailPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">{t('accessKey')}</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-14 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-bold placeholder:text-slate-400"
                    placeholder={t('passwordPlaceholder')}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="text-red-700 text-[10px] font-black text-center bg-red-50 p-4 rounded-2xl border border-red-200 uppercase tracking-wider">
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
                    <span>{t('initializeInterface')}</span>
                  )}
                </button>

              </div>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-blue-500/10 selection:text-blue-900 bg-grid-white">
      <AlertBanner products={products} />
      
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-30 shadow-sm shadow-slate-100/40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://i.imgur.com/MUGtlwi.jpeg" 
              alt="Luxury Paint" 
              className="h-12 w-auto rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden md:flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setView('stock')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'stock' ? 'bg-blue-600 text-white shadow-lg shadow-blue-550/15' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
              >
                <LayoutDashboard size={14} />
                <span>{t('stock')}</span>
              </button>
              
              {permissions.canSeeRegistryMenu && (
                <button
                  onClick={() => setView('inventory')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'inventory' ? 'bg-slate-700 text-white shadow-lg shadow-slate-700/15' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                  <Package size={14} />
                  <span>{t('registry')}</span>
                </button>
              )}
              
              {permissions.canSeeBurstMode && (
                <button
                  onClick={() => setView('quick-adjust')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'quick-adjust' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                  <Zap size={14} />
                  <span>{t('burstMode')}</span>
                </button>
              )}
              
              {permissions.canSeeLogs && (
                <button
                  onClick={() => setView('history')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'history' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                  <HistoryIcon size={14} />
                  <span>{t('logs')}</span>
                </button>
              )}

              {permissions.canSeeAdminMenu && (
                <button
                  onClick={() => setView('admin')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-white text-slate-900 border border-slate-200/50 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                  <Database size={14} />
                  <span>{t('admin')}</span>
                </button>
              )}

              {permissions.canManageAccounts && (
                <button
                  onClick={() => setView('accounts')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'accounts' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/15' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                  <Lock size={14} />
                  <span>🔐 {lang === 'km' ? 'គណនី' : 'Accounts'}</span>
                </button>
              )}

              {user?.email?.toLowerCase() === 'chhayheng@luxury-paint.com' && (
                <button
                  onClick={() => setView('api')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'api' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/15' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                  <Code size={14} />
                  <span>🔌 {lang === 'km' ? 'គេហទំព័រ API' : 'API Connection'}</span>
                </button>
              )}
            </nav>

            <div className="flex items-center gap-3 md:pl-4 md:border-l border-slate-200 md:ml-4">
               <button
                onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
                className="flex items-center gap-1 px-2.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl border border-blue-200 text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 ml-1"
                title="Switch Language / ផ្លាស់ប្តូរភាសា"
               >
                 <span>🌐</span>
                 <span>{lang === 'en' ? 'ខ្មែរ' : 'EN'}</span>
               </button>

               <button 
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-all text-[9.5px] font-black uppercase tracking-wider border border-slate-200 active:scale-95 ml-1 relative group shadow-sm"
                title="Install Luxury Paint Stock onto Desktop Home Screen"
               >
                 <MonitorDown size={14} className={`shrink-0 ${showInstallBtn ? "text-emerald-500 animate-bounce" : "text-slate-500"}`} />
                 <span className="hidden sm:inline">{t('installApp')}</span>
                 {showInstallBtn && (
                   <span className="absolute -top-1 -right-1 flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                   </span>
                 )}
               </button>

               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-800 leading-none">{user.email?.split('@')[0].toUpperCase()}</p>
                  <p className="text-[8px] text-blue-600 font-extrabold uppercase mt-1 tracking-tight">{permissions.roleLabel}</p>
               </div>
               <button 
                onClick={() => logout()}
                className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-600 border border-slate-200 transition-all shadow-sm"
               >
                 <LogOut size={16} />
               </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-12">
        <div className="flex justify-center mb-8">
           <div className={`flex bg-white p-1.5 rounded-2xl border-2 border-slate-800 shadow-md ${!permissions.canSeeFinishSection ? 'border-dashed' : ''}`}>
            <button
               onClick={() => {
                 setActiveSection('Materials');
                 setActiveStatFilter('all');
               }}
              className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'Materials' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              {t('materials')}
            </button>
            {permissions.canSeeFinishSection && (
              <button
                 onClick={() => {
                   setActiveSection('Finish');
                   setActiveStatFilter('all');
                 }}
                className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeSection === 'Finish' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                {t('finish')}
              </button>
            )}
          </div>
        </div>

        <InventoryStats 
          products={sectionProducts} 
          activeFilter={activeStatFilter}
          onFilterChange={setActiveStatFilter}
        />

        <AnimatePresence mode="wait">
          {view === 'stock' ? (
            <motion.div
              key="stock-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="px-4">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">{t('liveStockLevels')}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('realTimeTerminal')}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder={t('searchStock')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-800 rounded-2xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-black shadow-md placeholder:text-slate-400"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 gap-6 mb-32">
                {filteredProducts.map((p) => (
                  <motion.div
                    layout
                    key={p.id}
                    className={`group bg-white p-6 sm:p-8 rounded-[2rem] border-2 ${
                      p.section === 'Materials' ? 'border-l-[12px] border-l-blue-600 border-y-slate-800 border-r-slate-800' : 'border-l-[12px] border-l-indigo-600 border-y-slate-800 border-r-slate-800'
                    } shadow-md shadow-slate-200 hover:shadow-2xl hover:shadow-slate-300 hover:border-r-slate-950 hover:border-y-slate-950 hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 relative overflow-hidden`}
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex w-12 h-12 sm:w-14 sm:h-14 rounded-2xl items-center justify-center font-black font-mono text-xl shrink-0 border border-slate-300 shadow-inner bg-slate-50 overflow-hidden">
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              p.name[0].toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-lg sm:text-xl text-slate-800 break-words whitespace-normal tracking-tight leading-tight">{p.name}</h3>
                              {/* Edit & Delete disabled in Finish menu */}
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{p.category || t('general')}</p>
                          </div>
                        </div>

                        {!(p.section === 'Finish' && (p.availableBases?.length ?? 0) > 0 && (p.availableSizes?.length ?? 0) > 0) && (
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right shrink-0">
                              <div className="flex items-baseline justify-end gap-1.5">
                                <span className={`text-2xl font-black font-mono tracking-tighter ${p.quantity <= p.minStockLevel ? 'text-red-500' : 'text-slate-805'}`}>
                                  {p.quantity.toLocaleString(undefined, { minimumFractionDigits: p.unit === 'kg' ? 2 : 0 })}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase">{p.unit}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {p.section === 'Finish' && (p.availableBases?.length ?? 0) > 0 && (p.availableSizes?.length ?? 0) > 0 && (
                        <div className="w-full mt-4 p-5 bg-slate-100/50 border-2 border-slate-800 rounded-[2.5rem] shadow-inner">
                          <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-4">
                            Specifications and availability
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {(p.availableSizes || []).map(size => (
                              <div key={size} className="bg-white rounded-3xl p-5 border-2 border-slate-800 shadow-md hover:border-blue-600 transition-all">
                                <div className="flex items-center justify-between mb-4 border-b-2 border-slate-850 pb-2.5">
                                  <p className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest">{size}</p>
                                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600/30 border border-indigo-600" />
                                </div>
                                <div className="space-y-3">
                                  {(p.availableBases || []).map(base => (
                                    <div key={base} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-200 last:border-0">
                                      <span className="text-xs font-black text-slate-800 font-mono tracking-wide">{base}</span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs sm:text-sm font-black text-slate-950 font-mono bg-slate-50 px-3 py-1 rounded-md border border-slate-300 min-w-[2.5rem] text-center shadow-inner font-mono">
                                          {p.finishStocks?.[base]?.[size] ?? 0}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : view === 'inventory' ? (
            <motion.div
              key="inventory-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="px-4">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">{t('assetRegistry')}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('masterInventory')}</p>
              </div>

              {/* Controls */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder={t('searchRegistry')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-800 rounded-2xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-black shadow-md placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Modern High-Density List / Mobile Cards */}
              <div className="grid grid-cols-1 gap-6 mb-32">
                {filteredProducts.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-150">
                      <Package size={32} />
                    </div>
                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">{t('noRecords')}</p>
                    <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-[0.2em]">{t('readyInitialization')}</p>
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <motion.div
                      layout
                      key={p.id}
                      className={`group bg-white p-6 sm:p-8 rounded-[2rem] border-2 ${
                        p.section === 'Materials' ? 'border-l-[12px] border-l-blue-600 border-y-slate-800 border-r-slate-800' : 'border-l-[12px] border-l-indigo-600 border-y-slate-800 border-r-slate-800'
                      } shadow-md shadow-slate-200 hover:shadow-2xl hover:shadow-slate-300 hover:border-r-slate-950 hover:border-y-slate-950 hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 relative overflow-hidden`}
                    >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex w-12 h-12 sm:w-14 sm:h-14 rounded-2xl items-center justify-center font-black font-mono text-xl shrink-0 shadow-inner border border-slate-300 bg-slate-50 overflow-hidden group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover float-none" referrerPolicy="no-referrer" />
                            ) : (
                              p.name[0].toUpperCase()
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-black text-lg sm:text-xl text-slate-800 break-words whitespace-normal tracking-tight leading-tight">{p.name}</h3>
                              {((p.section === 'Finish' && permissions.canManageFinishProducts) || 
                                (p.section === 'Materials' && permissions.canManageMaterialsProducts)) && (
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingProduct(p);
                                      setIsFormOpen(true);
                                    }}
                                    className="p-1 px-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-all border border-slate-200 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm cursor-pointer"
                                    title="Edit product"
                                  >
                                    <Edit2 size={10} />
                                    <span>{t('edit')}</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(p.id!)}
                                    className="p-1 px-2 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all border border-slate-200 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm cursor-pointer"
                                    title="Delete product"
                                  >
                                    <Trash2 size={10} />
                                    <span>{t('delete')}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{p.category || t('general')}</p>
                          </div>
                        </div>

                        {!(p.section === 'Finish' && (p.availableBases?.length ?? 0) > 0 && (p.availableSizes?.length ?? 0) > 0) && (
                          <div className="text-right shrink-0 mr-12 sm:mr-0">
                            <div className="flex items-baseline justify-end gap-1.5">
                              <span className={`text-2xl font-black font-mono tracking-tighter ${p.quantity <= p.minStockLevel ? 'text-red-500' : 'text-slate-800'}`}>
                                {p.quantity.toLocaleString(undefined, { minimumFractionDigits: p.unit === 'kg' ? 2 : 0 })}
                              </span>
                              <span className="text-[10px] font-black text-slate-400 uppercase">{p.unit}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {p.section === 'Finish' && (p.availableBases?.length ?? 0) > 0 && (p.availableSizes?.length ?? 0) > 0 ? (
                        <div className="w-full mt-6 p-5 bg-slate-100/50 border-2 border-slate-800 rounded-[2.5rem] shadow-inner">
                             <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-4">Adjust quantities by size & base</p>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                               {(p.availableSizes || ['18L', '15L', '5L', '4L', '1L']).map(size => (
                                 <div key={size} className="bg-white rounded-3xl p-5 border-2 border-slate-800 shadow-md hover:border-blue-600 transition-all">
                                    <div className="flex items-center justify-between mb-4 border-b-2 border-slate-850 pb-2">
                                      <p className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest">{size}</p>
                                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600/30 border border-indigo-600" />
                                    </div>
                                    <div className="space-y-4">
                                      {(p.availableBases || ['Base A', 'Base B', 'Base C', 'Base D']).map(base => (
                                        <div key={base} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-200 last:border-0">
                                          <span className="text-xs sm:text-sm font-black text-slate-800 font-mono">{base}</span>
                                          <div className="flex items-center">
                                            <span className="text-xs sm:text-sm font-black text-slate-950 font-mono min-w-8 text-center px-2.5 py-1.5 bg-slate-50 rounded-lg border-2 border-slate-800 shadow-sm font-mono">
                                              {p.finishStocks?.[base]?.[size] ?? 0}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                 </div>
                               ))}
                             </div>
                          </div>
                        ) : null}

                        {/* Edit & Delete disabled in Finish menu */}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Session ID Footer */}
              <div className="pt-20 border-t border-slate-200 pb-12 flex flex-col items-center gap-4">
                 <p className="text-slate-400 text-[8px] font-bold uppercase tracking-[0.3em]">{t('sessionId')}: {user.uid.slice(0, 8)}</p>
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
              <div className="bg-white p-10 rounded-[3rem] border border-slate-250 border-dashed shadow-sm">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">{t('admin')}</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">{t('masterInventory')}</p>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setIsFormOpen(true);
                    }}
                    className="flex flex-col items-center justify-center p-12 bg-slate-50 hover:bg-white rounded-[2.5rem] border border-slate-200 transition-all hover:shadow-xl hover:shadow-slate-100 group w-full max-w-md"
                  >
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-blue-600/20 group-hover:scale-110 transition-transform">
                      <Plus size={32} />
                    </div>
                    <span className="font-black text-xs uppercase tracking-widest text-slate-700">{t('registerNewAsset')}</span>
                  </button>
                </div>
              </div>

               <div className="flex flex-col items-center opacity-50 py-10">
                 <p className="text-slate-500 font-mono text-[10px] uppercase">{t('kernelStatus')}</p>
                 <p className="text-slate-700 font-mono text-[9px] mt-1 uppercase">UID: {user.uid}</p>
               </div>
            </motion.div>
          ) : view === 'accounts' ? (
            <motion.div
              key="accounts-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <AccountsPanel customAccounts={customUsersList} currentUserEmail={user?.email || ''} />
            </motion.div>
          ) : view === 'api' ? (
            <motion.div
              key="api-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <ApiIntegrationPanel lang={lang} />
            </motion.div>
          ) : (
            <motion.div
              key="history-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StockHistory logs={filteredLogs} products={products} />
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
            <div className={`px-8 py-4 rounded-[2rem] shadow-2xl border border-slate-150 backdrop-blur-3xl flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-slate-900 text-white shadow-slate-500/20'
            }`}>
              {toast.type === 'info' ? <BellRing size={16} className="animate-bounce" /> : <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              <p className="font-black uppercase tracking-[0.2em] text-[10px] italic">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Components */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200 md:hidden p-4 pb-8 flex items-center justify-between gap-2 shadow-2xl">
        <button
          onClick={() => setView('stock')}
          className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-all ${view === 'stock' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">{t('stock')}</span>
        </button>
        
        {role !== 'customer' && (
          <>
            <button
              onClick={() => setView('inventory')}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-all ${view === 'inventory' ? 'bg-slate-700 text-white shadow-xl shadow-slate-700/20' : 'text-slate-400'}`}
            >
              <Package size={20} />
              <span className="text-[8px] font-black uppercase tracking-widest">{t('registry')}</span>
            </button>
          </>
        )}
        
        <button
          onClick={() => setView('history')}
          className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-all ${view === 'history' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-400'}`}
        >
          <HistoryIcon size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">{t('logs')}</span>
        </button>

        {role !== 'customer' && (
          <button
            onClick={() => setView('admin')}
            className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-all ${view === 'admin' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
          >
            <Database size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">{t('admin')}</span>
          </button>
        )}

        {permissions.canManageAccounts && (
          <button
            onClick={() => setView('accounts')}
            className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-all ${view === 'accounts' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
          >
            <Lock size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">{lang === 'km' ? 'គណនី' : 'Accounts'}</span>
          </button>
        )}

        {user?.email?.toLowerCase() === 'chhayheng@luxury-paint.com' && (
          <button
            onClick={() => setView('api')}
            className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-all ${view === 'api' ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'text-slate-400'}`}
          >
            <Code size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">{lang === 'km' ? 'API' : 'API'}</span>
          </button>
        )}
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
