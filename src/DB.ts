import * as NodeCache from 'node-cache';
import { Connection, createConnection } from "mysql";

export class DB {
    private conn: Connection;
    private cache = new NodeCache({ stdTTL: 3*60e3 });

    constructor(credentials) {
        this.conn = createConnection(credentials);

        this.conn.query('CREATE TABLE IF NOT EXISTS `users` ( `id` VARCHAR(36) NOT NULL, `name` VARCHAR(256) NOT NULL, `email` VARCHAR(256) NOT NULL, `password` VARCHAR(60) NOT NULL, `role` INT NOT NULL, `reset_password` BOOLEAN NOT NULL DEFAULT TRUE, PRIMARY KEY (`id`), UNIQUE (`email`)) ENGINE = InnoDB;');
        this.conn.query('CREATE TABLE IF NOT EXISTS `orders` ( `id` VARCHAR(36) NOT NULL, `invoice` VARCHAR(10) NOT NULL, `user` varchar(36) NOT NULL REFERENCES users(`id`), `total` FLOAT NOT NULL, `gst` FLOAT NOT NULL, `location` TINYINT NOT NULL, `date` DATE NOT NULL, `name` VARCHAR(512) NOT NULL, `address` JSON NOT NULL, `phone` VARCHAR(128) NOT NULL, `products` JSON NOT NULL, `truck` TINYINT NOT NULL, `time` INT NOT NULL, `distance` FLOAT NOT NULL, `leaveTime` DATETIME NOT NULL, `returnTime` DATETIME NOT NULL, `notes` VARCHAR(2048) NOT NULL, `complete` BOOLEAN NOT NULL DEFAULT FALSE , PRIMARY KEY (`id`)) ENGINE = InnoDB;');
    }

    public query = (sql: string, params: Array<any> | Set = []): Promise<Array<any>> => {
        return new Promise((resolve, reject) => {
            let cacheRes = this.cache.get(sql);
            if (cacheRes) return cacheRes
            this.conn.query(sql, params, (err, res) => {
                if (err) return reject(err);
                if (sql.includes('SELECT FROM')) this.cache.set(sql, res);
                resolve(res);
            })
        });
    }

    public static mysqlDate = (date: Date): string | null => {
        date = new Date(date);
        if (date.getTime() !== date.getTime()) return null;
        return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    }

    public static mysqlTime = (date: Date): string | null => {
        date = new Date(date);
        if (date.getTime() !== date.getTime()) return null;
        return date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    }

    public static mysqlDatetime = (date: Date): string | null => {
        date = new Date(date);
        if (date.getTime() !== date.getTime()) return null;
        return DB.mysqlDate(date) + ' ' + DB.mysqlTime(date);
    }
}

interface Set {
    [key: string]: any
}
