"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User = require("../models/user");
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
        User.findById(req.params.userId)
            .then(user => {
            res.status(200).json(user.tableData.tables);
        })
            .catch(err => {
            res.status(500).json({ message: 'Big man ting there was an error' });
        });
    }
    getById(req, res, next) {
        User.findById(req.params.userId)
            .then(user => {
            const requestedTable = user.tableData.tables.filter(table => table._id === req.params.tableId);
            res.status(200).json(requestedTable);
        })
            .catch(err => {
            res.status(500).json({ message: 'There was an error my guy' });
        });
    }
    createNew(req, res, next) {
    }
    updateById(req, res, next) {
    }
    deleteById(req, res, next) {
    }
    init() {
        this.router.get('/:userId', this.getAll);
        this.router.get('/:userId/:tableId', this.getById);
        this.router.post('/', this.createNew);
        this.router.put('/:id', this.updateById);
        this.router.delete('/:id', this.deleteById);
    }
}
exports.default = TableRouter;
//# sourceMappingURL=TableRouter.js.map