"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const expressValidator = require("express-validator");
const UserRouter_1 = require("./routes/UserRouter");
const BestBuyRouter_1 = require("./routes/BestBuyRouter");
const TableRouter_1 = require("./routes/TableRouter");
class Api {
    constructor() {
        this.express = express();
        this.middleware();
        this.routes();
    }
    middleware() {
        this.express.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials');
            res.header('Access-Control-Allow-Credentials', 'true');
            next();
        });
        this.express.use(helmet());
        this.express.use(morgan('dev'));
        this.express.use(bodyParser.json());
        this.express.use(bodyParser.urlencoded({ extended: false }));
        this.express.use(expressValidator());
    }
    routes() {
        const userRouter = new UserRouter_1.default();
        const bestBuyRouter = new BestBuyRouter_1.default();
        const tableRouter = new TableRouter_1.default();
        this.express.use(userRouter.path, userRouter.router);
        this.express.use(bestBuyRouter.path, bestBuyRouter.router);
        this.express.use(tableRouter.path, tableRouter.router);
    }
}
exports.default = Api;
//# sourceMappingURL=Api.js.map