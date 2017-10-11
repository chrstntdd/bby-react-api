"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const express = require("express");
const expressValidator = require("express-validator");
const helmet = require("helmet");
const morgan = require("morgan");
const passport = require("passport");
const compression = require("compression");
const BestBuyRouter_1 = require("./routes/BestBuyRouter");
const UserRouter_1 = require("./routes/UserRouter");
class Api {
    constructor() {
        this.express = express();
        this.middleware();
        this.routes();
    }
    currentEnv() {
        return this.express.get('env');
    }
    middleware() {
        this.express.use((req, res, next) => {
            res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.header('Pragma', 'no-cache');
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials');
            res.header('Access-Control-Allow-Credentials', 'true');
            next();
        });
        this.express.use(compression());
        this.express.use(helmet());
        this.express.use(morgan('dev'));
        this.express.use(bodyParser.json());
        this.express.use(bodyParser.urlencoded({ extended: false }));
        this.express.use(passport.initialize());
        this.express.use(expressValidator());
        this.express.use((err, req, res, next) => {
            console.error(err);
            res.status(err.status || 500).json({
                message: err.message,
                error: err
            });
        });
    }
    routes() {
        const userRouter = new UserRouter_1.default();
        const bestBuyRouter = new BestBuyRouter_1.default();
        this.express.use(userRouter.path, userRouter.router);
        this.express.use(bestBuyRouter.path, bestBuyRouter.router);
    }
}
exports.default = Api;
