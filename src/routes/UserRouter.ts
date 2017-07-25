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
  GET one user by id
  */
  public getOne(req: Request, res: Response, next: NextFunction) {
    let query = req.params.id;
    let user = Users.find(hero => hero._id === query);
    if (user) {
      res.status(200).send({
        message: 'Success!',
        status: res.status,
        user
      });
    } else {
      res.status(404).send({
        message: 'No user found with the supplied id.',
        status: res.status
      });
    }
  }

  /* 
  * Take each handler, and attach to one of the Express Router's endpoints
  */
  init() {
    this.router.get('/', this.getAll);
    this.router.get('/:id', this.getOne);
  }
}

const userRoutes = new UserRouter();
userRoutes.init();

export default userRoutes.router;
