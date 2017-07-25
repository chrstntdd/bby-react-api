import { Router, Request, Response, NextFunction } from 'express';
const Users = require('../../testdata.json');

export class UserRouter {
  router: Router;
  /*
  * Initialize the UserRouter
  */
  constructor() {
    this.router = Router();
    this.init();
  }

  /* 
  *GET all Users
  */
  public getAll(req: Request, res: Response, next: NextFunction) {
    res.send(Users);
  }

  /* 
  * Take each handler, and attach to one of the Express Router's endpoints
  */
  init() {
    this.router.get('/', this.getAll);
  }
}

const userRoutes = new UserRouter();
userRoutes.init();

export default userRoutes.router;
