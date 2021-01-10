import * as express from 'express';
import * as cors from 'cors';
import { json, urlencoded } from 'body-parser';
import * as chalk from 'chalk';

import { DB } from './DB';
import { ADMIN_ROLE, EDITOR_ROLE, User, VIEWER_ROLE } from './User';
import { Orders } from './Orders';
const { config } = require('../config');

const sql = new DB(config.mysql);
const user = new User(sql);
const orders = new Orders(sql);

const app = express();
const PORT = parseInt(process.env.PORT) || 80;

app.use(cors());
app.use((req, res, next) => {
    console.log(chalk.bold(`[${(new Date()).toISOString()}] `) + req.ip + ' Requesting: ' + chalk.bold.green(req.url));
    next();
});

app.use(json());
app.use(urlencoded({ extended: true }));

// Public

app.use(express.static('public'));
app.post('/user/login', (req, res) => user.handleLogin(req, res));
app.post('/user/auth', (req, res) => user.handleLoginID(req, res));
app.get('/users',(req, res) => user.handleGetAllUsers(req,res))

app.use(async (req, res, next) => {
    console.log(req.body);
    try {
        req.body.user = await user.handleAuth(req.headers, VIEWER_ROLE);
        if (!req.body.user) {
            res.status(401);
            return res.send({ error: 'Authentication Error' })
        }
        next();
    } catch (err) {
        res.status(500);
        return res.send({ error: err });
    }
});

// Viewer permissions

app.post('/user/password', (req, res) => user.handleUpdatePassword(req, res));
app.get('/order/:id', (req, res) => orders.handleGetOrder(req, res));
app.get('/orders/:date?', (req, res) => orders.handleGetOrders(req, res));
app.get('/invoice/:id', (req, res) => orders.handleGetInvoice(req, res));

app.use(async (req, res, next) => {
    try {
        if (!(await User.handleAuthSimple(req.body.user, EDITOR_ROLE))) {
            res.status(403);
            return res.send({ error: 'Permission Error' })
        }
        next();
    } catch (err) {
        res.status(500);
        return res.send({ error: err });
    }
});

// Editor permissions
app.post('/order/', (req, res) => orders.handleInsertOrder(req, res));
app.post('/order/:id', (req, res) => orders.handleInsertOrder(req, res));
app.post('/order/:id/delete', (req, res) => orders.handleDeleteOrder(req, res));
app.post('/order/:id/complete', (req, res) => orders.handleCompleteOrder(req, res));

app.use(async (req, res, next) => {
    try {
        if (!(await User.handleAuthSimple(req.body.user, ADMIN_ROLE))) {
            res.status(403);
            return res.send({ error: 'Permission Error' })
        }
        next();
    } catch (err) {
        res.status(500);
        return res.send({ error: err });
    }
});

// Admin permissions

app.post('/user/', (req, res) => user.handleCreateUser(req, res));
app.post('/user/:id/resetpassword', (req, res) => user.handleResetPasswordUser(req, res));

app.listen(PORT);
console.log('Production Server running at http://localhost:' + PORT);
