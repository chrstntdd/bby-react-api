import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as expressValidator from 'express-validator';
import * as helmet from 'helmet';
import * as morgan from 'morgan';
import * as passport from 'passport';
import * as compression from 'compression';

/* import all routers */
import BestBuyRouter from './routes/BestBuyRouter';
import UserRouter from './routes/UserRouter';

export default class Api {
  /* reference to the express instance */
  public express: express.Application;

  /* create the express instance and attach app level middleware and routes */
  constructor() {
    this.express = express();
    this.middleware();
    this.routes();
  }

  /* get current environment */
  public currentEnv(): string {
    return this.express.get('env');
  }

  /* apply middleware */
  private middleware(): void {
    this.express.use((req, res, next) => {
      /* Don't allow caching. Needed for IE support :/ */
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.header('Pragma', 'no-cache');
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
    this.express.use(compression());
    this.express.use(helmet());
    this.express.use(morgan('dev'));
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
    this.express.use(passport.initialize());
    this.express.use(expressValidator());
    this.express.use((err, req, res, next) => {
      console.error(err);
      res.status(err.status || 500).json({
        message: err.message,
        error: err
      });
    });
  }

  /* connect resource routers */
  private routes(): void {
    /* create an instance of the each of our routers */
    const userRouter = new UserRouter();
    const bestBuyRouter = new BestBuyRouter();

    /* attach all routers to our express app */
    this.express.use(userRouter.path, userRouter.router);
    this.express.use(bestBuyRouter.path, bestBuyRouter.router);
  }
}
