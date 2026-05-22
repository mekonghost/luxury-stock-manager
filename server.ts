import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import multer from 'multer';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';
import fs from 'fs';
import { initializeApp as initAdmin, getApps as getAdminApps, getApp as getAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

dotenv.config();

import { initializeApp as initClientApp } from 'firebase/app';
import { getAuth as getClientAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore as initClientFirestore, collection as getClientCollection, getDocs as getClientDocs } from 'firebase/firestore';

let clientDb: any = null;
let clientAuth: any = null;

async function getAuthenticatedClientDb(): Promise<any> {
  if (!clientDb) {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Create an isolated subapp instance for the server connection
    const clientApp = initClientApp(fbConfig, 'server-client-twin-app');
    clientDb = initClientFirestore(clientApp, {}, fbConfig.firestoreDatabaseId);
    clientAuth = getClientAuth(clientApp);
  }

  // Session check & login
  if (!clientAuth.currentUser) {
    await signInWithEmailAndPassword(clientAuth, 'chhayheng@luxury-paint.com', 'Heng@1188');
  }
  
  return clientDb;
}

async function fetchProductsUsingClientSdk(): Promise<any[]> {
  const db = await getAuthenticatedClientDb();
  const querySnapshot = await getClientDocs(getClientCollection(db, 'products'));
  const products: any[] = [];
  querySnapshot.forEach((doc) => {
    products.push({
      id: doc.id,
      ...doc.data()
    });
  });
  return products;
}


async function startServer() {
  const app = express();
  const PORT = 3000;

  const adminApp = getAdminApps().length === 0 
    ? initAdmin({ projectId: 'gen-lang-client-0253215829' })
    : getAdminApp();

  const adminDb = getAdminFirestore(adminApp, 'ai-studio-a65f6775-0d0a-459f-87b5-f45c268cba45');

  const storage = multer.memoryStorage();
  const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.use(express.json({ limit: '10mb' }));

  // API endpoint for file parsing
  app.post('/api/parse-stock-file', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileBuffer = req.file.buffer;
      const fileName = req.file.originalname;
      const fileExt = path.extname(fileName).toLowerCase();

      let extractedItems: any[] = [];

      if (fileExt === '.xlsx' || fileExt === '.xls' || fileExt === '.csv') {
        const workbook = XLSX.read(fileBuffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        try {
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Parse this JSON data from an Excel/CSV file and extract a list of products for an inventory system.
            Return a JSON array of objects with these fields:
            - name: (string)
            - category: (string, default to "General" if not found)
            - section: (string, either "Materials" or "Finish", default to "Materials")
            - unit: (string, either "kg" or "unit", default to "unit")
            - quantity: (number, default to 0)
            - minStockLevel: (number, default to 5)

            Input Data: ${JSON.stringify(jsonData.slice(0, 100))}`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    section: { type: Type.STRING, enum: ["Materials", "Finish"] },
                    unit: { type: Type.STRING, enum: ["kg", "unit", "bucket"] },
                    quantity: { type: Type.NUMBER },
                    minStockLevel: { type: Type.NUMBER },
                  },
                  required: ["name", "category", "section", "unit"]
                }
              }
            }
          });

          extractedItems = JSON.parse(response.text || '[]');
        } catch (aiError: any) {
          console.error('AI Excel Parsing Error:', aiError);
          return res.status(500).json({ 
            error: 'AI service denied access. Please check if Gemini API is enabled in your project.',
            details: aiError.message 
          });
        }
      } else if (fileExt === '.pdf') {
        const base64Data = fileBuffer.toString('base64');
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data
                }
              },
              {
                text: `Extract all inventory items from this PDF document. 
                Return a JSON array of objects with these fields:
                - name: (string)
                - category: (string)
                - section: (string, exclusively "Materials" or "Finish")
                - unit: (string, strictly "kg" or "unit" or "bucket")
                - quantity: (number)
                - minStockLevel: (number, default to 5)`
              }
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    section: { type: Type.STRING, enum: ["Materials", "Finish"] },
                    unit: { type: Type.STRING, enum: ["kg", "unit", "bucket"] },
                    quantity: { type: Type.NUMBER },
                    minStockLevel: { type: Type.NUMBER },
                  },
                  required: ["name", "category", "section", "unit"]
                }
              }
            }
          });

          extractedItems = JSON.parse(response.text || '[]');
        } catch (aiError: any) {
          console.error('AI PDF Parsing Error:', aiError);
          return res.status(500).json({ 
            error: 'AI service denied access. Please check if Gemini API is enabled in your project.',
            details: aiError.message 
          });
        }
      } else {
        return res.status(400).json({ error: 'Unsupported file type. Please upload PDF or Excel.' });
      }

      res.json({ items: extractedItems });
    } catch (error: any) {
      console.error('Parsing error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/external/products - endpoint for order website to see product and stocks
  app.options('/api/external/products', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.status(200).end();
  });

  app.get('/api/external/products', async (req, res) => {
    // Enable CORS for external website integrations
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    try {
      const configuredApiKey = process.env.LUXURY_PAINT_API_KEY || 'luxury-paint-stock-sharing-key-2026-xyz';
      
      // Look for the API key in query parameters, bearer token, or custom header
      let providedKey = req.query.apiKey || req.query.api_key;
      if (!providedKey) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
          providedKey = authHeader.substring(7);
        } else {
          providedKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
        }
      }

      if (!providedKey || providedKey !== configuredApiKey) {
        return res.status(401).json({ 
          success: false,
          error: 'Unauthorized', 
          message: 'Invalid or missing API key. Please retrieve your correct key from your account chhayheng@luxury-paint.com' 
        });
      }

      // Query database for all products
      const rawProducts = await fetchProductsUsingClientSdk();
      const products = rawProducts.map(data => {
        let updatedAtISO = null;
        if (data.updatedAt) {
          if (typeof data.updatedAt === 'string') {
            updatedAtISO = data.updatedAt;
          } else if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
            updatedAtISO = data.updatedAt.toDate().toISOString();
          } else if (data.updatedAt && data.updatedAt._seconds) {
            updatedAtISO = new Date(data.updatedAt._seconds * 1000).toISOString();
          }
        }

        return {
          id: data.id,
          name: data.name || '',
          description: data.description || '',
          quantity: data.quantity !== undefined ? data.quantity : 0,
          unit: data.unit || 'unit',
          category: data.category || 'General',
          section: data.section || 'Materials',
          grade: data.grade || null,
          availableSizes: data.availableSizes || [],
          availableBases: data.availableBases || [],
          finishStocks: data.finishStocks || {},
          minStockLevel: data.minStockLevel || 0,
          barcode: data.barcode || '',
          photoUrl: data.photoUrl || '',
          updatedAt: updatedAtISO
        };
      });

      // Filter strictly by "Finish" section (Materials are NOT allowed on this API)
      let filteredProducts = products.filter(p => p.section && p.section.toLowerCase() === 'finish');
      
      // Filter by category if specified
      if (req.query.category) {
        const cat = String(req.query.category).toLowerCase();
        filteredProducts = filteredProducts.filter(p => p.category && p.category.toLowerCase() === cat);
      }

      res.json({
        success: true,
        count: filteredProducts.length,
        products: filteredProducts
      });
    } catch (err: any) {
      console.error('Error in external products API:', err);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
