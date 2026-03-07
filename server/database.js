import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Unified Database execution wrapper
let dbWrapper = {
    type: 'sqlite',
    pool: null,
    sqliteDb: null,
    run: async (query, params = []) => {
        throw new Error("Database not initialized");
    },
    all: async (query, params = []) => {
        throw new Error("Database not initialized");
    },
    get: async (query, params = []) => {
        throw new Error("Database not initialized");
    }
};

const initializeDatabase = async () => {
    // 1. Determine if we are connecting to a remote PostgreSQL DB or Local SQLite
    const isPostgres = !!process.env.DATABASE_URL;

    if (isPostgres) {
        console.log("🐘 Connecting to PostgreSQL database...");
        dbWrapper.type = 'postgres';
        dbWrapper.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false } // Typical for Supabase/Neon
        });

        // Postgres-specific wrapper logic
        // Converts SQLite ? arguments to Postgres $1, $2, etc.
        const pgFormat = (query) => {
            let i = 1;
            return query.replace(/\?/g, () => `$${i++}`);
        };

        dbWrapper.run = async (query, params = [], callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            try {
                // To mimic sqlite's this.lastID, we'll try to append RETURNING id to INSERTs
                let modifiedQuery = pgFormat(query);
                if (modifiedQuery.trim().toUpperCase().startsWith('INSERT') && !modifiedQuery.toUpperCase().includes('RETURNING')) {
                    modifiedQuery += ' RETURNING id';
                }

                const res = await dbWrapper.pool.query(modifiedQuery, params);

                // Create a fake Context object for callbacks that expect `this.lastID` (like sqlite do)
                const mockContext = {
                    lastID: res.rows && res.rows.length > 0 ? res.rows[0].id : null,
                    changes: res.rowCount
                };

                if (callback) callback.call(mockContext, null, res);
            } catch (err) {
                if (callback) callback(err);
                else throw err;
            }
        };
        const camelCaseRow = (row) => {
            if (!row) return row;
            return {
                id: row.id,
                dispatchDate: row.dispatchdate || row.dispatchDate,
                invoiceNo: row.invoiceno || row.invoiceNo,
                lrNo: row.lrno || row.lrNo,
                sourceLocation: row.sourcelocation || row.sourceLocation,
                finalDestination: row.finaldestination || row.finalDestination,
                poNumber: row.ponumber || row.poNumber,
                tons: row.tons,
                truckNo: row.truckno || row.truckNo,
                dateOfArrival: row.dateofarrival || row.dateOfArrival,
                deliveryDate: row.deliverydate || row.deliveryDate,
                freight: row.freight,
                multiPoint: row.multipoint || row.multiPoint,
                loading: row.loading,
                unloading: row.unloading,
                halt: row.halt,
                fuelCost: row.fuelcost || row.fuelCost,
                driverFee: row.driverfee || row.driverFee,
                total: row.total,
                createdAt: row.createdat || row.createdAt
            };
        };

        dbWrapper.all = async (query, params = [], callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            try {
                const res = await dbWrapper.pool.query(pgFormat(query), params);
                const mappedRows = res.rows.map(camelCaseRow);
                if (callback) callback(null, mappedRows);
                return mappedRows;
            } catch (err) {
                if (callback) callback(err);
                else throw err;
            }
        };
        dbWrapper.get = async (query, params = [], callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            try {
                const res = await dbWrapper.pool.query(pgFormat(query), params);
                const mappedRow = res.rows.length > 0 ? camelCaseRow(res.rows[0]) : null;
                if (callback) callback(null, mappedRow);
                return mappedRow;
            } catch (err) {
                if (callback) callback(err);
                else throw err;
            }
        };

    } else {
        console.log("🪶 Connecting to local SQLite database...");
        const dbPath = path.resolve(__dirname, 'database.sqlite');
        const db = new sqlite3.Database(dbPath);
        dbWrapper.sqliteDb = db;

        // SQLite-specific wrapper logic (Promisified)
        dbWrapper.run = (query, params = []) => {
            return new Promise((resolve, reject) => {
                db.run(query, params, function (err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
        };
        dbWrapper.all = (query, params = []) => {
            return new Promise((resolve, reject) => {
                db.all(query, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        };
        dbWrapper.get = (query, params = []) => {
            return new Promise((resolve, reject) => {
                db.get(query, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        };
    }

    // 2. Initialize necessary tables
    await createTables();
};

const createTables = async () => {
    try {
        await dbWrapper.run(`
            CREATE TABLE IF NOT EXISTS orders (
                id ${dbWrapper.type === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                clientName VARCHAR(255) NOT NULL,
                orderDate DATE NOT NULL,
                poNumber VARCHAR(100),
                vehiclePlacementDate DATE,
                materialDescription TEXT,
                freightRate DECIMAL(10, 2),
                advanceAmount DECIMAL(10, 2),
                dispatchDate DATE,
                vendorName VARCHAR(255),
                vehicleNo VARCHAR(100),
                lrNo VARCHAR(100),
                truckType VARCHAR(100),
                driverPhone VARCHAR(20),
                invoiceNumber VARCHAR(100),
                invoiceDate DATE,
                receivableAmount DECIMAL(10, 2),
                billingDate DATE,
                status VARCHAR(50) DEFAULT 'Pending'
            )
        `);

        await dbWrapper.run(`
            CREATE TABLE IF NOT EXISTS dispatch_records (
                id ${dbWrapper.type === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                dispatchDate DATE NOT NULL,
                invoiceNo VARCHAR(100),
                lrNo VARCHAR(100),
                sourceLocation VARCHAR(255),
                finalDestination VARCHAR(255),
                poNumber VARCHAR(100),
                tons DECIMAL(10, 2),
                truckNo VARCHAR(100),
                dateOfArrival DATE,
                deliveryDate DATE,
                freight DECIMAL(15, 2),
                multiPoint DECIMAL(15, 2),
                loading DECIMAL(15, 2),
                unloading DECIMAL(15, 2),
                halt DECIMAL(15, 2),
                fuelCost DECIMAL(15, 2),
                driverFee DECIMAL(15, 2),
                total DECIMAL(15, 2)
            )
        `);

        await dbWrapper.run(`
            CREATE TABLE IF NOT EXISTS users (
                id ${dbWrapper.type === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            )
        `);

        if (dbWrapper.type === 'sqlite') {
            try {
                await dbWrapper.run(`ALTER TABLE dispatch_records ADD COLUMN invoiceNo VARCHAR(100);`);
            } catch (err) { /* column exists */ }
            try {
                await dbWrapper.run(`ALTER TABLE dispatch_records ADD COLUMN deliveryDate DATE;`);
            } catch (err) { /* column exists */ }
            try {
                await dbWrapper.run(`ALTER TABLE dispatch_records ADD COLUMN dateOfArrival DATE;`);
            } catch (err) { /* column exists */ }
            try {
                await dbWrapper.run(`ALTER TABLE dispatch_records ADD COLUMN multiPoint DECIMAL(15, 2) DEFAULT 0;`);
            } catch (err) { /* column exists */ }
            try {
                await dbWrapper.run(`ALTER TABLE dispatch_records ADD COLUMN fuelCost DECIMAL(15, 2) DEFAULT 0;`);
            } catch (err) { /* column exists */ }
            try {
                await dbWrapper.run(`ALTER TABLE dispatch_records ADD COLUMN driverFee DECIMAL(15, 2) DEFAULT 0;`);
            } catch (err) { /* column exists */ }
        }

        // Seed admin user if it doesn't exist
        const adminUser = process.env.ADMIN_USER || 'admin';
        const adminPass = process.env.ADMIN_PASS || 'admin123';

        await dbWrapper.run(`
            INSERT INTO users (username, password)
            SELECT ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = ?)
        `, [adminUser, adminPass, adminUser]);

        console.log("Database tables initialized successfully.");
    } catch (err) {
        console.error("Error creating tables:", err);
    }
};

// Initialize immediately so dbWrapper is ready
initializeDatabase();

// Export the generic wrapper
const db = {
    run: function (q, p, cb) {
        if (typeof p === 'function') {
            cb = p;
            p = [];
        }
        dbWrapper.run(q, p)
            .then(res => {
                if (cb) {
                    if (dbWrapper.type === 'sqlite') {
                        cb.call(res, null); // res is 'this' context for sqlite
                    } else {
                        cb.call(res, null); // We mock the context for postgres inside dbWrapper.run
                    }
                }
            })
            .catch(err => { if (cb) cb.call(this, err); });
    },
    all: function (q, p, cb) {
        if (typeof p === 'function') {
            cb = p;
            p = [];
        }
        dbWrapper.all(q, p)
            .then(rows => { if (cb) cb(null, rows); })
            .catch(err => { if (cb) cb(err, null); });
    },
    get: function (q, p, cb) {
        if (typeof p === 'function') {
            cb = p;
            p = [];
        }
        dbWrapper.get(q, p)
            .then(row => { if (cb) cb(null, row); })
            .catch(err => { if (cb) cb(err, null); });
    }
};

export default db;
