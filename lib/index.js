"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const Api_1 = require("./Api");
const mongoose = require('mongoose');
const DATABASE_URL = process.env.PRODUCTION_DB_URL;
const PORT = process.env.PRODUCTION_DB_PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const app = new Api_1.default();
mongoose.Promise = global.Promise;
let server;
exports.runServer = (databaseUrl = DATABASE_URL, port = PORT) => new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
        if (err)
            return reject(err);
        server = app.express
            .listen(port, () => {
            console.info(`Your server is listening on port ${port} with the db ${databaseUrl}🤔`);
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
//# sourceMappingURL=index.js.map