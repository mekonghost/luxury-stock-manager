import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  UserPlus, 
  Lock, 
  CheckCircle, 
  XCircle, 
  Mail, 
  ShieldAlert,
  Eye, 
  EyeOff,
  UserCheck,
  Check,
  X
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PREDEFINED_ACCOUNTS, getUserPermissions, UserPermissions } from '../lib/permissions';
import { useLanguage } from '../lib/LanguageContext';

interface AccountsPanelProps {
  customAccounts: any[];
  currentUserEmail: string;
}

const DEFAULT_PERMISSIONS = {
  canSeeFinishSection: true,
  canManageFinishProducts: false,
  canChangeFinishStock: false,
  canManageMaterialsProducts: true,
  canChangeMaterialsStock: true,
  canSeeAdminMenu: false,
  canSeeRegistryMenu: false,
  canSeeBurstMode: true,
  canSeeLogs: true,
};

export default function AccountsPanel({ customAccounts, currentUserEmail }: AccountsPanelProps) {
  const { lang } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formRoleLabel, setFormRoleLabel] = useState('');
  const [formPermissions, setFormPermissions] = useState<Omit<UserPermissions, 'email' | 'roleLabel'>>({
    ...DEFAULT_PERMISSIONS
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Merge PREDEFINED_ACCOUNTS and customAccounts from Firestore
  const allAccounts = React.useMemo(() => {
    const list: any[] = [];

    // 1. Process Predefined accounts
    PREDEFINED_ACCOUNTS.forEach(pre => {
      const match = customAccounts.find(c => c.email.toLowerCase() === pre.email.toLowerCase());
      if (match) {
        if (match.isDeleted) {
          // Predefined account is soft-deleted/disabled, do not show
          return;
        }
        list.push({
          id: match.id,
          email: match.email,
          password: match.password,
          roleLabel: match.roleLabel,
          canSeeFinishSection: match.canSeeFinishSection,
          canManageFinishProducts: match.canManageFinishProducts,
          canChangeFinishStock: match.canChangeFinishStock,
          canManageMaterialsProducts: match.canManageMaterialsProducts,
          canChangeMaterialsStock: match.canChangeMaterialsStock,
          canSeeAdminMenu: match.canSeeAdminMenu,
          canSeeRegistryMenu: match.canSeeRegistryMenu,
          canSeeBurstMode: match.canSeeBurstMode,
          canSeeLogs: match.canSeeLogs,
          isPredefined: true,
          hasOverride: true
        });
      } else {
        const defaultPerms = getUserPermissions(pre.email);
        list.push({
          id: pre.email.toLowerCase(),
          email: pre.email,
          password: pre.password,
          roleLabel: defaultPerms.roleLabel,
          ...defaultPerms,
          isPredefined: true,
          hasOverride: false
        });
      }
    });

    // 2. Process Custom accounts
    customAccounts.forEach(c => {
      const isPre = PREDEFINED_ACCOUNTS.some(p => p.email.toLowerCase() === c.email.toLowerCase());
      if (!isPre && !c.isDeleted) {
        list.push({
          id: c.id,
          email: c.email,
          password: c.password,
          roleLabel: c.roleLabel,
          canSeeFinishSection: c.canSeeFinishSection,
          canManageFinishProducts: c.canManageFinishProducts,
          canChangeFinishStock: c.canChangeFinishStock,
          canManageMaterialsProducts: c.canManageMaterialsProducts,
          canChangeMaterialsStock: c.canChangeMaterialsStock,
          canSeeAdminMenu: c.canSeeAdminMenu,
          canSeeRegistryMenu: c.canSeeRegistryMenu,
          canSeeBurstMode: c.canSeeBurstMode,
          canSeeLogs: c.canSeeLogs,
          isPredefined: false,
          hasOverride: true
        });
      }
    });

    return list;
  }, [customAccounts]);

  const resetForm = () => {
    setFormEmail('');
    setFormPassword('');
    setFormRoleLabel('');
    setFormPermissions({ ...DEFAULT_PERMISSIONS });
    setEditingId(null);
  };

  const handleTogglePermission = (key: keyof typeof DEFAULT_PERMISSIONS) => {
    setFormPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail || !formPassword || !formRoleLabel) {
      showStatus(lang === 'km' ? 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់' : 'Please fill all fields', 'error');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formEmail)) {
      showStatus(lang === 'km' ? 'អាសយដ្ឋានអ៊ីមែលមិនត្រឹមត្រូវទេ' : 'Invalid email format', 'error');
      return;
    }

    setIsSubmitting(true);
    const lowercaseEmail = formEmail.trim().toLowerCase();

    // Guard to prevent editing or overwriting Chhayheng's own master account
    if (lowercaseEmail === 'chhayheng@luxury-paint.com') {
      showStatus(lang === 'km' ? 'អ្នកមិនអាចកែប្រែគណនីមេបានទេ' : 'Cannot modify master admin profile', 'error');
      setIsSubmitting(false);
      return;
    }

    try {
      // Save user permissions and login config securely to Firestore
      const userDocRef = doc(db, 'user_permissions_config', lowercaseEmail);
      await setDoc(userDocRef, {
        id: lowercaseEmail,
        email: lowercaseEmail,
        password: formPassword.trim(),
        roleLabel: formRoleLabel.trim(),
        ...formPermissions,
        isCustom: true,
        isDeleted: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showStatus(
        editingId 
          ? (lang === 'km' ? 'បានធ្វើបច្ចុប្បន្នភាពគណនីជោគជ័យ' : 'Account updated successfully 🎉')
          : (lang === 'km' ? 'បានបង្កើតគណនីថ្មីជោគជ័យ' : 'New account created successfully 🎉')
      );
      resetForm();
    } catch (err: any) {
      console.error(err);
      showStatus(err.message || 'Error saving user details', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (account: any) => {
    setEditingId(account.id);
    setFormEmail(account.email);
    setFormPassword(account.password || '');
    setFormRoleLabel(account.roleLabel || '');
    setFormPermissions({
      canSeeFinishSection: !!account.canSeeFinishSection,
      canManageFinishProducts: !!account.canManageFinishProducts,
      canChangeFinishStock: !!account.canChangeFinishStock,
      canManageMaterialsProducts: !!account.canManageMaterialsProducts,
      canChangeMaterialsStock: !!account.canChangeMaterialsStock,
      canSeeAdminMenu: !!account.canSeeAdminMenu,
      canSeeRegistryMenu: !!account.canSeeRegistryMenu,
      canSeeBurstMode: !!account.canSeeBurstMode,
      canSeeLogs: !!account.canSeeLogs,
    });
  };

  const handleDelete = async (id: string, email: string) => {
    if (email === 'chhayheng@luxury-paint.com') {
      showStatus(lang === 'km' ? 'មិនអាចលុបគណនីមេបានទេ' : 'Cannot delete master account', 'error');
      return;
    }

    const confirmMsg = lang === 'km' 
      ? `តើអ្នកពិតជាចង់លុបគណនី ${email} មែនទេ?` 
      : `Are you sure you want to delete account ${email}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const lowercaseEmail = email.trim().toLowerCase();
      const isPre = PREDEFINED_ACCOUNTS.some(p => p.email.toLowerCase() === lowercaseEmail);

      if (isPre) {
        // Since it's predefined, write doc with isDeleted: true
        const userDocRef = doc(db, 'user_permissions_config', lowercaseEmail);
        await setDoc(userDocRef, {
          id: lowercaseEmail,
          email: lowercaseEmail,
          isDeleted: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        // Totally custom account, delete the document
        await deleteDoc(doc(db, 'user_permissions_config', id));
      }
      showStatus(lang === 'km' ? 'បានលុបគណនីរួចរាល់' : 'Account deleted successfully');
      if (editingId === id) resetForm();
    } catch (err: any) {
      console.error(err);
      showStatus('Error deleting user profile', 'error');
    }
  };

  const permissionKeys = [
    { key: 'canSeeFinishSection', label: 'See Finish Section', kmLabel: 'មើលផ្នែកផលិតផលសម្រេច' },
    { key: 'canManageFinishProducts', label: 'Manage Finish Paint Info (Add/Edit/Delete)', kmLabel: 'គ្រប់គ្រងផលិតផលសម្រេច (ថែម/កែ/លុប)' },
    { key: 'canChangeFinishStock', label: 'Adjust Finish Paint Stock Quantities', kmLabel: 'កែប្រែចំនួនស្តុកបច្ចុប្បន្នផលិតផលសម្រេច' },
    { key: 'canManageMaterialsProducts', label: 'Manage Raw Materials Info (Add/Edit/Delete)', kmLabel: 'គ្រប់គ្រងវត្ថុធាតុដើម (ថែម/កែ/លុប)' },
    { key: 'canChangeMaterialsStock', label: 'Adjust Raw Materials Stock Quantities', kmLabel: 'កែប្រែចំនួនស្តុកបច្ចុប្បន្នវត្ថុធាតុដើម' },
    { key: 'canSeeAdminMenu', label: 'Access Asset Register Admin tab', kmLabel: 'ចូលប្រើប្រាស់ផ្នែកបញ្ជីមេ (Tab Admin)' },
    { key: 'canSeeRegistryMenu', label: 'Access Registry Data tab', kmLabel: 'ចូលប្រើប្រាស់ផ្នែកបញ្ជីលម្អិត (Tab Registry)' },
    { key: 'canSeeBurstMode', label: 'Access Burst Multi-Adjust tab', kmLabel: 'ចូលប្រើប្រាស់ផ្នែកកែសម្រួលលឿន (Tab Burst Mode)' },
    { key: 'canSeeLogs', label: 'Access System Log ledger tab', kmLabel: 'ចូលមើលប្រវត្តិប្រតិបត្តិការទាំងអស់ (Tab Logs)' }
  ];

  return (
    <div className="space-y-12">
      {/* Visual Header Banner */}
      <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b-4 border-rose-600 shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="p-2 sm:p-3 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20 text-white">
              <Lock size={24} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight italic">
              {lang === 'km' ? '🔐 គ្រប់គ្រងសិទ្ធិ និងគណនី' : '🔐 Access Security & Accounts'}
            </h1>
          </div>
          <p className="text-xs font-black text-rose-400 mt-2.5 uppercase tracking-widest leading-relaxed">
            {lang === 'km' ? 'បន្ទះគ្រប់គ្រងគណនីផ្តាច់មុខរបស់ Chhayheng' : 'Chhayheng\'s Exclusive Identity Control Console'}
          </p>
        </div>
        <div className="shrink-0 font-mono text-[9px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700/50 px-4 py-2.5 rounded-2xl">
          Authorized User: {currentUserEmail}
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 font-semibold text-xs border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
            : 'bg-red-50 text-red-800 border-red-250'
        } animate-bounce`}>
          {statusMessage.type === 'success' ? <UserCheck size={18} /> : <ShieldAlert size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Container */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-xl">
          <h2 className="text-base font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" />
            <span>{editingId ? (lang === 'km' ? 'កែសម្រួលគណនី' : 'Edit User Profile') : (lang === 'km' ? 'បង្កើតគណនីថ្មី' : 'Create Custom Account')}</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                User Email Sign In
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  disabled={!!editingId}
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-sm placeholder:text-slate-400 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none disabled:opacity-50"
                  placeholder="name@luxury-paint.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                User Password String
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-sm placeholder:text-slate-400 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  placeholder="Min 6 characters password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Display Role Label
              </label>
              <input
                type="text"
                value={formRoleLabel}
                onChange={e => setFormRoleLabel(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm placeholder:text-slate-400 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                placeholder={lang === 'km' ? 'ឧ. បុគ្គលិកឃ្លាំង (ផ្នែកវត្ថុធាតុដើម)' : 'e.g. Mern (Finish paint manager)'}
              />
            </div>

            {/* Permissions Checkbox / Grid Switches */}
            <div className="pt-4 border-t border-slate-150">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">
                Access Entitlements Matrix
              </label>
              <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1 select-none custom-scrollbar pb-3">
                {permissionKeys.map(({ key, label, kmLabel }) => {
                  const val = formPermissions[key as keyof typeof DEFAULT_PERMISSIONS];
                  return (
                    <div 
                      key={key} 
                      onClick={() => handleTogglePermission(key as keyof typeof DEFAULT_PERMISSIONS)}
                      className="flex items-start gap-3 p-2.5 hover:bg-slate-50 border border-slate-100 hover:border-slate-250 cursor-pointer rounded-xl transition"
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        val 
                          ? 'bg-blue-600 border-blue-700 text-white shadow-sm' 
                          : 'bg-white border-slate-350 text-transparent'
                      }`}>
                        <Check size={12} strokeWidth={4} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs text-slate-805 leading-none">{lang === 'km' ? kmLabel : label}</p>
                        <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400 mt-1">{key}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-150">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-black text-xs uppercase tracking-widest active:scale-95 transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-2 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-550 active:scale-95 shadow-md shadow-blue-500/10 transition flex items-center justify-center gap-1.5"
              >
                {editingId 
                  ? (lang === 'km' ? 'ធ្វើបច្ចុប្បន្នភាព' : 'Update User') 
                  : (lang === 'km' ? 'រក្សាទុកគណនី' : 'Save Account')
                }
              </button>
            </div>
          </form>
        </div>

        {/* Existing Accounts List */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              {lang === 'km' ? 'គណនីទាំងអស់' : 'All Accounts'} ({allAccounts.length})
            </h2>
            <div className="text-[8.5px] font-black text-rose-500 uppercase bg-rose-50 border border-rose-100 rounded-lg px-2 py-1">
              Live Secured
            </div>
          </div>

          {allAccounts.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-205 rounded-[2.5rem] py-16 text-center shadow-inner">
              <Mail className="mx-auto text-slate-350 mb-4" size={40} />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No accounts found</p>
              <p className="text-[9px] text-slate-400 mt-1">Add profiles in the settings console to permit logins.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allAccounts.map((acc, index) => (
                <div 
                  key={acc.id} 
                  className="bg-white border-2 border-slate-800 hover:border-blue-600 rounded-3xl p-5 shadow-md hover:-translate-y-0.5 transition-all duration-300 relative group overflow-hidden"
                >
                  <div className="absolute right-0 top-0 w-2 h-full bg-blue-600/10 group-hover:bg-blue-600 transition-colors" />
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black text-slate-800 whitespace-nowrap break-all">
                          {acc.email}
                        </span>
                        <span className="text-[8.5px] font-black text-blue-600 bg-blue-50 border border-blue-105 px-2 py-0.5 rounded-md uppercase tracking-tight shrink-0 font-sans">
                          {acc.roleLabel}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4">
                        <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Password Key: <span className="font-black text-slate-650 bg-slate-50 p-1 rounded select-all font-mono">{acc.password}</span>
                        </p>
                      </div>

                      {/* Pill style summary of permissions */}
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {permissionKeys.map(({ key }) => {
                          const val = acc[key];
                          return (
                            <span 
                              key={key} 
                              className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide border whitespace-nowrap ${
                                val 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                  : 'bg-red-50/50 text-red-400 border-red-100/50'
                              }`}
                            >
                              {val ? '✓' : '✗'} {key.replace('can', '').match(/[A-Z][a-z]+/g)?.join(' ')}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex sm:flex-col gap-2 shrink-0 self-end sm:self-start w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleEdit(acc)}
                        className="p-2 bg-slate-50 hover:bg-slate-800 hover:text-white rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider shadow-sm flex-1 sm:flex-none"
                        title="Edit profile"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id, acc.email)}
                        className="p-2 bg-slate-50 hover:bg-red-650 hover:text-white rounded-xl border border-slate-200 hover:border-red-650 transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider shadow-sm flex-1 sm:flex-none text-red-500"
                        title="Delete user config"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
