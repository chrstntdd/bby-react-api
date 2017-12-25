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
const bodyParser = require("body-parser");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const passport = require("passport");
const compression = require("compression");
const mongoose = require("mongoose");
const celebrate_1 = require("celebrate");
const BestBuyRouter_1 = require("./routes/BestBuyRouter");
const UserRouter_1 = require("./routes/UserRouter");
require('dotenv').config();
const app = express();
exports.app = app;
mongoose.Promise = Promise;
const connectOptions = {
    useMongoClient: true,
    keepAlive: true,
    reconnectTries: Number.MAX_VALUE
};
exports.ENV = app.get('env');
let DATABASE_URL;
let PORT;
if (exports.ENV === 'production') {
    DATABASE_URL = process.env.MONGODB_URI;
    PORT = parseInt(process.env.PORT, 10);
}
else {
    DATABASE_URL = process.env.TEST_DATABASE_URL;
    PORT = 3000;
}
app.use((req, res, next) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
app.use(compression());
app.use(helmet());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
const userRouter = new UserRouter_1.default();
const bestBuyRouter = new BestBuyRouter_1.default();
app.use(userRouter.path, userRouter.router);
app.use(bestBuyRouter.path, bestBuyRouter.router);
app.use((err, req, res, next) => {
    if (celebrate_1.isCelebrate(err)) {
        return res.status(422).json({ message: err.details[0].message });
    }
    else {
        return res
            .status(err.output.statusCode || 500)
            .json(err.output.payload || 'INTERNAL SERVER ERROR');
    }
});
let server;
const runServer = (dbURL = DATABASE_URL, port = PORT) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield mongoose.connect(dbURL, connectOptions);
        yield new Promise((resolve, reject) => {
            server = app
                .listen(port, () => {
                console.info(`The ${exports.ENV} server is listening on port ${port} 🤔`);
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
exports.runServer = runServer;
const closeServer = () => __awaiter(this, void 0, void 0, function* () {
    try {
        yield mongoose.disconnect();
        yield new Promise((resolve, reject) => {
            console.info(`Closing server. Goodbye old friend.`);
            server.close(err => (err ? reject(err) : resolve()));
        });
    }
    catch (err) {
        console.error(err);
    }
});
exports.closeServer = closeServer;
require.main === module && runServer().catch(err => console.error(err));
