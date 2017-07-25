import * as path from 'path';
import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';

// CREATE AND CONFIG EXPRESS WEBSERVER
class App {
  // REFERENCE TO THE EXPRESS INSTANCE
  public express: express.Application;

  // CONFIGURATION METHODS TO RUN ON THE EXPRESS INSTANCE
  constructor() {
    this.express = express();
    this.middleware();
    this.routes();
  }

  // APPLY & CONFIG EXPRESS MIDDLEWARE
  private middleware(): void {
    this.express.use(logger('dev'));
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
  }

  // CONFIG API ENDPOINTS
  private routes(): void {
    /* just stubbing out a test route */
    let router = express.Router();
    /* placeholder */
    router.get('/', (req, res, next) => {
      res.json({
        message: 'Hello World!'
      });
    });
    this.express.use('/', router);
  }
}

export default new App().express;
