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
const User = require("../models/user");
const mongoose = require("mongoose");
const passport = require('passport');
const passportService = require('../config/passport');
const requireAuth = passport.authenticate('jwt', { session: false });
class TableRouter {
    constructor(path = '/api/v1/tables') {
        this.router = express_1.Router();
        this.path = path;
        this.init();
    }
    getAll(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User.findById(req.params.userId);
            res.status(200).json(user.tableData.tables);
        });
    }
    getById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User.findById(req.params.userId);
            const requestedTable = user.tableData.tables.id(req.params.tableId);
            res.status(200).json(requestedTable);
        });
    }
    createNew(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User.findById(req.params.userId);
            const newTable = {
                _id: mongoose.Types.ObjectId(),
                createdOn: Date.now(),
                createdBy: req.params.userId
            };
            user.tableData.tables.push(newTable);
            yield user.save();
            res.status(201).json(newTable);
        });
    }
    updateById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentTableState = req.body.products;
            const updatedUser = yield User.findOneAndUpdate({ _id: req.params.userId, 'tableData.tables._id': req.params.tableId }, { $set: { 'tableData.tables.$.products': currentTableState } });
            res.status(201).json({
                message: `Successfully updated the table with the id of ${req.params
                    .tableId}`
            });
        });
    }
    deleteById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userToBeDeleted = yield User.findById(req.params.userId);
            userToBeDeleted.tableData.tables.id(req.params.tableId).remove();
            yield userToBeDeleted.save();
            res
                .status(202)
                .json(`Successfully remove the table with the id of ${req.params.tableId}`);
        });
    }
    init() {
        this.router.get('/:userId', requireAuth, this.getAll);
        this.router.get('/:userId/:tableId', requireAuth, this.getById);
        this.router.post('/:userId', requireAuth, this.createNew);
        this.router.put('/:userId/:tableId', requireAuth, this.updateById);
        this.router.delete('/:userId/:tableId', requireAuth, this.deleteById);
    }
}
exports.default = TableRouter;
