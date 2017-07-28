// @flow

import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import validator from 'express-validator';
import helmet from 'helmet';

import type { $Request, $Response, $NextFunction, $Application } from 'express';

/* import all routers */
import UserRouter from './routes/UserRouter';

export default class Api {
  /* annotate with the express $Application type */
  express: express$Application;

  /* create the express instance and attach app level middleware and routes */
  constructor() {
    this.express = express();
    this.middleware();
    this.routes();
  }

  /* apply middleware */
  middleware(): void {
    this.express.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header(
        'Access-Control-Allow-Methods',
        'PUT, GET, POST, DELETE, OPTIONS'
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials'
      );
      res.header('Access-Control-Allow-Credentials', 'true');
      next();
    });
    this.express.use(helmet());
    this.express.use(morgan('dev'));
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
    this.express.use(validator());
  }

  /* connect resource routers */
  routes(): void {
    /* create an instance of the user router */
    const userRouter = new UserRouter();

    /* attach the user router to our express app */
    this.express.use(userRouter.path, userRouter.router);
  }
}
