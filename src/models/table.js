const mongoose = require('mongoose');
const { productSchema } = require('./product');
const Schema = mongoose.Schema;

const tableSchema = mongoose.Schema({
  createdOn: {
    type: Date
  },
  products: [productSchema]
});

module.exports = { tableSchema };
