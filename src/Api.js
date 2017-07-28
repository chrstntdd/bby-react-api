// @flow

import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';

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
    this.express.use(morgan('dev'));
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
  }

  /* connect resource routers */
  routes(): void {
    /* create an instance of the user router */
    const userRouter = new UserRouter();

    /* attack the user router to our express app */
    this.express.use(userRouter.path, userRouter.router);
  }
}
