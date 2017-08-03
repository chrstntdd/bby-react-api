import { Schema } from 'mongoose';

export interface IProduct {
  name: string;
  sku: number;
  department: string;
  departmentId: string;
  modelNumber: string;
  classId: number;
  value: number;
  quantity: number;
  totalValue: number;
}

export const ProductSchema = new Schema({
  name: {
    type: String
  },
  sku: {
    type: Number
  },
  department: {
    type: String
  },
  departmentId: {
    type: Number
  },
  modelNumber: {
    type: String
  },
  classId: {
    type: Number
  },
  value: {
    type: Number
  },
  quantity: {
    type: Number
  },
  totalValue: {
    type: Number
  }
});

export default ProductSchema;
