import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'km';

interface LanguageContextProps {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav / Views
    stock: "Stock",
    registry: "Registry",
    burstMode: "Burst Mode",
    logs: "Logs",
    admin: "Admin",
    installApp: "Install App",
    staffLevel: "STAFF LEVEL",
    customerLevel: "CUSTOMER LEVEL",
    adminLevel: "ADMIN LEVEL",
    
    // Auth Screen
    staffLink: "Staff Link",
    staffAccess: "Stuff Access",
    customerLink: "Customer Link",
    viewOnly: "View Only",
    identifier: "Identifier",
    emailPlaceholder: "Email Address",
    accessKey: "Access Key",
    passwordPlaceholder: "Password",
    initializeInterface: "Initialize Interface",
    initializing: "Initializing...",

    // General Words / Sections
    materials: "Materials",
    finish: "Finish",
    
    // Stats Banner / Cards
    assetTotal: "Asset Total",
    inactiveItems: "Inactive Items",
    lowStockLevel: "Low Stock Level",
    criticalAlert: "Critical Alert",
    stockWarning: "Stock Warning",
    itemsExhausted: "items exhausted",
    itemsRunningLow: "items are running low",
    checkInventory: "Check Inventory for details",
    dismiss: "Dismiss",
    noRecords: "No Records Found",
    readyInitialization: "Ready for initialization",

    // Stock View / Registry View
    liveStockLevels: "Live Stock Levels",
    realTimeTerminal: "Real-time terminal inventory data",
    assetRegistry: "Asset Registry",
    masterInventory: "Master Inventory Database",
    searchStock: "Search live stock...",
    searchRegistry: "Scan asset registry...",
    adjustQuantity: "Adjust Quantity",
    registerNewAsset: "Register New Asset",
    kernelStatus: "Kernel Status: Operational",
    sessionId: "Session ID",
    minStockLevel: "Min Stock Level",

    // History / Logs
    auditLogs: "Audit Logs",
    immutableHistory: "Immutable Transaction History",
    all: "ALL",
    intake: "INTAKE",
    outtake: "OUTTAKE",
    clearFilters: "Clear Filters",
    exportPdf: "Export PDF",
    noMovementData: "No logs match the current filters",
    timestamp: "Timestamp",
    identity: "Identity",
    action: "Action",
    prev: "Prev",
    delta: "Delta",
    post: "Post",
    events: "Events",
    report: "Report",

    // Form modal (ProductForm)
    editAsset: "Edit Asset",
    newAsset: "Register Asset",
    assetName: "Asset Name",
    barcode: "Barcode (Optional)",
    category: "Category",
    rawMaterials: "Raw Materials",
    paintProducts: "Paint Products",
    packaging: "Packaging",
    general: "General",
    unitOfMeasurement: "Unit of Measurement",
    minStockWarning: "Min Stock Level (Warning Threshold)",
    description: "Description / Internal Memo",
    detailsFinish: "Product Details & Finishes (Only for Finish section)",
    bases: "Available Bases",
    sizes: "Available Sizes",
    startingStockQty: "Starting Stock Quantity",
    currentStock: "Current Stock",
    saveAsset: "Save Asset Specifications",
    cancel: "Cancel",

    // Added Form translations
    inventoryManagement: "Inventory Management",
    departmentSection: "Department / Section",
    activeSizes: "Active Sizes",
    activeBases: "Active Bases",
    baseType: "Base Type",
    variantHelp: "Select bases and sizes above to enable variant-based tracking.",
    productNamePlaceholder: "e.g. Premium Cement",
    barcodePlaceholder: "Unique identifier...",
    descriptionPlaceholder: "Optional details...",
    commitRecords: "Commit Records",

