"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
require('dotenv').load();
const Api_1 = require("./Api");
const mongoose = require("mongoose");
const app = new Api_1.default();
const env = app.currentEnv();
let DATABASE_URL;
let PORT;
if (env === 'production') {
    DATABASE_URL = process.env.MONGODB_URI;
    PORT = process.env.PORT;
}
else {
    DATABASE_URL = process.env.TEST_DATABASE_URL;
    PORT = 3000;
}
mongoose.Promise = global.Promise;
const connectOptions = {
    useMongoClient: true,
    keepAlive: true,
    reconnectTries: Number.MAX_VALUE
};
let server;
exports.runServer = (databaseUrl = DATABASE_URL, port = PORT) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield mongoose.connect(databaseUrl, connectOptions);
        yield new Promise((resolve, reject) => {
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
    }
    catch (err) {
        console.error(err);
    }
});
exports.closeServer = () => __awaiter(this, void 0, void 0, function* () {
    try {
        yield mongoose.disconnect();
        yield new Promise((resolve, reject) => {
            console.info(`Closing server. Goodbye old friend.`);
            server.close(err => {
                if (err)
                    return reject(err);
                return resolve();
            });
        });
    }
    catch (err) {
        console.error('error');
    }
});
if (require.main === module) {
    exports.runServer().catch(err => console.error(err));
}
