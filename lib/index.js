"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
require('dotenv').load();
const Api_1 = require("./Api");
const mongoose = require('mongoose');
const app = new Api_1.default();
const env = app.currentEnv();
let DATABASE_URL;
env === 'development'
    ? (DATABASE_URL = process.env.DATABASE_URL)
    : (DATABASE_URL = process.env.MONGODB_URI);
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
mongoose.Promise = global.Promise;
let server;
exports.runServer = (databaseUrl = DATABASE_URL, port = PORT) => new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, { useMongoClient: true }, err => {
        if (err)
            return reject(err);
        server = app.express
            .listen(port, () => {
            console.info(`Your server is listening on port ${port} with the db ${databaseUrl} in a ${env} environment🤔`);
            resolve();
        })
            .on('error', err => {
            mongoose.disconnect();
            reject(err);
        });
    });
});
exports.closeServer = () => mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
        console.info(`Closing server. Goodbye old friend.`);
        server.close(err => {
            if (err)
                return reject(err);
            return resolve();
        });
    });
});
if (require.main === module) {
    exports.runServer().catch(err => console.error(err));
}
