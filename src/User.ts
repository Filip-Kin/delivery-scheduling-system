import { hash, compare } from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { Request, Response } from 'express';
import { DB } from './DB';
import { IncomingHttpHeaders } from 'http2';

const SALT_ROUNDS = 10;
export const ADMIN_ROLE = 0;
export const EDITOR_ROLE = 1;
export const VIEWER_ROLE = 2;

export class User {
    private sql: DB;

    constructor(db: DB) {
        this.sql = db;
    }

    private hash = async (password: string): Promise<string> => {
        try {
            return await hash(password, SALT_ROUNDS);
        } catch (err) {
            throw err;
        }
    }

    public auth = async (id: string | string[], password: string | string[], level: 0 | 1 | 2 = EDITOR_ROLE): Promise<Account | null> => {
        let result = await this.sql.query('SELECT * FROM `users` WHERE id = ?', [id])
        if (result.length !== 1) return null;
        let user = <Account>result[0];

        try {
            // If compare succeeds than password is correct and return if role is higher than required
            if (await compare(password, user.password) && user.role <= level) {
                if (user.reset_password) throw new Error('Password reset required');
                return user;
                
            }
            return null; // if compare fails return false
        } catch (err) {
            throw err;
        }
    }

    public handleAuth = async (headers: IncomingHttpHeaders, level: 0 | 1 | 2 = EDITOR_ROLE): Promise<null | Account> => {
        if (!headers.hasOwnProperty('id') || !headers.hasOwnProperty('password')) return null;
        return await this.auth(headers['id'].toString(), headers['password'].toString(), level);
    }

    public static handleAuthSimple = async (user: Account, level: 0 | 1 | 2 = EDITOR_ROLE): Promise<null | Account> => {
        if (!user || user.role > level) return null;
        if (user.reset_password && level < VIEWER_ROLE) throw new Error('Password reset required');
        return user;
    }



    public login = async (email: string, password: string) => {
        let response = await this.sql.query('SELECT * FROM `users` WHERE `email` = ?', [email]);
        if (response.length !== 1) return null;
        let user = <Account>response[0];
        return this.auth(user.id, password, VIEWER_ROLE);
    }

    public handleLogin = async (req: Request, res: Response): Promise<any> => {
        if (
            !req.body.hasOwnProperty('email') ||
            !req.body.hasOwnProperty('password')) {
            res.status(400);
            return res.send({ error: 'Missing Parameters' });
        }

        try {
            let user = await this.login(req.body.email, req.body.password);
            if (!user) {
                res.status(403);
                return res.send({ error: 'Authentication error' });
            }
            user.password = req.body.password;
            res.send({ user: user });
        } catch (err) {
            if (err.message === 'Password reset required') {
                res.status(418); // Brew teh tea
                res.send({ id: (await this.sql.query('SELECT * FROM `users` WHERE `email` = ?', [req.body.email]))[0].id, error: err.message });
                return;
            }
            res.status(500);
            res.send({ error: err.message });
        }
    }

    public handleLoginID = async (req: Request, res: Response): Promise<any> => {
        if (
            !req.body.hasOwnProperty('id') ||
            !req.body.hasOwnProperty('password')) {
            res.status(400);
            return res.send({ error: 'Missing Parameters' });
        }

        try {
            let user = await this.auth(req.body.id, req.body.password, VIEWER_ROLE);
            if (!user) {
                res.status(403);
                return res.send({ error: 'Authentication error' });
            }
            user.password = req.body.password;
            res.send({ user: user });
        } catch (err) {
            if (err.message === 'Password reset required') {
                res.status(418); // Brew teh tea
                res.send({ id: req.body.id, error: err.message });
                return;
            }
            res.status(500);
            res.send({ error: err.message });
        }
    }

    public getAllUsers = async () => {
        try {
            let users = await this.sql.query('SELECT * FROM `users`');
            return users
        }
        catch (err) {
            throw err;
        }
    }

    public handleGetAllUsers = async (req: Request, res: Response): Promise<any> => {
        if (!req.headers.hasOwnProperty('id') && !req.headers.hasOwnProperty('password')) {
            res.status(400);
            return res.send({ error: 'Missing Parameters' });
        }

        try {
            const user = await this.auth(req.headers.id, req.headers.password, ADMIN_ROLE);
            if (user) {
                let allUsers = await this.getAllUsers();
                res.send({ users: allUsers });
            }
            else {
                res.status(403);
                return res.send({ error: 'Authentication error' });
            }
        } catch (err) {
            res.status(500);
            res.send({ error: err.message });
        }

    }

    public createUser = async (name: string, email: string, password: string, role: 0 | 1 | 2): Promise<Account> => {
        try {
            let account = <Account>{ id: uuid(), name: name, email: email, password: await this.hash(password), role: role };
            await this.sql.query('INSERT INTO `users` SET ?', account);
            return account;
        } catch (err) {
            throw err;
        }
    }

    public handleCreateUser = async (req: Request, res: Response): Promise<any> => {
        if (
            !req.body.hasOwnProperty('name') ||
            !req.body.hasOwnProperty('email') ||
            !req.body.hasOwnProperty('password') ||
            !req.body.hasOwnProperty('role')) {
            res.status(400);
            return res.send({ error: 'Missing Parameters' });
        }

        try {
            let user = await this.createUser(req.body.name, req.body.email, req.body.password, req.body.role);
            delete user.password;
            res.send({ user: user });
        } catch (err) {
            res.status(500);
            res.send({ error: err.message });
        }
    }



    public updatePassword = async (password: string, id: string): Promise<any> => {
        try {
            await this.sql.query('UPDATE `users` SET `password` = ?, `reset_password` = FALSE WHERE `id` = ?', [await this.hash(password), id]);
        } catch (err) {
            throw err;
        }
    }

    public handleUpdatePassword = async (req: Request, res: Response): Promise<any> => {
        if (!req.body.hasOwnProperty('password')) {
            res.status(400);
            return res.send({ error: 'Missing Parameters' });
        }

        try {
            await this.updatePassword(req.body.password, req.body.user.id);
            res.send({ success: true });
        } catch (err) {
            res.status(500);
            res.send({ error: err.message });
        }
    }

    public handleResetPasswordUser = async (req: Request, res: Response): Promise<any> => {
        if (!req.body.hasOwnProperty('password')) {
            res.status(400);
            return res.send({ error: 'Missing Parameters' });
        }

        try {
            await this.updatePassword(req.body.password, req.params.id);
            res.send({ success: true });
        } catch (err) {
            res.status(500);
            res.send({ error: err.message });
        }
    }
}

export interface Account {
    id: string
    name: string
    email: string
    password: string
    role: 0 | 1 | 2
    reset_password: boolean
}