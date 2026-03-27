import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import XLSX from 'xlsx';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import db from './database.js';

const router = express.Router();

// JWT Secret (fallback to random if not in production env)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_kn_logistics_secret_key_2026';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// Verify Token Middleware
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (!bearerHeader) {
        return res.status(403).json({ error: 'No token provided' });
    }
    const token = bearerHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Failed to authenticate token' });
        }
        req.userId = decoded.id;
        next();
    });
};

// Helper to hash password
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

// Helper to verify password
const verifyPassword = (password, storedPassword) => {
    try {
        const [salt, key] = storedPassword.split(':');
        const hashBuffer = crypto.scryptSync(password, salt, 64);
        const keyBuffer = Buffer.from(key, 'hex');
        return crypto.timingSafeEqual(hashBuffer, keyBuffer);
    } catch (e) {
        return false;
    }
};

// POST Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // First check hardcoded environment variables as a master login
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign({ id: username, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({ success: true, token, message: 'Logged in successfully (Master)' });
    }

    // Then check the users database
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ success: false, message: 'Server error during login' });
        }

        if (user && verifyPassword(password, user.password || user.passwordhash)) {
            const token = jwt.sign({ id: user.username, role: 'user' }, JWT_SECRET, { expiresIn: '8h' });
            return res.json({ success: true, token, message: 'Logged in successfully' });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// POST Signup (Protected to ensure only authorized users can create more users)
router.post('/signup', verifyToken, (req, res) => {
    const { username, password } = req.body;

    if (!username || !password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Invalid username or password must be purely alphanumeric and 6+ chars' });
    }

    const hashedPassword = hashPassword(password);

    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ success: false, message: 'Username already exists' });
            }
            return res.status(500).json({ success: false, message: 'Failed to create user' });
        }
        res.json({ success: true, message: 'User created successfully' });
    });
});

// Configure Multer for file upload (Memory Storage for Vercel)
const upload = multer({ storage: multer.memoryStorage() });

// GET all active orders
router.get('/orders', verifyToken, (req, res) => {
    const sql = 'SELECT * FROM orders ORDER BY timestamp DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// GET dashboard stats
router.get('/stats', verifyToken, (req, res) => {
    const sql = `
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status != 'Delivered' THEN 1 ELSE 0 END) as activeTrucks,
            SUM(CASE WHEN truckType = 'Inward' THEN 1 ELSE 0 END) as inwardOps,
            SUM(CASE WHEN truckType = 'Outward' THEN 1 ELSE 0 END) as outwardOps,
            SUM(CASE WHEN status = 'In Transit' THEN 1 ELSE 0 END) as inTransit
        FROM orders
    `;

    db.get(sql, [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // If no data, return zeros
        const stats = row || { total: 0, activeTrucks: 0, inwardOps: 0, outwardOps: 0, inTransit: 0 };
        res.json(stats);
    });
});

// GET single order by Order ID
router.get('/orders/:id', verifyToken, (req, res) => {
    const sql = 'SELECT * FROM orders WHERE orderId = ?';
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ data: row });
    });
});

// DELETE multiple orders
router.delete('/orders', verifyToken, async (req, res) => {
    const { ids } = req.body; // Expecting an array of orderIds (e.g., ['KN-2024-001', 'KN-2024-002'])
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No order IDs provided for deletion' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM orders WHERE orderId IN (${placeholders})`;

    try {
        await new Promise((resolve, reject) => {
            db.run(sql, ids, function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ message: `Successfully deleted ${ids.length} orders.` });
    } catch (err) {
        console.error('Error bulk deleting orders:', err.message);
        res.status(500).json({ error: 'Failed to delete orders' });
    }
});

// CREATE a new order (Manual Entry)
router.post('/orders', verifyToken, (req, res) => {
    const { orderId, truckNumber, truckType, status, currentLocation } = req.body;

    const sql = `INSERT INTO orders (orderId, truckNumber, truckType, status, currentLocation)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(orderId) DO UPDATE SET
                 status=excluded.status, currentLocation=excluded.currentLocation, timestamp=CURRENT_TIMESTAMP`;

    db.run(sql, [orderId, truckNumber, truckType, status, currentLocation], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Order created/updated successfully', id: this.lastID });
    });
});

// UPLOAD CSV
router.post('/upload', verifyToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    // Create Readable Stream from buffer
    const { Readable } = require('stream');
    const stream = Readable.from(req.file.buffer);

    stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            // Process results and insert into DB
            const sql = `INSERT INTO orders (orderId, truckNumber, truckType, status, currentLocation)
                         VALUES (?, ?, ?, ?, ?)
                         ON CONFLICT(orderId) DO UPDATE SET
                         status=excluded.status, currentLocation=excluded.currentLocation, timestamp=CURRENT_TIMESTAMP`;

            let completed = 0;
            let errors = 0;

            if (results.length === 0) {
                return res.json({ message: 'No data found in file' });
            }

            results.forEach((row) => {
                // Map CSV columns to DB columns (assuming generic headers or specific ones)
                // Expected headers: OrderID, TruckNumber, TruckType, Status, CurrentLocation
                const orderId = row.OrderID || row['Order ID'] || row.orderId;
                const truckNumber = row.TruckNumber || row['Truck Number'] || row.truckNumber;
                const truckType = row.TruckType || row['Truck Type'] || row.truckType || 'Outward';
                const status = row.Status || row.status || 'Loading';
                const location = row.CurrentLocation || row['Current Location'] || row.currentLocation || 'Depot';

                if (orderId) {
                    db.run(sql, [orderId, truckNumber, truckType, status, location], (err) => {
                        if (err) errors++;
                        completed++;

                        if (completed === results.length) {
                            if (!res.headersSent) {
                                res.json({
                                    message: `Processed ${results.length} rows`,
                                    success: completed - errors,
                                    failed: errors
                                });
                            }
                        }
                    });
                } else {
                    completed++; // Skip empty rows but count them
                    if (completed === results.length && !res.headersSent) {
                        res.json({ message: 'Processed', details: 'Some rows missing OrderID' });
                    }
                }
            });
        });
});

