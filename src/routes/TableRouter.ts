import { Request, Response, Router, NextFunction } from 'express';
import Table from '../models/table';
import User = require('../models/user');

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

  public getAll(req: Request, res: Response, next?: NextFunction): void {
    User.findById(req.params.userId)
      .then(user => {
        res.status(200).json(user.tableData.tables);
      })
      .catch(err => {
        res.status(500).json({ message: 'Big man ting there was an error' });
      });
  }

  public getById(req: Request, res: Response, next?: NextFunction): void {
    User.findById(req.params.userId)
      .then(user => {
        const requestedTable = user.tableData.tables.filter(
          table => table._id === req.params.tableId
        );
        res.status(200).json(requestedTable);
      })
      .catch(err => {
        res.status(500).json({ message: 'There was an error my guy' });
      });
  }

  public createNew(req: Request, res: Response, next?: NextFunction): void {
    /* stubbed */
  }

  public updateById(req: Request, res: Response, next?: NextFunction): void {
    /* stubbed */
  }

  public deleteById(req: Request, res: Response, next?: NextFunction): void {
    /* stubbed */
  }

  public init(): void {
    this.router.get('/:userId', this.getAll);
    this.router.get('/:userId/:tableId', this.getById);
    this.router.post('/', this.createNew);
    this.router.put('/:id', this.updateById);
    this.router.delete('/:id', this.deleteById);
  }
}
