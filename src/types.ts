import { Timestamp } from 'firebase/firestore';

export interface Product {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: 'bucket' | 'kg' | 'unit';
  category: string;
  section: 'Materials' | 'Finish';
  minStockLevel: number;
  barcode?: string;
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
  type: 'INTAKE' | 'OUTTAKE';
  previousQuantity: number;
  newQuantity: number;
  ownerId: string;
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