// ===== DISPATCH / FINANCIAL DATA ROUTES =====

// UPLOAD Excel for dispatch records
router.post('/upload-financial', verifyToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
            return res.json({ message: 'No data found in file', success: 0, failed: 0 });
        }

        const sql = `INSERT INTO dispatch_records (dispatchDate, invoiceNo, lrNo, sourceLocation, finalDestination, poNumber, tons, truckNo, dateOfArrival, deliveryDate, freight, multiPoint, loading, unloading, halt, fuelCost, driverFee, total)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        let completed = 0;
        let errors = 0;
        let skipped = 0;

        const processRows = async () => {
            const batchSize = 25;
            for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                await Promise.all(batch.map(async (row) => {
                    // Normalize row keys to handle line breaks and spaces in Excel headers
                    const normRow = {};
                    for (let key in row) {
                        const cleanKey = key.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
                        normRow[cleanKey] = row[key];
                    }

                    const parseAmount = (val) => {
                        if (val === undefined || val === null || val === '') return 0;
                        if (typeof val === 'number') return val;
                        const cleaned = String(val).replace(/[^0-9.-]/g, '');
                        return parseFloat(cleaned) || 0;
                    };

                    let dispatchDate = normRow['DISPATCH - DATE'] || normRow['DISPATCH-DATE'] || normRow['DISPATCH DATE'] || normRow['DISPATCHDATE'] || normRow['DATE'] || '';
                    const invoiceNo = normRow['INVOICE NO'] || normRow['INVOICE.NO'] || normRow['INVOICE NO.'] || normRow['INVOICENO.'] || normRow['INVOICENO'] || '';
                    const lrNo = normRow['LR. NO'] || normRow['LR.NO'] || normRow['LR NO'] || normRow['LRNO'] || '';
                    const sourceLocation = normRow['FROM'] || normRow['SOURCELOCATION'] || normRow['SOURCE'] || '';
                    const finalDestination = normRow['TO'] || normRow['FINALDESTINATION'] || normRow['DESTINATION'] || '';
                    const poNumber = normRow['PO.NUMBER'] || normRow['PO NUMBER'] || normRow['PONUMBER'] || '';
                    const tons = parseAmount(normRow['TONS'] || normRow['WEIGHT']);
                    const truckNo = normRow['TRUCK.NO'] || normRow['TRUCK NO'] || normRow['TRUCKNO'] || normRow['VEHICLENO'] || '';

                    let dateOfArrival = normRow['DATE OF ARRIVAL'] || normRow['DATEOFARRIVAL'] || normRow['ARRIVALDATE'] || '';
                    let deliveryDate = normRow['DATE OF DELIVERY'] || normRow['DATEOFDELIVERY'] || normRow['DELIVERYDATE'] || '';

                    const freight = parseAmount(normRow['FREIGHT']);
                    const multiPoint = parseAmount(normRow['MULTI- POINT'] || normRow['MULTI-POINT'] || normRow['MULTIPOINT']);
                    const loading = parseAmount(normRow['LOADING']);

                    // Handle variations of UN LOADING and HALTING
                    const unloading = parseAmount(normRow['UN LOADING.'] || normRow['UN LOADING'] || normRow['UNLOADING']);
                    const halt = parseAmount(normRow['HALTING'] || normRow['HALT']);

                    const fuelCost = 0; // Default as not in this Excel template
                    const driverFee = 0; // Default as not in this Excel template

                    const total = parseAmount(normRow['TOTAL']) || (freight + multiPoint + loading + unloading + halt);

                    // Handle Excel date serial numbers
                    const parseExcelDate = (val) => {
                        if (!val || String(val).trim() === '') return null;
                        if (typeof val === 'number') {
                            const excelEpoch = new Date(1899, 11, 30);
                            const jsDate = new Date(excelEpoch.getTime() + val * 86400000);
                            return jsDate.toISOString().split('T')[0];
                        }
                        if (typeof val === 'string') {
                            const trimmed = val.trim();
                            const parts = trimmed.split('.');
                            if (parts.length === 3) {
                                let year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                                return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            }
                            const slashParts = trimmed.split('/');
                            if (slashParts.length === 3) {
                                let year = slashParts[2].length === 2 ? '20' + slashParts[2] : slashParts[2];
                                return `${year}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`;
                            }
                            const dashParts = trimmed.split('-');
                            if (dashParts.length === 3 && dashParts[2].length === 4) {
                                return `${dashParts[2]}-${dashParts[1]}-${dashParts[0]}`;
                            }
                        }
                        return val;
                    };

                    dispatchDate = parseExcelDate(dispatchDate) || null;
                    dateOfArrival = parseExcelDate(dateOfArrival) || null;
                    deliveryDate = parseExcelDate(deliveryDate) || null;

                    // Check for duplicate LR number
                    if (lrNo) {
                        try {
                            const existing = await new Promise((resolve) => {
                                db.get('SELECT id FROM dispatch_records WHERE lrNo = ?', [lrNo], (err, row) => {
                                    resolve(row);
                                });
                            });
                            if (existing) {
                                skipped++;
                                await new Promise((resolve) => {
                                    db.run('INSERT INTO unsaved_records (fileName, recordIdentifier, issueDetails) VALUES (?, ?, ?)',
                                        [req.file ? req.file.originalname : 'Upload', lrNo, 'Duplicate LR number found'],
                                        () => resolve()
                                    );
                                });
                                return; // Skip this row as LR No. already exists
                            }
                        } catch (e) {
                             // silently ignore select error and proceed
                        }
                    }

                    if (dispatchDate && truckNo) {
                        try {
                            await new Promise((resolve, reject) => {
                                db.run(sql, [dispatchDate, invoiceNo, lrNo, sourceLocation, finalDestination, poNumber, tons, truckNo, dateOfArrival, deliveryDate, freight, multiPoint, loading, unloading, halt, fuelCost, driverFee, total], (err) => {
                                    if (err) {
                                        errors++;
                                        reject(err);
                                    } else {
                                        completed++;
                                        resolve();
                                    }
                                });
                            });
                        } catch (e) {
                            // Proceed with loop even if error
                        }
                    } else {
                        skipped++;
                    }
                }));
            }

            if (!res.headersSent) {
                res.json({
                    message: `Processed ${rows.length} rows`,
                    success: completed,
                    failed: errors,
                    skipped: skipped
                });
            }
        };

        processRows().catch(error => {
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to process rows sequentially.' });
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to parse Excel file: ' + (error.message || error) });
    }
});

// GET Annual Summary
router.get('/analytics/annual-summary', verifyToken, (req, res) => {
    const isPg = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
    const yearExt = isPg ? "TO_CHAR(d.dispatchDate, 'YYYY')" : "strftime('%Y', d.dispatchDate)";
    const { paymentStatus } = req.query;

    let joinClause = '';
    let statusFilter = '';

    if (paymentStatus === 'Received') {
        joinClause = 'LEFT JOIN invoice_payments ip ON d.invoiceNo = ip.invoiceNo';
        statusFilter = " AND ip.receivedStatus IS NOT NULL AND LOWER(TRIM(ip.receivedStatus)) IN ('received', 'paid', 'done', 'yes')";
    } else if (paymentStatus === 'Pending') {
        joinClause = 'LEFT JOIN invoice_payments ip ON d.invoiceNo = ip.invoiceNo';
        statusFilter = " AND (ip.receivedStatus IS NULL OR LOWER(TRIM(ip.receivedStatus)) NOT IN ('received', 'paid', 'done', 'yes'))";
    }

    const sql = `
        SELECT
            ${yearExt} as year,
            SUM(d.freight + d.loading + d.unloading + d.halt) as totalEarnings,
            SUM(d.fuelCost + d.driverFee) as totalExpenses,
            SUM(d.freight + d.loading + d.unloading + d.halt) - SUM(d.fuelCost + d.driverFee) as netProfit,
            SUM(d.total) as grandTotal,
            SUM(d.tons) as totalTons,
            COUNT(*) as totalTrips
        FROM dispatch_records d
        ${joinClause}
        WHERE 1=1 ${statusFilter}
        GROUP BY ${yearExt}
        ORDER BY year DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// GET Truck-based Earnings
