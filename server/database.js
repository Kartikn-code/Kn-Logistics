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

        dbWrapper.run = async (query, params = []) => {
            await dbWrapper.pool.query(pgFormat(query), params);
        };
        dbWrapper.all = async (query, params = []) => {
            const res = await dbWrapper.pool.query(pgFormat(query), params);
            return res.rows;
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
                lrNo VARCHAR(100),
                sourceLocation VARCHAR(255),
                finalDestination VARCHAR(255),
                poNumber VARCHAR(100),
                tons DECIMAL(10, 2),
                truckNo VARCHAR(100),
                freight DECIMAL(15, 2),
                loading DECIMAL(15, 2),
                unloading DECIMAL(15, 2),
                halt DECIMAL(15, 2),
                fuelCost DECIMAL(15, 2),
                driverFee DECIMAL(15, 2),
                total DECIMAL(15, 2)
            )
        `);

        if (dbWrapper.type === 'sqlite') {
            try {
                await dbWrapper.run(`ALTER TABLE dispatch_records ADD COLUMN fuelCost DECIMAL(15, 2) DEFAULT 0;`);
            } catch (err) { /* column exists */ }
            try {
                await dbWrapper.run(`ALTER TABLE dispatch_records ADD COLUMN driverFee DECIMAL(15, 2) DEFAULT 0;`);
            } catch (err) { /* column exists */ }
        }

        console.log("Database tables initialized successfully.");
    } catch (err) {
        console.error("Error creating tables:", err);
    }
};

// Initialize immediately so dbWrapper is ready
initializeDatabase();

// Export the generic wrapper
const db = {
    run: (q, p, cb) => {
        dbWrapper.run(q, p)
            .then(res => cb(null, res))
            .catch(err => cb(err, null));
    },
    all: (q, p, cb) => {
        dbWrapper.all(q, p)
            .then(rows => cb(null, rows))
            .catch(err => cb(err, null));
    }
};

export default db;
