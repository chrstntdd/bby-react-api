// @flow

import { Router } from 'express';
const { User } = require('../models/user');

export default class UserRouter {
  router: Router;
  path: String;

  constructor(path = '/api/v1/users') {
    this.router = Router();
    this.path = path;
    this.init();
  }

  /* 
  * Controllers for users
  * CRUD thru n thru
  */

  /* return all users */
  getAll(req: $Request, res: $Response): void {
    User.find()
      .then(res => {
        const users = res;
        return users;
      })
      .then(users => res.status(200).json(users))
      .catch(err => {
        res.status(500).json({
          status: res.status,
          message: 'Everything blew up'
        });
      });
  }
  /* get single user by id */
  getById(req: $Request, res: $Response): void {
    User.findById(req.params.id)
      .then(res => {
        const user = res;

        return user;
      })
      .then(user => res.status(200).json(user))
      .catch(err => {
        res.status(400).json({
          status: res.status,
          message: `No user found with the id: ${req.params.id}`
        });
      });
  }

  /* attach route handlers to their endpoints */
  init(): void {
    this.router.get('/', this.getAll);
    this.router.get('/:id', this.getById);
  }
}