router.get('/analytics/truck-earnings', verifyToken, (req, res) => {
    const isPg = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
    const yearExt = isPg ? "TO_CHAR(d.dispatchDate, 'YYYY')" : "strftime('%Y', d.dispatchDate)";
    const year = req.query.year || new Date().getFullYear().toString();
    const { paymentStatus } = req.query;

    let joinClause = '';
    let statusFilter = '';

    if (paymentStatus === 'Received') {
        joinClause = 'LEFT JOIN invoice_payments ip ON d.invoiceNo = ip.invoiceNo';
        statusFilter = " AND ip.receivedStatus IS NOT NULL AND LOWER(TRIM(ip.receivedStatus)) IN ('received', 'paid', 'done', 'yes')";
    } else if (paymentStatus === 'Pending') {
        joinClause = 'LEFT JOIN invoice_payments ip ON d.invoiceNo = ip.invoiceNo';
        statusFilter = " AND (ip.receivedStatus IS NULL OR LOWER(TRIM(ip.receivedStatus)) NOT IN ('received', 'paid', 'done', 'yes'))";
    }

    const sql = `
        SELECT
            d.truckNo as truckNumber,
            SUM(d.freight + d.loading + d.unloading + d.halt) as earnings,
            SUM(d.fuelCost + d.driverFee) as expenses,
            SUM(d.freight + d.loading + d.unloading + d.halt) - SUM(d.fuelCost + d.driverFee) as profit,
            SUM(d.total) as grandTotal,
            SUM(d.tons) as totalTons,
            COUNT(*) as trips
        FROM dispatch_records d
        ${joinClause}
        WHERE ${yearExt} = ? ${statusFilter}
        GROUP BY d.truckNo
        ORDER BY earnings DESC
    `;

    db.all(sql, [year], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// GET Monthly Earnings
router.get('/analytics/monthly-earnings', verifyToken, (req, res) => {
    const isPg = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
    const yearExt = isPg ? "TO_CHAR(d.dispatchDate, 'YYYY')" : "strftime('%Y', d.dispatchDate)";
    const monthExt = isPg ? "TO_CHAR(d.dispatchDate, 'MM')" : "strftime('%m', d.dispatchDate)";
    const year = req.query.year || new Date().getFullYear().toString();
    const { paymentStatus } = req.query;

    let joinClause = '';
    let statusFilter = '';

    if (paymentStatus === 'Received') {
        joinClause = 'LEFT JOIN invoice_payments ip ON d.invoiceNo = ip.invoiceNo';
        statusFilter = " AND ip.receivedStatus IS NOT NULL AND LOWER(TRIM(ip.receivedStatus)) IN ('received', 'paid', 'done', 'yes')";
    } else if (paymentStatus === 'Pending') {
        joinClause = 'LEFT JOIN invoice_payments ip ON d.invoiceNo = ip.invoiceNo';
        statusFilter = " AND (ip.receivedStatus IS NULL OR LOWER(TRIM(ip.receivedStatus)) NOT IN ('received', 'paid', 'done', 'yes'))";
    }

    const sql = `
        SELECT
            ${monthExt} as month,
            ${yearExt} as year,
            SUM(d.freight + d.loading + d.unloading + d.halt) as earnings,
            SUM(d.fuelCost + d.driverFee) as expenses,
            SUM(d.total) as grandTotal,
            COUNT(*) as trips
        FROM dispatch_records d
        ${joinClause}
        WHERE ${yearExt} = ? ${statusFilter}
        GROUP BY ${yearExt}, ${monthExt}
        ORDER BY month ASC
    `;

    db.all(sql, [year], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const fullData = months.map((m, i) => {
            const found = rows.find(r => r.month === m);
            return {
                month: m,
                monthName: monthNames[i],
                year: year,
                earnings: found ? found.earnings : 0,
                expenses: found ? found.expenses : 0,
                grandTotal: found ? found.grandTotal : 0,
                trips: found ? found.trips : 0
            };
        });

        res.json({ data: fullData });
    });
});

// GET all dispatch records
router.get('/dispatch-records', verifyToken, (req, res) => {
    const sql = 'SELECT * FROM dispatch_records ORDER BY invoiceNo ASC, dispatchDate DESC, id DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});
// GET Filtered Dispatch Records
router.get('/analytics/filtered-records', verifyToken, (req, res) => {
    const { truckNo, invoiceNo, dispatchDate, deliveryDate, loading, unloading, freight, year, paymentStatus } = req.query;

    let joinClause = '';
    let sql = `SELECT d.* FROM dispatch_records d `;

    if (paymentStatus === 'Received') {
        joinClause = 'LEFT JOIN invoice_payments ip ON d.invoiceNo = ip.invoiceNo ';
        sql += joinClause + "WHERE (ip.receivedStatus IS NOT NULL AND LOWER(TRIM(ip.receivedStatus)) IN ('received', 'paid', 'done', 'yes'))";
    } else if (paymentStatus === 'Pending') {
        joinClause = 'LEFT JOIN invoice_payments ip ON d.invoiceNo = ip.invoiceNo ';
        sql += joinClause + "WHERE (ip.receivedStatus IS NULL OR LOWER(TRIM(ip.receivedStatus)) NOT IN ('received', 'paid', 'done', 'yes'))";
    } else {
        sql += "WHERE 1=1";
    }

    const params = [];

    if (truckNo) {
        sql += " AND d.truckNo LIKE ?";
        params.push(`%${truckNo}%`);
    }

    if (year) {
        const isPg = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
        if (isPg) {
            sql += " AND TO_CHAR(d.dispatchDate, 'YYYY') = ?";
            params.push(year);
        } else {
            sql += " AND d.dispatchDate LIKE ?";
            params.push(`${year}%`);
        }
    }

    if (invoiceNo) {
        sql += " AND d.invoiceNo LIKE ?";
        params.push(`%${invoiceNo}%`);
    }

    if (dispatchDate) {
        const isPg = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
        if (isPg) {
            sql += " AND TO_CHAR(d.dispatchDate, 'YYYY-MM-DD') = ?";
            params.push(dispatchDate);
        } else {
            sql += " AND d.dispatchDate LIKE ?";
            params.push(`${dispatchDate}%`);
        }
    }

    if (deliveryDate) {
        const isPg = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
        if (isPg) {
            sql += " AND TO_CHAR(d.deliveryDate, 'YYYY-MM-DD') = ?";
            params.push(deliveryDate);
        } else {
            sql += " AND d.deliveryDate LIKE ?";
            params.push(`${deliveryDate}%`);
        }
    }

    if (loading) {
        sql += " AND d.loading = ?";
        params.push(parseFloat(loading));
    }

    if (unloading) {
        sql += " AND d.unloading = ?";
        params.push(parseFloat(unloading));
    }

    if (freight) {
        sql += " AND d.freight = ?";
        params.push(parseFloat(freight));
    }

    sql += " ORDER BY d.invoiceNo ASC, d.dispatchDate DESC, d.id DESC";

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching filtered records:', err.message);
            return res.status(500).json({ error: 'Failed to fetch filtered records' });
        }
        res.json({ data: rows });
    });
});

// Update a single dispatch record (Inline Edit)
router.put('/analytics/record/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { dispatchDate, invoiceNo, lrNo, poNumber, truckNo, sourceLocation, finalDestination, dateOfArrival, deliveryDate, tons, freight, multiPoint, loading, unloading, halt, fuelCost, driverFee } = req.body;

    if (lrNo) {
        try {
            const existing = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM dispatch_records WHERE lrNo = ? AND id != ?', [lrNo, id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            if (existing) {
                return res.status(400).json({ error: 'This LR number already exists.' });
            }
        } catch (err) {
            return res.status(500).json({ error: 'Database error checking LR number' });
        }
    }

    const total = Number(freight || 0) + Number(multiPoint || 0) + Number(loading || 0) + Number(unloading || 0) + Number(halt || 0);

    const checkSql = `SELECT * FROM dispatch_records WHERE id = ?`;
    const updateSql = `
        UPDATE dispatch_records
        SET dispatchDate = ?, invoiceNo = ?, lrNo = ?, poNumber = ?, truckNo = ?, sourceLocation = ?, finalDestination = ?,
            dateOfArrival = ?, deliveryDate = ?, tons = ?, freight = ?, multiPoint = ?, loading = ?, unloading = ?, halt = ?,
            fuelCost = ?, driverFee = ?, total = ?
        WHERE id = ?
    `;

    try {
        const records = await new Promise((resolve, reject) => {
            db.all(checkSql, [id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (records.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        await new Promise((resolve, reject) => {
            db.run(updateSql, [
                dispatchDate || null, invoiceNo || null, lrNo || null, poNumber || null, truckNo || null,
                sourceLocation || null, finalDestination || null, dateOfArrival || null, deliveryDate || null,
                Number(tons) || 0, Number(freight) || 0, Number(multiPoint) || 0, Number(loading) || 0, Number(unloading) || 0, Number(halt) || 0,
                Number(fuelCost) || 0, Number(driverFee) || 0, total, id
            ], function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ message: 'Record updated successfully', id, total });
    } catch (err) {
        console.error('Error updating record:', err.message);
        res.status(500).json({ error: 'Failed to update record' });
    }
});

// Bulk Delete Dispatch Records
router.delete('/analytics/filtered-records', verifyToken, async (req, res) => {
    const { ids } = req.body; // Expecting an array of IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No record IDs provided for deletion' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM dispatch_records WHERE id IN (${placeholders})`;

    try {
        await new Promise((resolve, reject) => {
            db.run(sql, ids, function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ message: `Successfully deleted ${ids.length} records.` });
    } catch (err) {
        console.error('Error bulk deleting records:', err.message);
        res.status(500).json({ error: 'Failed to delete records' });
    }
});

// DELETE All Dispatch Records
router.delete('/analytics/records/all', verifyToken, async (req, res) => {
    try {
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM dispatch_records', function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ message: 'All dispatch records successfully cleared.' });
    } catch (err) {
        console.error('Error deleting all records:', err.message);
        res.status(500).json({ error: 'Failed to delete all records.' });
    }
});

// Reset Entire Database (Orders and Dispatch Records)
router.delete('/reset-database', verifyToken, async (req, res) => {
    try {
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM orders', function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        await new Promise((resolve, reject) => {
            db.run('DELETE FROM dispatch_records', function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ message: 'Database successfully cleared.' });
    } catch (err) {
        console.error('Error resetting database:', err.message);
        res.status(500).json({ error: 'Failed to reset database.' });
    }
});

// Create a new single dispatch record (Manual Entry)
router.post('/analytics/record', verifyToken, async (req, res) => {
    const { dispatchDate, invoiceNo, lrNo, poNumber, truckNo, sourceLocation, finalDestination, dateOfArrival, deliveryDate, tons, freight, multiPoint, loading, unloading, halt, fuelCost, driverFee } = req.body;

    if (lrNo) {
        try {
            const existing = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM dispatch_records WHERE lrNo = ?', [lrNo], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            if (existing) {
                return res.status(400).json({ error: 'This LR number already exists.' });
            }
        } catch (err) {
            return res.status(500).json({ error: 'Database error checking LR number' });
        }
    }

    const total = Number(freight || 0) + Number(multiPoint || 0) + Number(loading || 0) + Number(unloading || 0) + Number(halt || 0);

    const sql = `
        INSERT INTO dispatch_records (dispatchDate, invoiceNo, lrNo, poNumber, truckNo, sourceLocation, finalDestination, dateOfArrival, deliveryDate, tons, freight, multiPoint, loading, unloading, halt, fuelCost, driverFee, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        dispatchDate || null, invoiceNo || null, lrNo || null, poNumber || null, truckNo || null,
        sourceLocation || null, finalDestination || null, dateOfArrival || null, deliveryDate || null,
        Number(tons) || 0, Number(freight) || 0, Number(multiPoint) || 0, Number(loading) || 0, Number(unloading) || 0, Number(halt) || 0,
        Number(fuelCost) || 0, Number(driverFee) || 0, total
    ], function (err) {
        if (err) {
            console.error('Error creating record:', err.message);
            return res.status(500).json({ error: `Failed to create record: ${err.message}` });
        }
        res.json({ message: 'Record created successfully', id: this.lastID, total });
    });
});

// ===== PAYMENTS ROUTES =====

// GET Basic Payments Stats
router.get('/payments/basic-stats', verifyToken, async (req, res) => {
    try {
        const expectedResult = await new Promise((resolve) => db.get('SELECT SUM(total) as expected FROM dispatch_records', [], (err, row) => resolve(row)));
        const receivedResult = await new Promise((resolve) => db.get('SELECT SUM(paymentAmount) as received FROM basic_payments', [], (err, row) => resolve(row)));

        const expected = expectedResult?.expected || 0;
        const received = receivedResult?.received || 0;
        const pending = expected - received;

        res.json({ expected, received, pending });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch basic stats' });
    }
});

// UPLOAD Basic Payments Excel
router.post('/payments/upload-basic', verifyToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) return res.json({ message: 'No data found in file', success: 0, failed: 0 });

        const sql = `INSERT INTO basic_payments (paymentDate, paymentAmount) VALUES (?, ?)`;
        let completed = 0, errors = 0, skipped = 0;

        const processRows = async () => {
             const batchSize = 25;
             for (let i = 0; i < rows.length; i += batchSize) {
                 const batch = rows.slice(i, i + batchSize);
                 await Promise.all(batch.map(async (row) => {
                    const normRow = {};
                    for (let key in row) {
                        const cleanKey = key.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
                        normRow[cleanKey] = row[key];
                    }

                    const parseAmount = (val) => {
                        if (val === undefined || val === null || val === '') return 0;
                        if (typeof val === 'number') return val;
                        const cleaned = String(val).replace(/[^0-9.-]/g, '');
                        return parseFloat(cleaned) || 0;
                    };

                    let payDate = normRow['PAYMENT RECEIVED DATE'] || normRow['DATE'] || null;
                    const payAmount = parseAmount(normRow['PAYMENT RECEIVED AMOUNT'] || normRow['AMOUNT']);

                    // Handle Excel dates robustly for Postgres
                    const parseExcelDate = (val) => {
                        if (!val || String(val).trim() === '') return null;
                        if (typeof val === 'number') {
                            const excelEpoch = new Date(1899, 11, 30);
                            const jsDate = new Date(excelEpoch.getTime() + val * 86400000);
                            return jsDate.toISOString().split('T')[0];
                        }
                        if (typeof val === 'string') {
                            const trimmed = val.trim();
                            const parts = trimmed.split('.');
                            if (parts.length === 3) {
                                let year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                                return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            }
                            const slashParts = trimmed.split('/');
                            if (slashParts.length === 3) {
                                let year = slashParts[2].length === 2 ? '20' + slashParts[2] : slashParts[2];
                                return `${year}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`;
                            }
                            const dashParts = trimmed.split('-');
                            if (dashParts.length === 3 && dashParts[2].length === 4) {
                                return `${dashParts[2]}-${dashParts[1]}-${dashParts[0]}`;
                            }
                        }
                        return val;
                    };
                    
                    payDate = parseExcelDate(payDate);

                    if (payAmount > 0) {
                        try {
                            const existing = await new Promise((resolve) => {
                                db.get('SELECT id FROM basic_payments WHERE paymentDate = ? AND paymentAmount = ?', [payDate, payAmount], (err, row) => resolve(row));
                            });
                            
                            if (existing) {
                                skipped++;
                                await new Promise((resolve) => {
                                    db.run('INSERT INTO unsaved_records (fileName, recordIdentifier, issueDetails) VALUES (?, ?, ?)',
                                        [req.file ? req.file.originalname : 'Upload', `Date: ${payDate}, Amount: ${payAmount}`, 'Duplicate Basic Payment found'],
                                        () => resolve()
                                    );
                                });
                                return;
                            }

                            await new Promise((resolve, reject) => {
                                db.run(sql, [payDate, payAmount], (err) => {
                                    if (err) { errors++; reject(err); }
                                    else { completed++; resolve(); }
                                });
                            });
                        } catch (e) {}
                    }
                 }));
             }
             if (!res.headersSent) res.json({ message: `Processed ${rows.length} rows`, success: completed, failed: errors, skipped });
        };
        processRows().catch(() => { if (!res.headersSent) res.status(500).json({ error: 'Processing error' }); });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to parse Excel file' });
    }
});

// GET Invoice Payments Stats
router.get('/payments/invoice-stats', verifyToken, async (req, res) => {
    try {
        const isPg = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
        const coalesceFunc = isPg ? 'COALESCE' : 'IFNULL';

        const result = await new Promise((resolve) => db.get(`
            SELECT 
                SUM(myRate) as totalBillValue,
                SUM(CASE WHEN LOWER(TRIM(${coalesceFunc}(receivedStatus, ''))) IN ('received', 'paid', 'done', 'yes') THEN myRate ELSE 0 END) as myRateReceived,
                SUM(CASE WHEN LOWER(TRIM(${coalesceFunc}(receivedStatus, ''))) IN ('received', 'paid', 'done', 'yes') THEN deduction ELSE 0 END) as deductionReceived,
                SUM(CASE WHEN LOWER(TRIM(${coalesceFunc}(receivedStatus, ''))) NOT IN ('received', 'paid', 'done', 'yes') THEN myRate ELSE 0 END) as yetToReceive,
                SUM(nipponRate) as nipponRateSum,
                SUM(tds) as tds,
                SUM(totalReceived) as totalReceived 
            FROM invoice_payments`, [],
        (err, row) => resolve(row)));

        const groupByCollate = isPg ? '' : 'COLLATE NOCASE';
        const receivedStatusCounts = await new Promise((resolve) => db.all(`
            SELECT receivedStatus, COUNT(*) as count 
            FROM invoice_payments 
            GROUP BY receivedStatus ${groupByCollate}`, [], 
        (err, rows) => resolve(rows || [])));
        
        let receivedCount = 0;
        let notReceivedCount = 0;
        
        receivedStatusCounts.forEach(row => {
            const status = (row.receivedStatus || '').toString().toLowerCase().trim();
            if (status === 'received' || status === 'paid' || status === 'done' || status === 'yes') {
                receivedCount += row.count;
            } else {
                notReceivedCount += row.count; // "not received", "pending", blank, etc.
            }
        });

        const totalBillValue = result?.totalBillValue || 0;
        const nipponRateSum = result?.nipponRateSum || 0;
        const totalAmountReceived = result?.myRateReceived || 0;
        const totalAmountDeducted = result?.deductionReceived || 0;
        const yetToReceive = result?.yetToReceive || 0;
        const tds = result?.tds || 0;
        const totalReceived = result?.totalReceived || 0;
        // Balance = total expected myRate - totalReceived? Or balance = yetToReceive?
        // Original logic: totalBalance = myRate - totalReceived
        // Updated to sum of Invoice Pending (Yet to Receive) and TDS pending
        const totalBalance = yetToReceive + tds;

        res.json({ totalBillValue, nipponRateSum, totalAmountReceived, totalAmountDeducted, yetToReceive, tds, totalReceived, totalBalance, receivedCount, notReceivedCount });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch invoice stats' });
    }
});

// UPLOAD Invoice Payments Excel
router.post('/payments/upload-invoice', verifyToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) return res.json({ message: 'No data found in file', success: 0, failed: 0 });

        const sql = `INSERT INTO invoice_payments (invoiceNo, myRate, nipponRate, tds, totalReceived, deduction, receivedStatus, paymentDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        let completed = 0, errors = 0, skipped = 0;

        const processRows = async () => {
             const batchSize = 25;
             for (let i = 0; i < rows.length; i += batchSize) {
                 const batch = rows.slice(i, i + batchSize);
                 await Promise.all(batch.map(async (row) => {
                    const normRow = {};
                    for (let key in row) {
                        const cleanKey = key.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
                        normRow[cleanKey] = row[key];
                    }

                    const parseAmount = (val) => {
                        if (val === undefined || val === null || val === '') return 0;
                        if (typeof val === 'number') return val;
                        const cleaned = String(val).replace(/[^0-9.-]/g, '');
                        return parseFloat(cleaned) || 0;
                    };

                    const invoiceNo = normRow['INVOICE NO'] || normRow['INVOICENO'] || '';
                    const myRate = parseAmount(normRow['MY RATE']);
                    const nipponRate = parseAmount(normRow['NIPPON RATE']);
                    const tds = parseAmount(normRow['TDS']);
                    const totalReceived = parseAmount(normRow['TOTAL RECEIVED']);
                    const deduction = parseAmount(normRow['DEDUCTION']);
                    const receivedStatus = normRow['RECEIVED STATUS'] || normRow['STATUS'] || '';
                    let payDate = normRow['PAYMENT DATE'] || normRow['PAYMENTDATE'] || normRow['DATE'] || null;

                    // Handle Excel dates robustly for Postgres
                    const parseExcelDate = (val) => {
                        if (!val || String(val).trim() === '') return null;
                        if (typeof val === 'number') {
                            const excelEpoch = new Date(1899, 11, 30);
                            const jsDate = new Date(excelEpoch.getTime() + val * 86400000);
                            return jsDate.toISOString().split('T')[0];
                        }
                        if (typeof val === 'string') {
                            const trimmed = val.trim();
                            const parts = trimmed.split('.');
                            if (parts.length === 3) {
                                let year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                                return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            }
                            const slashParts = trimmed.split('/');
                            if (slashParts.length === 3) {
                                let year = slashParts[2].length === 2 ? '20' + slashParts[2] : slashParts[2];
                                return `${year}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`;
                            }
                            const dashParts = trimmed.split('-');
                            if (dashParts.length === 3 && dashParts[2].length === 4) {
                                return `${dashParts[2]}-${dashParts[1]}-${dashParts[0]}`;
                            }
                        }
                        return val;
                    };
                    
                    payDate = parseExcelDate(payDate);

                    if (invoiceNo) {
                        try {
                            const existing = await new Promise((resolve) => {
                                db.get('SELECT id FROM invoice_payments WHERE invoiceNo = ?', [invoiceNo], (err, row) => resolve(row));
                            });

                            if (existing) {
                                skipped++;
                                await new Promise((resolve) => {
                                    db.run('INSERT INTO unsaved_records (fileName, recordIdentifier, issueDetails) VALUES (?, ?, ?)',
                                        [req.file ? req.file.originalname : 'Upload', invoiceNo, 'Duplicate Invoice number found'],
                                        () => resolve()
                                    );
                                });
                                return;
                            }

                            await new Promise((resolve, reject) => {
                                db.run(sql, [invoiceNo, myRate, nipponRate, tds, totalReceived, deduction, receivedStatus, payDate], (err) => {
                                    if (err) { errors++; reject(err); }
                                    else { completed++; resolve(); }
                                });
                            });
                        } catch (e) {}
                    }
                 }));
             }
             if (!res.headersSent) {
                 const dupMsg = skipped > 0 ? ` (${skipped} duplicates logged to unsaved records)` : '';
                 res.json({ message: `Saved ${completed} rows${dupMsg}.`, success: completed, failed: errors, skipped: skipped });
             }
        };
        processRows().catch(() => { if (!res.headersSent) res.status(500).json({ error: 'Processing error' }); });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to parse Excel file' });
    }
});

// GET All Invoice Payments
router.get('/payments/invoices', verifyToken, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;

    let baseSql = `FROM invoice_payments`;
    let countSql = `SELECT COUNT(*) as total ${baseSql}`;
    let dataSql = `SELECT * ${baseSql}`;
    let params = [];

    if (search) {
        let condition = ` WHERE invoiceNo LIKE ? OR receivedStatus LIKE ?`;
        countSql += condition;
        dataSql += condition;
        params = [search, search];
    }

    dataSql += ` ORDER BY invoiceNo ASC, paymentDate DESC, id DESC LIMIT ? OFFSET ?`;

    db.get(countSql, params, (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all(dataSql, [...params, limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
                data: rows,
                pagination: {
                    total: countRow.total,
                    page,
                    limit,
                    totalPages: Math.ceil(countRow.total / limit)
                }
            });
        });
    });
});

// PUT Update Invoice Payment
router.put('/payments/invoices/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { invoiceNo, myRate, nipponRate, tds, totalReceived, deduction, receivedStatus, paymentDate } = req.body;

    const sql = `
        UPDATE invoice_payments 
        SET invoiceNo = ?, myRate = ?, nipponRate = ?, tds = ?, totalReceived = ?, deduction = ?, receivedStatus = ?, paymentDate = ?
        WHERE id = ?
    `;

    db.run(sql, [invoiceNo, myRate, nipponRate, tds, totalReceived, deduction, receivedStatus, paymentDate, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Invoice not found' });
        res.json({ message: 'Invoice updated successfully' });
    });
});

