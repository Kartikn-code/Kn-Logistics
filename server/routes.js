import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import XLSX from 'xlsx';
import db from './database.js';

const router = express.Router();

// Configure Multer for file upload
const upload = multer({ dest: 'uploads/' });

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
    fs.createReadStream(req.file.path)
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
                fs.unlinkSync(req.file.path);
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
                            // Clean up file
                            fs.unlinkSync(req.file.path);
                            // Avoid sending response multiple times or if headers sent
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
                        fs.unlinkSync(req.file.path);
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
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.json({ message: 'No data found in file', success: 0, failed: 0 });
        }

        const sql = `INSERT INTO dispatch_records (dispatchDate, lrNo, sourceLocation, finalDestination, poNumber, tons, truckNo, freight, loading, unloading, halt, fuelCost, driverFee, total)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        let completed = 0;
        let errors = 0;
        let skipped = 0;

        rows.forEach((row) => {
            // Flexible column name matching
            let dispatchDate = row['Dispatch Date'] || row['dispatch date'] || row.DispatchDate || row.dispatchDate || row.Date || row.date || '';
            const lrNo = row['Lr No'] || row['LR No'] || row['lr no'] || row.LrNo || row.lrNo || '';
            const sourceLocation = row['Source Location'] || row['source location'] || row.SourceLocation || row.sourceLocation || row.Source || '';
            const finalDestination = row['Final Destination'] || row['final destination'] || row.FinalDestination || row.finalDestination || row.Destination || '';
            const poNumber = row['Po Number'] || row['PO Number'] || row['po number'] || row.PoNumber || row.poNumber || '';
            const tons = parseFloat(row.Tons || row.tons || row.TONS || 0) || 0;
            const truckNo = row['Truck  No'] || row['Truck No'] || row['truck no'] || row.TruckNo || row.truckNo || row['Truck Number'] || '';
            const freight = parseFloat(row.Freight || row.freight || row.FREIGHT || 0) || 0;
            const loading = parseFloat(row.Loading || row.loading || row.LOADING || 0) || 0;
            const unloading = parseFloat(row.Unloading || row.unloading || row.UNLOADING || 0) || 0;
            const halt = parseFloat(row.Halt || row.halt || row.HALT || 0) || 0;
            const fuelCost = parseFloat(row['Fuel Cost'] || row.fuelCost || row.FuelCost || 0) || 0;
            const driverFee = parseFloat(row['Driver Fee'] || row.driverFee || row.DriverFee || 0) || 0;
            const total = parseFloat(row.Total || row.total || row.TOTAL || 0) || (freight + loading + unloading + halt);

            // Handle Excel date serial numbers
            if (typeof dispatchDate === 'number') {
                const excelEpoch = new Date(1899, 11, 30);
                const jsDate = new Date(excelEpoch.getTime() + dispatchDate * 86400000);
                dispatchDate = jsDate.toISOString().split('T')[0];
            }

            if (dispatchDate && truckNo) {
                db.run(sql, [dispatchDate, lrNo, sourceLocation, finalDestination, poNumber, tons, truckNo, freight, loading, unloading, halt, fuelCost, driverFee, total], (err) => {
                    if (err) errors++;
                    completed++;

                    if (completed + skipped === rows.length && !res.headersSent) {
                        fs.unlinkSync(req.file.path);
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
                    fs.unlinkSync(req.file.path);
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
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: 'Failed to parse Excel file: ' + error.message });
    }
});

// GET Annual Summary
router.get('/analytics/annual-summary', (req, res) => {
    const sql = `
        SELECT
            strftime('%Y', dispatchDate) as year,
            SUM(freight + loading + unloading + halt) as totalEarnings,
            SUM(fuelCost + driverFee) as totalExpenses,
            SUM(freight + loading + unloading + halt) - SUM(fuelCost + driverFee) as netProfit,
            SUM(total) as grandTotal,
            SUM(tons) as totalTons,
            COUNT(*) as totalTrips
        FROM dispatch_records
        GROUP BY strftime('%Y', dispatchDate)
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
        WHERE strftime('%Y', dispatchDate) = ?
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
    const year = req.query.year || new Date().getFullYear().toString();
    const sql = `
        SELECT
            strftime('%m', dispatchDate) as month,
            strftime('%Y', dispatchDate) as year,
            SUM(freight + loading + unloading + halt) as earnings,
            SUM(fuelCost + driverFee) as expenses,
            SUM(total) as grandTotal,
            COUNT(*) as trips
        FROM dispatch_records
        WHERE strftime('%Y', dispatchDate) = ?
        GROUP BY strftime('%m', dispatchDate)
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
    const { truckType, month, year, sourceLocation, minRevenue, maxRevenue, orderId } = req.query;

    let sql = `SELECT * FROM dispatch_records WHERE 1=1`;
    const params = [];

    if (truckType) {
        // We'll join or match Orders if "truckType" means 10-wheeler etc, 
        // but simple dispatch_records only has truckNo. We'll search truckNo if provided.
        sql += " AND truckNo LIKE ?";
        params.push(`%${truckType}%`);
    }

    if (year) {
        sql += " AND strftime('%Y', dispatchDate) = ?";
        params.push(year);
    }

    if (month) {
        sql += " AND strftime('%m', dispatchDate) = ?";
        // Ensure month is two digits
        params.push(month.padStart(2, '0'));
    }

    if (sourceLocation) {
        sql += " AND sourceLocation LIKE ?";
        params.push(`%${sourceLocation}%`);
    }

    if (minRevenue) {
        sql += " AND (freight + loading + unloading + halt) >= ?";
        params.push(parseFloat(minRevenue));
    }

    if (maxRevenue) {
        sql += " AND (freight + loading + unloading + halt) <= ?";
        params.push(parseFloat(maxRevenue));
    }

    sql += " ORDER BY dispatchDate DESC LIMIT 500";

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

export default router;
