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
            const requestedTable = user.tableData.tables.id(req.params.tableId);
            res.status(200).json(requestedTable);
        })
            .catch(err => {
            res.status(500).json({ message: 'There was an error my guy' });
        });
    }
    createNew(req, res, next) {
        User.findById(req.params.userId)
            .then(user => {
            const newTable = {
                createdOn: Date.now(),
                createdBy: req.params.userId
            };
            user.tableData.tables.push(newTable);
            user.save();
            return newTable;
        })
            .then(returnedTable => {
            res.status(200).json(returnedTable);
        })
            .catch(err => {
            res.status(500).json({ message: 'EVERYTHING IS ON FIRE' });
        });
    }
    updateById(req, res, next) {
        User.findById(req.params.userId)
            .then(user => {
            const tableToUpdate = user.tableData.tables.id(req.params.tableId);
            const currentTableState = req.body.products;
            console.log(tableToUpdate.products);
            tableToUpdate.products.set(currentTableState);
            user.save();
        })
            .then(updatedTable => {
            console.log('successfully updated that table');
            res.status(201).json(updatedTable);
        })
            .catch(err => {
            res.status(500).json({
                err,
                message: 'I have no idea what the fuck is going on'
            });
        });
    }
    deleteById(req, res, next) {
    }
    init() {
        this.router.get('/:userId', this.getAll);
        this.router.get('/:userId/:tableId', this.getById);
        this.router.post('/:userId', this.createNew);
        this.router.put('/:userId/:tableId', this.updateById);
        this.router.delete('/:id', this.deleteById);
    }
}
exports.default = TableRouter;
