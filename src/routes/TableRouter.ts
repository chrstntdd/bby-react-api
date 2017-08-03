import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import Table = require('../models/table');
import User = require('../models/user');

/* Passport middleware */
const passport = require('passport');
const passportService = require('../config/passport');

const requireAuth = passport.authenticate('jwt', { session: false });

export default class TableRouter {
  router: Router;
  path: any;

  constructor(path = '/api/v1/tables') {
    this.router = Router();
    this.path = path;
    this.init();
  }

  getAll(req: Request, res: Response, next: NextFunction): void {
    const userId = req.body.userId;
  }

  getById(req: Request, res: Response, next: NextFunction): void {
    /* stubbed */
  }

  createNew(req: Request, res: Response, next: NextFunction): void {
    /* stubbed */
  }

  updateById(req: Request, res: Response, next: NextFunction): void {
    /* stubbed */
  }

  deleteById(req: Request, res: Response, next: NextFunction): void {
    /* stubbed */
  }

  init(): void {
    this.router.get('/', this.getAll);
    this.router.get('/id', this.getById);
    this.router.post('/', this.createNew);
    this.router.put('/:id', this.updateById);
    this.router.delete('/:id', this.deleteById);
  }
}