// DELETE Invoice Payments (Bulk or Single)
router.delete('/payments/invoices', verifyToken, (req, res) => {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided for deletion' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM invoice_payments WHERE id IN (${placeholders})`;

    db.run(sql, ids, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Successfully deleted ${this.changes} invoice(s)` });
    });
});

// DELETE All Invoice Payments
router.delete('/payments/invoices/all', verifyToken, (req, res) => {
    db.run(`DELETE FROM invoice_payments`, [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Successfully deleted all invoice records` });
    });
});

// GET Unsaved Records
router.get('/analytics/unsaved-records', verifyToken, (req, res) => {
    const sql = `SELECT * FROM unsaved_records ORDER BY uploadDate DESC LIMIT 100`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// Contact form email mock route
router.post('/contact', async (req, res) => {
    const { name, email, mobile, subject, message } = req.body;

    console.log('--- NEW CONTACT FORM SUBMISSION ---');
    console.log(`From: ${name || 'N/A'} <${email}>`);
    console.log(`Mobile: ${mobile}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    console.log('Attempting to send email via Nodemailer...');
    console.log('-----------------------------------');

    // Make sure we have credentials configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('EMAIL_USER or EMAIL_PASS not set in environment. Skipping actual email delivery.');
        return res.json({
            success: true,
            message: 'Your message was received (Delivered to logs only - missing email setup).'
        });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'ponniammantransport2023@gmail.com', // Destination email
            replyTo: email,
            subject: `New Contact Form Submission: ${subject}`,
            text: `You have received a new message from the contact form.\n\nName: ${name}\nEmail: ${email}\nMobile: ${mobile}\nSubject: ${subject}\nMessage:\n${message}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #10b981;">New Contact Form Submission</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Mobile:</strong> ${mobile}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Message:</strong></p>
                    <div style="background: #f4fdf4; padding: 15px; border-left: 4px solid #10b981; margin-top: 10px;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email successfully sent:', info.messageId);

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Nodemailer Error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message via email server' });
    }
});

export default router;
