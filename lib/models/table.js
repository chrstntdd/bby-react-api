"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const product_1 = require("./product");
exports.TableSchema = new mongoose.Schema({
    createdBy: {
        type: String
    },
    createdOn: {
        type: Date
    },
    products: [product_1.ProductSchema]
});
const Table = mongoose.model('Table', exports.TableSchema);
exports.default = Table;
