import Api from './Api';
require('dotenv').config();
const mongoose = require('mongoose');
/* Set mongoose promise to native ES6 promise */
mongoose.Promise = global.Promise;

/* Instantiate our app instance */
const app = new Api();

const connectOptions = {
  useMongoClient: true,
  keepAlive: true,
  reconnectTries: Number.MAX_VALUE
};

/* Get current environment */
export const ENV = app.currentEnv();

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

let server;

export const runServer = async (
  dbURL: string = DATABASE_URL,
  port: number = PORT
) => {
  try {
    await mongoose.connect(dbURL, connectOptions);
    await new Promise((resolve, reject) => {
      server = app.express
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

export const closeServer = async () => {
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
