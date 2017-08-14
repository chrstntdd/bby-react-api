import * as mongoose from 'mongoose';
import Product = require('./product');
import { IProduct, ProductSchema } from './product';

export interface ITable {
  id: string;
  createdBy: string;
  createdOn: Date;
  products: IProduct[];
}

// interface ITableModel extends ITable, mongoose.Document {}

export const TableSchema: mongoose.Schema = new mongoose.Schema(
  {
    createdBy: {
      type: String
    },
    createdOn: {
      type: Date
    },
    products: [ProductSchema]
  },
  {
    capped: {
      size: 1024,
      max: 5,
      autoIndexId: true
    }
  } as any
);

const Table = mongoose.model('Table', TableSchema);

export default Table;
