import { v4 as uuid } from 'uuid';
import { Request, Response } from 'express';
import { DB } from './DB';

export class Orders {
    private sql: DB;

    constructor(db: DB) {
        this.sql = db;
    }

    public getInvoice = async (invnum: string): Promise<Order> => {
        let order = await this.sql.query('SELECT * FROM `orders` WHERE `invoice` = ?', [invnum]);
        if (order.length > 0) return this.getOrder(order[0].id);

        let responses = await Promise.all([
            this.sql.query('SELECT `INVNUM`, `TOTAL`, `GST`, `LOCATION`, `DATE`, `NAME`, `ADD1`, `ADD2`, `ADD3`, `ADD4`, `PHONE` FROM `invidx` WHERE `INVNUM` = ?;', [invnum]),
            this.sql.query('SELECT `CODE`, `QTY`, `RATE` FROM `custprod` WHERE `INVNUM` = ?;', [invnum])
        ]);
        if (responses[0].length < 1) throw new Error('Invoice not found');
        let inv = responses[0][0];
        let products = <Product[]>(responses[1].map(x => <Product>({ code: x['CODE'], qty: x['QTY'], rate: x['RATE'], total: x['QTY'] * x['RATE'] })));
        return <Order>{
            invoice: invnum,
            total: inv['TOTAL'],
            gst: inv['GST'],
            location: inv['LOCATION'],
            date: new Date(inv['DATE']),
            name: inv['NAME'],
            address: [inv['ADD1'], inv['ADD2'], inv['ADD3'], inv['ADD4']],
            phone: inv['PHONE'],
            products: products
        }
    }

    public handleGetInvoice = async (req: Request, res: Response): Promise<any> => {
        try {
            let order = await this.getInvoice(req.params.id);
            res.send({ order: order });
        } catch (err) {
            res.status(500);
            res.send({ error: err.message });
        }
    }

    public getOrders = async (date: string): Promise<Delivery[]> => {
        let response = await this.sql.query('SELECT * FROM `orders` WHERE `leaveTime` > ? AND `leaveTime` < ?;', [date + ' 00:00:00', date + ' 23:59:59']);
        for (let delivery of response) {
            delivery.address = JSON.parse(delivery.address);
            delivery.products = <Product>JSON.parse(delivery.products);
        }
        return <Delivery[]>response;
    }

    public handleGetOrders = async (req: Request, res: Response): Promise<any> => {
        try {
            let orders = await this.getOrders(DB.mysqlDate(new Date(req.params.date)) || DB.mysqlDate(new Date()));
            res.send({ orders: orders });
        } catch (err) {
            res.status(500);
            res.send({ error: err.message });
        }
    }

    public getOrder = async (id: string): Promise<Delivery> => {
        let response = await this.sql.query('SELECT * FROM `orders` WHERE `id` = ? LIMIT 1;', [id]);
        if (response.length < 1) throw new Error('Delivery not found');
        let delivery = response[0];
        delivery.address = JSON.parse(delivery.address);
        delivery.products = <Product>JSON.parse(delivery.products);
        return <Delivery>delivery;
    }

    public handleGetOrder = async (req: Request, res: Response): Promise<any> => {
        try {
            let order = await this.getOrder(req.params.id);
            res.send({ order: order });
        } catch (err) {
            res.status(500);
            res.send({ error: err.message });
        }
    }

    public insertOrder = async (delivery: Delivery): Promise<any> => {
        let insert = {
            id: delivery.id,
            invoice: delivery.invoice,
            user: delivery.user.id,
            total: delivery.total,
            gst: delivery.gst,
            location: delivery.location,
            date: DB.mysqlDate(delivery.date),
            name: delivery.name,
            address: JSON.stringify(delivery.address),
            phone: delivery.phone,
            products: JSON.stringify(delivery.products),
            truck: delivery.truck,
            time: delivery.time,
            distance: delivery.distance,
            leaveTime: DB.mysqlDatetime(delivery.leaveTime),
            returnTime: DB.mysqlDatetime(delivery.returnTime),
            notes: delivery.notes,
            complete: delivery.complete
        }

        await this.sql.query('INSERT INTO `orders` SET ? ON DUPLICATE KEY UPDATE ?;', [insert, insert]);
        return delivery;
    }

    public handleInsertOrder = async (req: Request, res: Response): Promise<any> => {
        req.body.id = req.params.id || uuid();
        req.body.user = req.body.user;
        if (!req.body.complete) req.body.complete = 0;
        if (!req.body.hasOwnProperty('invoice') ||
            !req.body.hasOwnProperty('total') ||
            !req.body.hasOwnProperty('gst') ||
            !req.body.hasOwnProperty('location') ||
            !req.body.hasOwnProperty('date') ||
            !req.body.hasOwnProperty('name') ||
            !req.body.hasOwnProperty('address') ||
            !req.body.hasOwnProperty('phone') ||
            !req.body.hasOwnProperty('products') ||
            !req.body.hasOwnProperty('truck') ||
            !req.body.hasOwnProperty('time') ||
            !req.body.hasOwnProperty('distance') ||
            !req.body.hasOwnProperty('leaveTime') ||
            !req.body.hasOwnProperty('returnTime') ||
            !req.body.hasOwnProperty('notes')) {
            res.status(400);
            return res.send({ error: 'Missing Parameters' });
        }

        try {
            let order = await this.insertOrder(req.body);
            res.send({ order: order });
        } catch (err) {
            res.status(500);
            res.send({ error: err.message });
        }
    }

    public completeOrder = async (id: string): Promise<any> => {
        await this.sql.query('UPDATE `orders` WHERE `id` = ? OR `invoice` = ? SET `complete` = TRUE;', [id, id]);
    }

    public handleCompleteOrder = async (req: Request, res: Response): Promise<any> => {
        try {
            await this.completeOrder(req.params.id);
            res.send({ success: true });
        } catch (err) {
            res.status(500);
            res.send({ error: err.message });
        }
    }

    public deleteOrder = async (id: string): Promise<any> => {
        await this.sql.query('DELETE FROM `orders` WHERE `id` = ? OR `invoice` = ?;', [id, id]);
    }

    public handleDeleteOrder = async (req: Request, res: Response): Promise<any> => {
        try {
            await this.deleteOrder(req.params.id);
            res.send({ success: true });
        } catch (err) {
            res.status(500);
            res.send({ error: err.message });
        }
    }
}

export interface Delivery extends Order {
    id: string
    user: Account
    truck: 0 | 1
    time: number
    distance: number
    leaveTime: Date
    returnTime: Date
    notes: string
    complete: boolean
}

export interface Order {
    invoice: string
    total: number
    gst: number
    location: number
    date: Date
    name: string
    address: string[]
    phone: string
    products: Product[]
}

export interface Product {
    code: string
    rate: number
    qty: number
    total: number
}