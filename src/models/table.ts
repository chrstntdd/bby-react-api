import * as mongoose from 'mongoose';
import Product = require('./product');
import { IProduct, ProductSchema } from './product';

export interface ITable {
  createdOn: Date;
  products: IProduct[];
}

interface ITableModel extends ITable, mongoose.Document {}

export const TableSchema = new mongoose.Schema({
  createdOn: {
    type: Date
  },
  products: [ProductSchema]
});

const Table = mongoose.model<ITableModel>('Table', TableSchema);

export default Table;