    // Toast messages
    itemUpdated: "Item Updated",
    itemSaved: "Item Saved",
    itemDeleted: "Item Deleted",
    deleteConfirm: "Are you sure you want to delete this product?",
    importComplete: "Items Imported",
    clearConfirm: "DANGER: Clear all products and logs? This cannot be undone."
  },
  km: {
    // Nav / Views
    stock: "ស្តុកទំនិញ",
    registry: "បញ្ជីសារពើភ័ណ្ឌ",
    burstMode: "របៀបបញ្ចូលលឿន",
    logs: "ប្រវត្តិប្រត្តិការ",
    admin: "អ្នកគ្រប់គ្រង",
    installApp: "ដំឡើងកម្មវិធី",
    staffLevel: "កម្រិតបុគ្គលិក",
    customerLevel: "កម្រិតអតិថិជន",
    adminLevel: "កម្រិតអ្នកបច្ចេកទេស",

    // Auth Screen
    staffLink: "គណនីបុគ្គលិក",
    staffAccess: "ចូលជាបុគ្គលិក",
    customerLink: "គណនីអតិថិជន",
    viewOnly: "សម្រាប់តែចូលមើលទិន្នន័យ",
    identifier: "អត្តសញ្ញាណ (អ៊ីមែល)",
    emailPlaceholder: "បញ្ចូលអ៊ីមែលនៅទីនេះ...",
    accessKey: "លេខកូដសម្ងាត់",
    passwordPlaceholder: "ពាក្យសម្ងាត់",
    initializeInterface: "បើកដំណើរការកម្មវិធី",
    initializing: "កំពុងចាប់ផ្តើមប្រព័ន្ធ...",

    // General Words / Sections
    materials: "វត្ថុធាតុដើម (Materials)",
    finish: "ថ្នាំលាបសម្រេច (Finish)",

    // Stats Banner / Cards
    assetTotal: "មុខទំនិញសរុប",
    inactiveItems: "ទំនិញអស់ពីស្តុក",
    lowStockLevel: "មុខទំនិញស្តុកទាប",
    criticalAlert: "ការជូនដំណឹងបន្ទាន់",
    stockWarning: "ផ្ទាំងដំណឹងស្តុក",
    itemsExhausted: "មុខទំនិញត្រូវបានប្រើប្រាស់អស់",
    itemsRunningLow: "មុខទំនិញជិតអស់ពីស្តុក",
    checkInventory: "ពិនិត្យស្តុកសម្រាប់ព័ត៌មានលម្អិត",
    dismiss: "បិទចោល",
    noRecords: "រកមិនឃើញទិន្នន័យផលិតផលទេ",
    readyInitialization: "រៀបចំសម្រាប់ការចាប់ផ្តើមប្រព័ន្ធ",

    // Stock View / Registry View
    liveStockLevels: "កម្រិតស្តុកបច្ចុប្បន្ន",
    realTimeTerminal: "ទិន្នន័យស្តុកតាមដានផ្ទាល់ផ្ទុកក្នុងប្រព័ន្ធ",
    assetRegistry: "បញ្ជីគ្រប់គ្រងផលិតផល",
    masterInventory: "មូលដ្ឋានទិន្នន័យទំនិញមេ",
    searchStock: "ស្វែងរកស្តុកបច្ចុប្បន្ន...",
    searchRegistry: "ស្វែងរកផលិតផលក្នុងបញ្ជី...",
    adjustQuantity: "ផ្លាស់ប្តូរបរិមាណ",
    registerNewAsset: "ចុះឈ្មោះទំនិញថ្មី",
    kernelStatus: "ស្ថានភាពម៉ាស៊ីន: កំពុងដំណើរការធម្មតា",
    sessionId: "លេខសម្គាល់គណនី",
    minStockLevel: "កម្រិតស្តុកអប្បបរមា",

    // History / Logs
    auditLogs: "កំណត់ហេតុកត់ត្រាស្តុក",
    immutableHistory: "ប្រវត្តិប្រតិបត្តិការស្តុកទាំងអស់",
    all: "ទាំងអស់",
    intake: "បញ្ចូលស្តុក (+)",
    outtake: "ដកស្តុក (-)",
    clearFilters: "សម្អាតការស្វែងរក",
    exportPdf: "ទាញយកជា PDF",
    noMovementData: "រកមិនឃើញកំណត់ហេតុប្រតិបត្តិការក្នុងការស្វែងរកទេ",
    timestamp: "ថ្ងៃ-ម៉ោងប្រតិបត្តិការ",
    identity: "ឈ្មោះទំនិញ",
    action: "សកម្មភាព",
    prev: "ចំនួនមុន",
    delta: "ចំនួនប្តូរ",
    post: "ចំនួនក្រោយ",
    events: "ព្រឹត្តិការណ៍",
    report: "របាយការណ៍",

    // Form modal (ProductForm)
    editAsset: "កែសម្រួលព័ត៌មានទំនិញ",
    newAsset: "ចុះឈ្មោះផលិតផលថ្មី",
    assetName: "ឈ្មោះទំនិញ/ផលិតផល",
    barcode: "លេខកូដបារ/Barcode (បើមាន)",
    category: "ប្រភេទក្រុមទំនិញ",
    rawMaterials: "វត្ថុធាតុដើម",
    paintProducts: "ផលិតផលថ្នាំលាប",
    packaging: "គ្រឿងវេចខ្ចប់",
    general: "ទូទៅ",
    unitOfMeasurement: "ឯកតារង្វាស់",
    minStockWarning: "កម្រិតព្រមានស្តុកទាប",
    description: "ការពិពណ៌នា / កំណត់ត្រាបន្ថែម",
    detailsFinish: "ព័ត៌មានលម្អិតផលិតផលនិងប្រភេទ (សម្រាប់តែផ្នែកថ្នាំលាបសម្រេច)",
    bases: "ប្រភេទបាសដែលមាន (Bases)",
    sizes: "ទំហំដែលមាន (Sizes)",
    startingStockQty: "បរិមាណស្តុកដើមគ្រា",
    currentStock: "ស្តុកបច្ចុប្បន្ន",
    saveAsset: "រក្សាទុកព័ត៌មានលម្អិតផលិតផល",
    cancel: "បោះបង់",

    // Added Form translations
    inventoryManagement: "ប្រព័ន្ធគ្រប់គ្រងបញ្ជីសារពើភ័ណ្ឌ",
    departmentSection: "ផ្នែក / ក្រុមទំនិញ",
    activeSizes: "ទំហំដែលមានសកម្មភាព",
    activeBases: "ប្រភេទបាសដែលមានសកម្មភាព",
    baseType: "ប្រភេទបាស",
    variantHelp: "ជ្រើសរើសប្រភេទបាសនិងទំហំខាងលើដើម្បីបើកដំណើរការតាមដានតាមប្រភេទអថេរ។",
    productNamePlaceholder: "ឧទាហរណ៍៖ ថ្នាំលាបពណ៌ស៊ុបភើរ...",
    barcodePlaceholder: "លេខកូដសម្គាល់ផលិតផល...",
    descriptionPlaceholder: "ការពិពណ៌នាបន្ថែម (បើមាន)...",
    commitRecords: "រក្សាទុកទិន្នន័យ",

    // Toast messages
    itemUpdated: "បានធ្វើបច្ចុប្បន្នភាពទំនិញ",
    itemSaved: "បានរក្សាទុកទំនិញដោយជោគជ័យ",
    itemDeleted: "បានលុបទំនិញរួចរាល់",
    deleteConfirm: "តើអ្នកពិតជាចង់លុបផលិតផលនេះមែនទេ?",
    importComplete: "ការនាំចូលទំនិញត្រូវបានបញ្ចប់",
    clearConfirm: "ព្រមាន៖ តើអ្នកចង់សម្អាតផលិតផល និងកំណត់ហេតុទាំងអស់មែនទេ? សកម្មភាពនេះមិនអាចផ្លាស់ប្តូរវិញបានទេ!"
  }
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'km' || saved === 'en') ? saved : 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('app_language', newLang);
  };

  const t = (key: string): string => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
