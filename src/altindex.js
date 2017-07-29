// @flow

'use strict';

require('dotenv').config();

import Api from './Api';
const mongoose = require('mongoose');

const DATABASE_URL = process.env.DATABASE_URL || global.DATABASE_URL;
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

const app: Api = new Api();

mongoose.Promise = global.Promise;

let server;

// TAKES A DATABASE URL AS AN ARGUMENT. NEEDED FOR INTEGRATION TESTS. DEFAULTS TO THE MAIN URL.
const runServer = (databaseUrl = DATABASE_URL, port = PORT) =>
  new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, { useMongoClient: true }, err => {
      if (err) {
        return reject(err);
      }
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

const closeServer = () =>
  mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.info(`Closing server. Goodbye old friend.`);
      server.close(err => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  });

if (require.main === module) {
  runServer().catch(err => console.error(err));
}

module.exports = {
  runServer,
  closeServer
};
