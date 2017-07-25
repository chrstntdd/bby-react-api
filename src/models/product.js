const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
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

module.exports = {
  productSchema
};
