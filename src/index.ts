import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as expressValidator from 'express-validator';
import * as helmet from 'helmet';
import * as morgan from 'morgan';
import * as passport from 'passport';
import * as compression from 'compression';
import * as mongoose from 'mongoose';
import { isCelebrate, errors } from 'celebrate';

/* import all routers */
import BestBuyRouter from './routes/BestBuyRouter';
import UserRouter from './routes/UserRouter';

require('dotenv').config();
const app = express();

/* Set mongoose promise to native ES6 promise */
(<any>mongoose).Promise = Promise;

const connectOptions = {
  useMongoClient: true,
  keepAlive: true,
  reconnectTries: Number.MAX_VALUE
};

/* Get current environment */
export const ENV = app.get('env');

let DATABASE_URL;
let PORT;

/* set environment variables */
if (ENV === 'production') {
  DATABASE_URL = process.env.MONGODB_URI;
  PORT = parseInt(process.env.PORT, 10);
} else {
  DATABASE_URL = process.env.TEST_DATABASE_URL;
  PORT = 3000;
}

/* MIDDLEWARE */
app.use((req, res, next) => {
  /* Don't allow caching. Needed for IE support :/ */
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials'
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
app.use(compression());
app.use(helmet());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

/* create an instance of the each of our routers */
const userRouter = new UserRouter();
const bestBuyRouter = new BestBuyRouter();

/* attach all routers to our express app */
app.use(userRouter.path, userRouter.router);
app.use(bestBuyRouter.path, bestBuyRouter.router);

/* Catch all error handling */
app.use((err, req, res, next) => {
  if (isCelebrate(err)) {
    /* return validation message */
    return res.status(422).json({ message: err.details[0].message });
  } else {
    /* return boom error with payload message */
    return res
      .status(err.output.statusCode || 500)
      .json(err.output.payload || 'INTERNAL SERVER ERROR');
  }
});

let server;

const runServer = async (dbURL: string = DATABASE_URL, port: number = PORT) => {
  try {
    await mongoose.connect(dbURL, connectOptions);
    await new Promise((resolve, reject) => {
      server = app
        .listen(port, () => {
          console.info(`The ${ENV} server is listening on port ${port} 🤔`);
          resolve();
        })
        .on('error', err => {
          mongoose.disconnect();
          reject(err);
        });
    });
  } catch (err) {
    console.error(err);
  }
};

const closeServer = async () => {
  try {
    await mongoose.disconnect();
    await new Promise((resolve, reject) => {
      console.info(`Closing server. Goodbye old friend.`);
      server.close(err => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    console.error(err);
  }
};

require.main === module && runServer().catch(err => console.error(err));

export { runServer, closeServer, app };
