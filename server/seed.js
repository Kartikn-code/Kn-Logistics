import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const trucks = ['TN-12-AB-3456', 'TN-01-XY-9876', 'KA-05-MN-1122', 'KL-07-CD-5544', 'MH-02-EF-3322'];
const sources = ['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem'];
const destinations = ['Bangalore', 'Hyderabad', 'Mumbai', 'Pune', 'Kochi'];

const generateSampleData = () => {
    const defaultQuery = `INSERT INTO dispatch_records (dispatchDate, lrNo, sourceLocation, finalDestination, poNumber, tons, truckNo, freight, loading, unloading, halt, fuelCost, driverFee, total) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    let completed = 0;
    for (let i = 1; i <= 100; i++) {
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const date = `2024-${month}-${day}`;
        const lrNo = `LR-2024-${i.toString().padStart(4, '0')}`;
        const source = sources[Math.floor(Math.random() * sources.length)];
        const dest = destinations[Math.floor(Math.random() * destinations.length)];
        const truck = trucks[Math.floor(Math.random() * trucks.length)];
        const po = `PO-${Math.floor(Math.random() * 10000)}`;

        const tons = (Math.random() * 20 + 5).toFixed(1);
        const freight = Math.floor(Math.random() * 50000) + 20000;
        const loading = Math.floor(Math.random() * 5000);
        const unloading = Math.floor(Math.random() * 5000);
        const halt = Math.floor(Math.random() * 3000);

        const fuelCost = Math.floor(Math.random() * 30000) + 10000;
        const driverFee = Math.floor(Math.random() * 10000) + 3000;

        const total = freight + loading + unloading + halt;

        db.run(defaultQuery, [date, lrNo, source, dest, po, tons, truck, freight, loading, unloading, halt, fuelCost, driverFee, total], (err) => {
            if (err) console.error("Error inserting data:", err);
            completed++;
            if (completed === 100) {
                console.log("Successfully inserted 100 sample records for testing!");
            }
        });
    }
};

db.serialize(() => {
    // Optional: db.run("DELETE FROM dispatch_records"); // Uncomment if you want to clear old testing data
    generateSampleData();
});
