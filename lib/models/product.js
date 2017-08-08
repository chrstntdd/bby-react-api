"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
exports.ProductSchema = new mongoose_1.Schema({
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
exports.default = exports.ProductSchema;
