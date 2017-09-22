import Api from './Api';

require('dotenv').config();

const mongoose = require('mongoose');

/* Instantiate our app instance */
const app: Api = new Api();

/* Get current environment */
const env = app.currentEnv();

let DATABASE_URL;
let PORT;

/* set environment variables */
if (env === 'production') {
  DATABASE_URL = process.env.MONGODB_URI;
  PORT = process.env.PORT;
} else {
  DATABASE_URL = process.env.TEST_DATABASE_URL;
  PORT = 3000;
}

/* Set mongoose promise to native ES6 promise */
mongoose.Promise = global.Promise;

const connectOptions = {
  useMongoClient: true,
  keepAlive: true,
  reconnectTries: Number.MAX_VALUE
};

/* Both runServer and closeServer need access to the server var,
 * so it's declared outside of both function.
 */
let server;

export const runServer = async (
  databaseUrl: string = DATABASE_URL,
  port: number | string = PORT
) => {
  try {
    await mongoose.connect(databaseUrl, connectOptions);
    await new Promise((resolve, reject) => {
      server = app.express
        .listen(port, () => {
          console.info(
            `Your server is listening on port ${port} with the db ${databaseUrl} in a ${env} environment🤔`
          );
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
      server.close(err => {
        if (err) return reject(err);
        return resolve();
      });
    });
  } catch (err) {
    console.error('error');
  }
};

if (require.main === module) {
  runServer().catch(err => console.error(err));
}
