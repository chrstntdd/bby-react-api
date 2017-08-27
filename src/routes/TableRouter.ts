import { Request, Response, Router, NextFunction } from 'express';
import Table from '../models/table';
import User = require('../models/user');
import * as mongoose from 'mongoose';

import { asyncMiddleware } from './UserRouter';

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
  public async getAll(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    const user = await User.findById(req.params.userId);
    res.status(200).json(user.tableData.tables);
  }
  /* Get a single table for a given user with a given tableId */
  public async getById(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    const user = await User.findById(req.params.userId);
    const requestedTable = user.tableData.tables.id(req.params.tableId);
    res.status(200).json(requestedTable);
  }
  /* Create a new table for a given user */
  public async createNew(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    const user = await User.findById(req.params.userId);

    const newTable = {
      _id: mongoose.Types.ObjectId(),
      createdOn: Date.now(),
      createdBy: req.params.userId
    };

    user.tableData.tables.push(newTable);
    await user.save();
    res.status(201).json(newTable);
  }

  /* handles updates to the table sent in by client. State is managed by redux, 
   * but is persisted on the server with a call to PUT every so often(2 minute 
   * or so) 
   */
  public async updateById(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    const currentTableState = req.body.products;
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.params.userId, 'tableData.tables._id': req.params.tableId },
      { $set: { 'tableData.tables.$.products': currentTableState } }
    );

    res.status(201).json({
      message: `Successfully updated the table with the id of ${req.params
        .tableId}`
    });
  }

  /* Delete a single table for a given user with a given tableId */
  public async deleteById(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> {
    const userToBeDeleted = await User.findById(req.params.userId);

    userToBeDeleted.tableData.tables.id(req.params.tableId).remove();
    await userToBeDeleted.save();

    res
      .status(202)
      .json(
        `Successfully remove the table with the id of ${req.params.tableId}`
      );
  }

  public init(): void {
    this.router.get('/:userId', requireAuth, this.getAll);
    this.router.get('/:userId/:tableId', requireAuth, this.getById);
    this.router.post('/:userId', requireAuth, this.createNew);
    this.router.put('/:userId/:tableId', requireAuth, this.updateById);
    this.router.delete('/:userId/:tableId', requireAuth, this.deleteById);
  }
}
