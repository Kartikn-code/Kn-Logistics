import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import XLSX from 'xlsx';
import db from './database.js';

const router = express.Router();

// Configure Multer for file upload (Memory Storage for Vercel)
const upload = multer({ storage: multer.memoryStorage() });

// GET all active orders
router.get('/orders', (req, res) => {
    const sql = 'SELECT * FROM orders ORDER BY timestamp DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// GET dashboard stats
router.get('/stats', (req, res) => {
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
router.get('/orders/:id', (req, res) => {
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
router.delete('/orders', async (req, res) => {
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
router.post('/orders', (req, res) => {
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
router.post('/upload', upload.single('file'), (req, res) => {
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
router.post('/upload-financial', upload.single('file'), (req, res) => {
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

        rows.forEach((row) => {
            // Normalize row keys to handle line breaks and spaces in Excel headers
            const normRow = {};
            for (let key in row) {
                normRow[key.replace(/[\n\r]+/g, '').toUpperCase().trim()] = row[key];
            }

            let dispatchDate = normRow['DISPATCH - DATE'] || normRow['DISPATCH-DATE'] || normRow['DISPATCH DATE'] || normRow['DISPATCHDATE'] || normRow['DATE'] || '';
            const invoiceNo = normRow['INVOICE NO'] || normRow['INVOICE.NO'] || normRow['INVOICE NO.'] || normRow['INVOICENO.'] || normRow['INVOICENO'] || '';
            const lrNo = normRow['LR. NO'] || normRow['LR.NO'] || normRow['LR NO'] || normRow['LRNO'] || '';
            const sourceLocation = normRow['FROM'] || normRow['SOURCELOCATION'] || normRow['SOURCE'] || '';
            const finalDestination = normRow['TO'] || normRow['FINALDESTINATION'] || normRow['DESTINATION'] || '';
            const poNumber = normRow['PO.NUMBER'] || normRow['PO NUMBER'] || normRow['PONUMBER'] || '';
            const tons = parseFloat(normRow['TONS'] || normRow['WEIGHT']) || 0;
            const truckNo = normRow['TRUCK.NO'] || normRow['TRUCK NO'] || normRow['TRUCKNO'] || normRow['VEHICLENO'] || '';

            let dateOfArrival = normRow['DATE OF ARRIVAL'] || normRow['DATEOFARRIVAL'] || normRow['ARRIVALDATE'] || '';
            let deliveryDate = normRow['DATE OF DELIVERY'] || normRow['DATEOFDELIVERY'] || normRow['DELIVERYDATE'] || '';

            const freight = parseFloat(normRow['FREIGHT']) || 0;
            const multiPoint = parseFloat(normRow['MULTI- POINT'] || normRow['MULTI-POINT'] || normRow['MULTIPOINT']) || 0;
            const loading = parseFloat(normRow['LOADING']) || 0;

            // Handle variations of UN LOADING and HALTING
            const unloading = parseFloat(normRow['UN LOADING.'] || normRow['UN LOADING'] || normRow['UNLOADING']) || 0;
            const halt = parseFloat(normRow['HALTING'] || normRow['HALT']) || 0;

            const fuelCost = 0; // Default as not in this Excel template
            const driverFee = 0; // Default as not in this Excel template

            const total = parseFloat(normRow['TOTAL']) || (freight + multiPoint + loading + unloading + halt);

            // Handle Excel date serial numbers
            const parseExcelDate = (val) => {
                if (!val) return val;
                if (typeof val === 'number') {
                    const excelEpoch = new Date(1899, 11, 30);
                    const jsDate = new Date(excelEpoch.getTime() + val * 86400000);
                    return jsDate.toISOString().split('T')[0];
                }

                // Convert typical DD.MM.YY or DD.MM.YYYY to YYYY-MM-DD
                if (typeof val === 'string') {
                    const parts = val.split('.');
                    if (parts.length === 3) {
                        let year = parts[2];
                        let month = parts[1].padStart(2, '0');
                        let day = parts[0].padStart(2, '0');
                        if (year.length === 2) {
                            year = '20' + year; // Assuming 2000s
                        }
                        return `${year}-${month}-${day}`;
                    }

                    const slashParts = val.split('/');
                    if (slashParts.length === 3) {
                        let year = slashParts[2];
                        let month = slashParts[1].padStart(2, '0');
                        let day = slashParts[0].padStart(2, '0');
                        if (year.length === 2) {
                            year = '20' + year; // Assuming 2000s
                        }
                        return `${year}-${month}-${day}`;
                    }
                }
                return val;
            };

            dispatchDate = parseExcelDate(dispatchDate) || null;
            dateOfArrival = parseExcelDate(dateOfArrival) || null;
            deliveryDate = parseExcelDate(deliveryDate) || null;

            if (dispatchDate && truckNo) {
                db.run(sql, [dispatchDate, invoiceNo, lrNo, sourceLocation, finalDestination, poNumber, tons, truckNo, dateOfArrival, deliveryDate, freight, multiPoint, loading, unloading, halt, fuelCost, driverFee, total], (err) => {
                    if (err) errors++;
                    completed++;

                    if (completed + skipped === rows.length && !res.headersSent) {
                        res.json({
                            message: `Processed ${rows.length} rows`,
                            success: completed - errors,
                            failed: errors,
                            skipped: skipped
                        });
                    }
                });
            } else {
                skipped++;
                if (completed + skipped === rows.length && !res.headersSent) {
                    res.json({
                        message: `Processed ${rows.length} rows`,
                        success: completed - errors,
                        failed: errors,
                        skipped: skipped
                    });
                }
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to parse Excel file: ' + (error.message || error) });
    }
});

// GET Annual Summary
router.get('/analytics/annual-summary', (req, res) => {
    const isPg = !!process.env.DATABASE_URL;
    const yearExt = isPg ? "TO_CHAR(dispatchDate, 'YYYY')" : "strftime('%Y', dispatchDate)";

    const sql = `
        SELECT
            ${yearExt} as year,
            SUM(freight + loading + unloading + halt) as totalEarnings,
            SUM(fuelCost + driverFee) as totalExpenses,
            SUM(freight + loading + unloading + halt) - SUM(fuelCost + driverFee) as netProfit,
            SUM(total) as grandTotal,
            SUM(tons) as totalTons,
            COUNT(*) as totalTrips
        FROM dispatch_records
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
router.get('/analytics/truck-earnings', (req, res) => {
    const isPg = !!process.env.DATABASE_URL;
    const yearExt = isPg ? "TO_CHAR(dispatchDate, 'YYYY')" : "strftime('%Y', dispatchDate)";
    const year = req.query.year || new Date().getFullYear().toString();
    const sql = `
        SELECT
            truckNo as truckNumber,
            SUM(freight + loading + unloading + halt) as earnings,
            SUM(fuelCost + driverFee) as expenses,
            SUM(freight + loading + unloading + halt) - SUM(fuelCost + driverFee) as profit,
            SUM(total) as grandTotal,
            SUM(tons) as totalTons,
            COUNT(*) as trips
        FROM dispatch_records
        WHERE ${yearExt} = ?
        GROUP BY truckNo
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
router.get('/analytics/monthly-earnings', (req, res) => {
    const isPg = !!process.env.DATABASE_URL;
    const yearExt = isPg ? "TO_CHAR(dispatchDate, 'YYYY')" : "strftime('%Y', dispatchDate)";
    const monthExt = isPg ? "TO_CHAR(dispatchDate, 'MM')" : "strftime('%m', dispatchDate)";
    const year = req.query.year || new Date().getFullYear().toString();
    const sql = `
        SELECT
            ${monthExt} as month,
            ${yearExt} as year,
            SUM(freight + loading + unloading + halt) as earnings,
            SUM(fuelCost + driverFee) as expenses,
            SUM(total) as grandTotal,
            COUNT(*) as trips
        FROM dispatch_records
        WHERE ${yearExt} = ?
        GROUP BY ${monthExt}
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
router.get('/dispatch-records', (req, res) => {
    const sql = 'SELECT * FROM dispatch_records ORDER BY dispatchDate DESC LIMIT 200';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});
// GET Filtered Dispatch Records
router.get('/analytics/filtered-records', (req, res) => {
    const { truckNo, invoiceNo, dispatchDate, deliveryDate, loading, unloading, freight, year } = req.query;

    let sql = `SELECT * FROM dispatch_records WHERE 1=1`;
    const params = [];

    if (truckNo) {
        sql += " AND truckNo LIKE ?";
        params.push(`%${truckNo}%`);
    }

    if (year) {
        sql += " AND dispatchDate LIKE ?";
        params.push(`${year}%`);
    }

    if (invoiceNo) {
        sql += " AND invoiceNo LIKE ?";
        params.push(`%${invoiceNo}%`);
    }

    if (dispatchDate) {
        sql += " AND dispatchDate = ?";
        params.push(dispatchDate);
    }

    if (deliveryDate) {
        sql += " AND deliveryDate = ?";
        params.push(deliveryDate);
    }

    if (loading) {
        sql += " AND loading = ?";
        params.push(parseFloat(loading));
    }

    if (unloading) {
        sql += " AND unloading = ?";
        params.push(parseFloat(unloading));
    }

    if (freight) {
        sql += " AND freight = ?";
        params.push(parseFloat(freight));
    }

    sql += " ORDER BY dispatchDate DESC LIMIT 500";

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching filtered records:', err.message);
            return res.status(500).json({ error: 'Failed to fetch filtered records' });
        }
        res.json({ data: rows });
    });
});

// Update a single dispatch record (Inline Edit)
router.put('/analytics/record/:id', async (req, res) => {
    const { id } = req.params;
    const { dispatchDate, invoiceNo, lrNo, poNumber, truckNo, sourceLocation, finalDestination, dateOfArrival, deliveryDate, tons, freight, multiPoint, loading, unloading, halt, fuelCost, driverFee } = req.body;

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
router.delete('/analytics/filtered-records', async (req, res) => {
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

// Reset Entire Database (Orders and Dispatch Records)
router.delete('/reset-database', async (req, res) => {
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
router.post('/analytics/record', async (req, res) => {
    const { dispatchDate, invoiceNo, lrNo, poNumber, truckNo, sourceLocation, finalDestination, dateOfArrival, deliveryDate, tons, freight, multiPoint, loading, unloading, halt, fuelCost, driverFee } = req.body;

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

// Contact form email mock route
router.post('/contact', (req, res) => {
    const { name, email, mobile, subject, message } = req.body;

    // In a production app, you would use Nodemailer or an SMTP service like SendGrid here.
    console.log('--- NEW CONTACT FORM SUBMISSION ---');
    console.log(`From: ${name || 'N/A'} <${email}>`);
    console.log(`Mobile: ${mobile}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    console.log('Sending email to: ponniammantransport2023@gmail.com');
    console.log('-----------------------------------');

    res.json({ success: true, message: 'Message sent successfully' });
});

export default router;
