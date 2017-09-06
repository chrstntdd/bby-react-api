"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const express_1 = require("express");
const UserRouter_1 = require("./UserRouter");
const bby = require('bestbuy')(process.env.BBY_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET;
const passport = require('passport');
const passportService = require('../config/passport');
const requireAuth = passport.authenticate('jwt', { session: false });
class BestBuyRouter {
    constructor(path = '/api/v1/best-buy') {
        this.router = express_1.Router();
        this.path = path;
        this.init();
    }
    getByUPC(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            req.checkBody('upc', 'UPC must not be empty').notEmpty();
            req
                .checkBody('upc', "Looks like you didn't scan the right bar code. Please make sure you scan the UPC label")
                .isNumeric()
                .isInt({ allow_leading_zeroes: true })
                .isLength({ min: 12, max: 12 });
            req.sanitizeBody('upc').trim();
            req.sanitizeBody('upc').escape();
            const upc = req.body.upc;
            const validationResult = yield req.getValidationResult();
            if (!validationResult.isEmpty()) {
                const validationErrors = [];
                validationResult.array().forEach(error => validationErrors.push(error));
                return res.status(400).json({ validationErrors });
            }
            else {
                const search = bby.products(`upc=${upc}`);
                let productsApiResponse;
                productsApiResponse = yield search;
                if (productsApiResponse.total < 1) {
                    res.status(404).json({
                        message: 'UPC not recognized. Please try your search again'
                    });
                }
                else if (!productsApiResponse) {
                    res.status(500).json({ error: 'There was an error' });
                }
                else {
                    const product = productsApiResponse.products[0];
                    const { name, sku, upc, department, departmentId, modelNumber, classId, salePrice } = product;
                    res.status(200).json({
                        name,
                        sku,
                        upc,
                        department,
                        departmentId,
                        modelNumber,
                        classId,
                        value: salePrice,
                        totalValue: salePrice,
                        quantity: 1
                    });
                }
            }
        });
    }
    init() {
        this.router.post('/upc', requireAuth, UserRouter_1.asyncMiddleware(this.getByUPC));
    }
}
exports.default = BestBuyRouter;
