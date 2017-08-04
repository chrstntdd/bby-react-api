require('dotenv').config();

import Api from './Api';
const mongoose = require('mongoose');

const DATABASE_URL = process.env.PRODUCTION_DB_URL;
const PORT = process.env.PRODUCTION_DB_PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

/* instantiate nre app instance */
const app: Api = new Api();

mongoose.Promise = global.Promise;

let server;

// TAKES A DATABASE URL AS AN ARGUMENT. NEEDED FOR INTEGRATION TESTS. DEFAULTS TO THE MAIN URL.
export const runServer = (
  databaseUrl: string = DATABASE_URL,
  port: number | string = PORT
) =>
  new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) return reject(err);

      server = app.express
        .listen(port, () => {
          console.info(
            `Your server is listening on port ${port} with the db ${databaseUrl}🤔`
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
