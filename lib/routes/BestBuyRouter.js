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
const express_1 = require("express");
const celebrate_1 = require("celebrate");
const boom = require("boom");
const util_1 = require("../util");
const validationSchemas_1 = require("../config/validationSchemas");
require('dotenv').config();
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
            const { upc } = req.body;
            const search = bby.products(`upc=${upc}`);
            const productsApiResponse = yield search;
            if (productsApiResponse.total < 1) {
                throw boom.notFound('UPC not recognized. Please try your search again');
            }
            else if (!productsApiResponse) {
                throw boom.serverUnavailable('There was an error with the Best Buy API');
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
        });
    }
    init() {
        this.router.post('/upc', requireAuth, celebrate_1.celebrate(validationSchemas_1.getByUPC), util_1.asyncMiddleware(this.getByUPC));
    }
}
exports.default = BestBuyRouter;
