import { Timestamp } from 'firebase/firestore';

export interface Product {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: 'bucket' | 'kg' | 'unit';
  category: string;
  section: 'Materials' | 'Finish';
  grade?: 'Base A' | 'Base B' | 'Base C' | 'Base D';
  finishStocks?: {
    [grade: string]: {
      [size: string]: number;
    }
  };
  availableSizes?: string[]; // e.g., ["18L", "5L"]
  availableBases?: string[]; // e.g., ["Base A", "Base B"]
  minStockLevel: number;
  barcode?: string;
  photoUrl?: string;
  ownerId: string;
  updatedAt: Timestamp;
}

export interface StockAdjustment {
  id?: string;
  productId: string;
  productName: string;
  amount: number;
  unit: 'bucket' | 'kg' | 'unit';
  section: 'Materials' | 'Finish';
  grade?: string;
  size?: string;
  type: 'INTAKE' | 'OUTTAKE';
  previousQuantity: number;
  newQuantity: number;
  ownerId: string;
  userEmail?: string;
  createdAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
