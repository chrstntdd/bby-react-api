require('dotenv').config();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const logger = require('morgan');
const validator = require('express-validator');
const helmet = require('helmet');
const router = require('./router');

const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const env = app.get('env');

// MIDDLEWARE STACK
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials'
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(validator());
app.use(logger('dev'));

mongoose.Promise = global.Promise;

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it on run
let server;

// TAKES A DATABASE URL AS AN ARGUMENT. NEEDED FOR INTEGRATION TESTS. DEFAULTS TO THE MAIN URL.
const runServer = (databaseUrl = DATABASE_URL, port = PORT) =>
  new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, { useMongoClient: true }, err => {
      if (err) {
        return reject(err);
      }
      server = app
        .listen(port, () => {
          console.info(
            `Your server is listening on port ${port} in a ${env} environment 🤔`
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
      console.info('Closing server. Goodbye old friend.');
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
  closeServer,
  app
};

router(app);
