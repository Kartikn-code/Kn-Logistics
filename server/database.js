let sqlite3;
try {
    sqlite3 = (await import('sqlite3')).default;
} catch (e) {
    // sqlite3 not available (e.g., on Vercel) — PostgreSQL will be used instead
}
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
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    const isPostgres = !!connectionString;

    if (isPostgres) {
        console.log("🐘 Connecting to PostgreSQL database...");
        dbWrapper.type = 'postgres';
        dbWrapper.pool = new Pool({
            connectionString: connectionString,
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
            const mapped = { ...row };

            // 1. Map lowercased PostgreSQL keys back to accurate camelCase
            const keyMap = {
                'dispatchdate': 'dispatchDate',
                'invoiceno': 'invoiceNo',
                'lrno': 'lrNo',
                'sourcelocation': 'sourceLocation',
                'finaldestination': 'finalDestination',
                'ponumber': 'poNumber',
                'truckno': 'truckNo',
                'dateofarrival': 'dateOfArrival',
                'deliverydate': 'deliveryDate',
                'multipoint': 'multiPoint',
                'fuelcost': 'fuelCost',
                'driverfee': 'driverFee',
                'createdat': 'createdAt',
                'totalearnings': 'totalEarnings',
                'totalexpenses': 'totalExpenses',
                'netprofit': 'netProfit',
                'grandtotal': 'grandTotal',
                'totaltons': 'totalTons',
                'totaltrips': 'totalTrips',
                'trucknumber': 'truckNumber',
                'intransit': 'inTransit',
                'totalreceived': 'totalReceived',
                'receivedstatus': 'receivedStatus',
                'paymentdate': 'paymentDate',
                'paymentamount': 'paymentAmount',
                'totalbillvalue': 'totalBillValue',
                'myratereceived': 'myRateReceived',
                'deductionreceived': 'deductionReceived',
                'yettoreceive': 'yetToReceive',
                'nipponratesum': 'nipponRateSum',
                'myrate': 'myRate',
                'nipponrate': 'nipponRate'
            };

            for (const [lower, camel] of Object.entries(keyMap)) {
                if (mapped[lower] !== undefined && lower !== camel) {
                    mapped[camel] = mapped[lower];
                    delete mapped[lower];
                }
            }

            // 2. Coerce string-encoded numerics (like PG decimals/bigints) to JS Numbers
            const numericFields = [
                'tons', 'freight', 'multiPoint', 'loading', 'unloading', 'halt',
                'fuelCost', 'driverFee', 'total', 'totalEarnings', 'totalExpenses',
                'netProfit', 'grandTotal', 'totalTons', 'totalTrips', 'earnings',
                'expenses', 'profit', 'trips', 'inTransit', 'activeTrucks',
                'myRate', 'nipponRate', 'tds', 'totalReceived', 'deduction', 'paymentAmount',
                'totalBillValue', 'myRateReceived', 'deductionReceived', 'yetToReceive', 'nipponRateSum'
            ];

            for (const key of Object.keys(mapped)) {
                if (numericFields.includes(key)) {
                    mapped[key] = mapped[key] !== null ? Number(mapped[key]) : 0;
                }
            }

            return mapped;
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
            CREATE TABLE IF NOT EXISTS basic_payments (
                id ${dbWrapper.type === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                paymentDate DATE,
                paymentAmount DECIMAL(15, 2)
            )
        `);

        await dbWrapper.run(`
            CREATE TABLE IF NOT EXISTS invoice_payments (
                id ${dbWrapper.type === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                invoiceNo VARCHAR(100),
                myRate DECIMAL(15, 2),
                nipponRate DECIMAL(15, 2),
                tds DECIMAL(15, 2),
                totalReceived DECIMAL(15, 2),
                deduction DECIMAL(15, 2),
                receivedStatus VARCHAR(100),
                paymentDate DATE
            )
        `);

        await dbWrapper.run(`
            CREATE TABLE IF NOT EXISTS unsaved_records (
                id ${dbWrapper.type === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                fileName VARCHAR(255),
                recordIdentifier VARCHAR(255),
                issueDetails TEXT,
                uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes for better query performance
        await dbWrapper.run(`CREATE INDEX IF NOT EXISTS idx_dispatch_date ON dispatch_records(dispatchDate)`);
        await dbWrapper.run(`CREATE INDEX IF NOT EXISTS idx_truck_no ON dispatch_records(truckNo)`);


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
