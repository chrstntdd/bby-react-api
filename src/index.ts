require('dotenv').config();
require('dotenv').load();

import Api from './Api';
const mongoose = require('mongoose');

/* Instantiate our app instance */
const app: Api = new Api();

/* Get current environment */
const env = app.currentEnv();

let DATABASE_URL;
let PORT;

env === 'development' || 'test'
  ? (DATABASE_URL = process.env.TEST_DATABASE_URL)
  : (DATABASE_URL = process.env.MONGODB_URI);

env === 'development' || 'test' ? (PORT = 3000) : (PORT = process.env.PORT);

const JWT_SECRET = process.env.JWT_SECRET;

/* Set mongoose promise to native ES6 promise */
mongoose.Promise = global.Promise;

/* Both runServer and closeServer need access to the server var,
 * so it's declared outside of both function.
 */
let server;

// TAKES A DATABASE URL AS AN ARGUMENT. NEEDED FOR INTEGRATION TESTS. DEFAULTS TO THE MAIN URL.
export const runServer = (
  databaseUrl: string = DATABASE_URL,
  port: number | string = PORT
) =>
  new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, { useMongoClient: true }, err => {
      if (err) return reject(err);

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
  });

export const closeServer = () =>
  mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.info(`Closing server. Goodbye old friend.`);
      server.close(err => {
        if (err) return reject(err);
        return resolve();
      });
    });
  });

if (require.main === module) {
  runServer().catch(err => console.error(err));
}
