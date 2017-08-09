import { Request, Response, Router, NextFunction } from 'express';
import Table from '../models/table';
import User = require('../models/user');
import * as mongoose from 'mongoose';

/* Passport middleware */
const passport = require('passport');
const passportService = require('../config/passport');

const requireAuth = passport.authenticate('jwt', { session: false });

export default class TableRouter {
  public router: Router;
  public path: any;

  constructor(path = '/api/v1/tables') {
    this.router = Router();
    this.path = path;
    this.init();
  }

  /* Get all tables for a given user */
  public getAll(req: Request, res: Response, next?: NextFunction): void {
    User.findById(req.params.userId)
      .then(user => {
        res.status(200).json(user.tableData.tables);
      })
      .catch(err => {
        res.status(500).json({ message: 'Big man ting there was an error' });
      });
  }
  /* Get a single table for a given user with a given tableId */
  public getById(req: Request, res: Response, next?: NextFunction): void {
    User.findById(req.params.userId)
      .then(user => {
        const requestedTable = user.tableData.tables.id(req.params.tableId);
        res.status(200).json(requestedTable);
      })
      .catch(err => {
        res.status(500).json({ message: 'There was an error my guy' });
      });
  }
  /* Create a new table for a given user */
  public createNew(req: Request, res: Response, next?: NextFunction): void {
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

  /* handles updates to the table sent in by client. State is managed by redux, 
   * but is persisted on the server with a call to PUT every so often(1 minute 
   * or so) 
   */
  public updateById(req: Request, res: Response, next?: NextFunction): void {
    const currentTableState = req.body.products;
    User.findOneAndUpdate(
      { _id: req.params.userId, 'tableData.tables._id': req.params.tableId },
      { $set: { 'tableData.tables.$.products': currentTableState } }
    )
      .then(updatedUser => {
        res
          .status(201)
          .json(
            `Successfully updated the table with the id of ${req.params
              .tableId}`
          );
      })
      .catch(err => {
        res.status(500).json({
          err,
          message: 'I have no idea what the fuck is going on'
        });
      });
  }

  /* Delete a single table for a given user with a given tableId */
  public deleteById(req: Request, res: Response, next?: NextFunction): void {
    User.findById(req.params.userId)
      .then(user => {
        user.tableData.tables.id(req.params.tableId).remove();
        user.save();
      })
      .then(response => {
        res
          .status(202)
          .json(
            `Successfully remove the table with the id of ${req.params.tableId}`
          );
      })
      .catch(err => {
        res.status(500).json('EVERYTHING IS BURING');
      });
  }

  public init(): void {
    this.router.get('/:userId', this.getAll);
    this.router.post('/:userId', this.createNew);
    this.router.get('/:userId/:tableId', this.getById);
    this.router.put('/:userId/:tableId', this.updateById);
    this.router.delete('/:userId/:tableId', this.deleteById);
  }
}
