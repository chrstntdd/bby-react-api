"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bby = require('bestbuy')(process.env.BBY_API_KEY);
const passport = require('passport');
const passportService = require('../config/passport');
const requireAuth = passport.authenticate('jwt', { session: false });
class BestBuyRouter {
    constructor(path = '/api/v1/best-buy') {
        this.router = express_1.Router();
        this.path = path;
        this.init();
    }
    getByUPC(req, res) {
        req.checkBody('upc', 'UPC must not be empty').notEmpty();
        req
            .checkBody('upc', "Looks like you didn't scan the right bar code. Please make sure you scan the UPC label")
            .isNumeric()
            .isInt({ allow_leading_zeroes: true })
            .isLength({ min: 12, max: 12 });
        req.sanitizeBody('upc').trim();
        req.sanitizeBody('upc').escape();
        const upc = req.body.upc;
        const errors = { status: 406, messages: [] };
        req.getValidationResult().then(result => {
            if (!result.isEmpty()) {
                errors.messages = result.array();
            }
        });
        const search = bby.products(`upc=${upc}`);
        search.then(data => {
            if (errors.messages.length > 0) {
                res.status(errors.status).json({
                    messages: errors.messages
                });
            }
            else if (!data.total) {
                res.status(400).json({
                    message: 'UPC not recognized. Please try your search again'
                });
            }
            else {
                const product = data.products[0];
                const productDetails = {
                    name: product.name,
                    sku: product.sku,
                    upc: product.upc,
                    department: product.department,
                    departmentId: product.departmentId,
                    modelNumber: product.modelNumber,
                    classId: product.classId,
                    value: product.salePrice,
                    totalValue: product.salePrice,
                    quantity: 1
                };
                res.status(200).json(productDetails);
            }
        });
    }
    init() {
        this.router.post('/upc', this.getByUPC, requireAuth);
    }
}
exports.default = BestBuyRouter;
