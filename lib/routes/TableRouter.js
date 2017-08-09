"use strict";
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
                _id: mongoose.Types.ObjectId(),
                createdOn: Date.now(),
                createdBy: req.params.userId
            };
            user.tableData.tables.push(newTable);
            user.save();
            return newTable;
        })
            .then(newTable => {
            res.status(200).json(newTable);
        })
            .catch(err => {
            res.status(500).json({ message: 'EVERYTHING IS ON FIRE' });
        });
    }
    updateById(req, res, next) {
        const currentTableState = req.body;
        User.findOneAndUpdate({ _id: req.params.userId, 'tableData.tables._id': req.params.tableId }, { $set: { 'tableData.tables.$.products': currentTableState } })
            .then(updatedUser => {
            res
                .status(201)
                .json(`Successfully updated the table with the id of ${req.params
                .tableId}`);
        })
            .catch(err => {
            res.status(500).json({
                err,
                message: 'I have no idea what the fuck is going on'
            });
        });
    }
    deleteById(req, res, next) {
        User.findById(req.params.userId)
            .then(user => {
            user.tableData.tables.id(req.params.tableId).remove();
            user.save();
        })
            .then(response => {
            res
                .status(202)
                .json(`Successfully remove the table with the id of ${req.params.tableId}`);
        })
            .catch(err => {
            res.status(500).json('EVERYTHING IS BURING');
        });
    }
    init() {
        this.router.get('/:userId', this.getAll);
        this.router.post('/:userId', this.createNew);
        this.router.get('/:userId/:tableId', this.getById);
        this.router.put('/:userId/:tableId', this.updateById);
        this.router.delete('/:userId/:tableId', this.deleteById);
    }
}
exports.default = TableRouter;
