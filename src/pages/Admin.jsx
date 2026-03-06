import { useState, useEffect } from 'react';
import { Upload, Plus, RefreshCw, FileText, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { createOrder, uploadOrders, uploadFinancialData, getOrders, resetDatabase } from '../utils/api';
import styles from './Admin.module.css';

const Admin = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [file, setFile] = useState(null);
    const [financialFile, setFinancialFile] = useState(null);
    const [financialStatus, setFinancialStatus] = useState(null);

    // Manual Entry Form State
    const [formData, setFormData] = useState({
        orderId: '',
        truckNumber: '',
        truckType: '10-Wheeler',
        status: 'Loading',
        currentLocation: ''
    });

    const fetchOrders = async () => {
        setLoading(true);
        const data = await getOrders();
        setOrders(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createOrder(formData);
            setUploadStatus({ type: 'success', message: 'Order created successfully!' });
            setFormData({
                orderId: '',
                truckNumber: '',
                truckType: '10-Wheeler',
                status: 'Loading',
                currentLocation: ''
            });
            fetchOrders();
        } catch (error) {
            setUploadStatus({ type: 'error', message: 'Failed to create order.' });
        }
        setLoading(false);
        setTimeout(() => setUploadStatus(null), 3000);
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleFileUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const result = await uploadOrders(file);
            setUploadStatus({ type: 'success', message: result.message || 'File processed successfully!' });
            setFile(null);
            fetchOrders();
        } catch (error) {
            setUploadStatus({ type: 'error', message: 'File upload failed.' });
        }
        setLoading(false);
        setTimeout(() => setUploadStatus(null), 3000);
    };

    const handleFinancialFileChange = (e) => {
        if (e.target.files) {
            setFinancialFile(e.target.files[0]);
        }
    };

    const handleFinancialUpload = async () => {
        if (!financialFile) return;
        setLoading(true);
        try {
            const result = await uploadFinancialData(financialFile);
            setFinancialStatus({
                type: 'success',
                message: `${result.message} — ✅ ${result.success} success, ❌ ${result.failed} failed, ⏭ ${result.skipped || 0} skipped`
            });
            setFinancialFile(null);
            // Reset file input
            const input = document.getElementById('financialFileUpload');
            if (input) input.value = '';
        } catch (error) {
            setFinancialStatus({ type: 'error', message: 'Financial file upload failed.' });
        }
        setLoading(false);
        setTimeout(() => setFinancialStatus(null), 5000);
    };

    const handleResetData = async () => {
        if (!window.confirm("WARNING: Are you sure you want to delete ALL data permanently? This action cannot be undone.")) return;

        const secondConfirm = window.confirm("Final check: Click 'OK' to PERMANENTLY erase the entire database.");
        if (!secondConfirm) return;

        setLoading(true);
        try {
            await resetDatabase();
            setFinancialStatus({ type: 'success', message: 'All database records have been deleted.' });
            fetchOrders();
        } catch (error) {
            setFinancialStatus({ type: 'error', message: 'Failed to reset database.' });
        }
        setLoading(false);
        setTimeout(() => setFinancialStatus(null), 5000);
    };

    return (
        <div className={styles.adminPage}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1>Admin Dashboard</h1>
                    <p>Manage fleet and orders manually or via bulk upload.</p>
                </header>

                <div className={styles.grid}>
                    {/* Manual Entry */}
                    <Card className={styles.card}>
                        <h3><Plus size={20} /> Manual Entry</h3>
                        <form onSubmit={handleManualSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Order ID</label>
                                <input
                                    type="text"
                                    name="orderId"
                                    value={formData.orderId}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="e.g., KN-2024-001"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Truck Number</label>
                                <input
                                    type="text"
                                    name="truckNumber"
                                    value={formData.truckNumber}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="TN-45-AA-1234"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Truck Type</label>
                                <select name="truckType" value={formData.truckType} onChange={handleInputChange}>
                                    <option value="6-Wheeler">6-Wheeler</option>
                                    <option value="10-Wheeler">10-Wheeler</option>
                                    <option value="12-Wheeler">12-Wheeler</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Status</label>
                                <select name="status" value={formData.status} onChange={handleInputChange}>
                                    <option value="Loading">Loading</option>
                                    <option value="In Transit">In Transit</option>
                                    <option value="Near Destination">Near Destination</option>
                                    <option value="Delivered">Delivered</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Current Location</label>
                                <input
                                    type="text"
                                    name="currentLocation"
                                    value={formData.currentLocation}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="City, State"
                                />
                            </div>
                            <Button type="submit" disabled={loading} className={styles.submitBtn}>
                                {loading ? 'Saving...' : 'Create Order'}
                            </Button>
                        </form>
                    </Card>

                    {/* Bulk Upload */}
                    <Card className={styles.card}>
                        <h3><Upload size={20} /> Bulk Upload</h3>
                        <div className={styles.uploadArea}>
                            <FileText size={48} className={styles.uploadIcon} />
                            <p>Upload CSV or Excel file with Order details.</p>
                            <input
                                type="file"
                                accept=".csv, .xlsx"
                                onChange={handleFileChange}
                                id="fileUpload"
                                className={styles.fileInput}
                            />
                            <label htmlFor="fileUpload" className={styles.fileLabel}>
                                {file ? file.name : 'Choose File'}
                            </label>
                            <Button
                                onClick={handleFileUpload}
                                disabled={!file || loading}
                                variant="secondary"
                                className={styles.uploadBtn}
                            >
                                Upload & Process
                            </Button>
                        </div>
                        {uploadStatus && (
                            <div className={`${styles.status} ${styles[uploadStatus.type]}`}>
                                {uploadStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                {uploadStatus.message}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Financial Data Upload Section */}
                <div className={styles.financialSection}>
                    <Card className={styles.financialCard}>
                        <div className={styles.financialHeader}>
                            <div className={styles.financialTitleRow}>
                                <div className={styles.financialIcon}>
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <h3>Dispatch Data Upload</h3>
                                    <p>Upload Excel file (.xlsx) with dispatch & freight records</p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.expectedFormat}>
                            <h4>Expected Excel Columns:</h4>
                            <div className={styles.columnTags}>
                                <span className={styles.tag}>Dispatch Date</span>
                                <span className={styles.tag}>Lr No</span>
                                <span className={styles.tag}>Source Location</span>
                                <span className={styles.tag}>Final Destination</span>
                                <span className={styles.tag}>Po Number</span>
                                <span className={`${styles.tag} ${styles.tagEarning}`}>Tons</span>
                                <span className={styles.tag}>Truck No</span>
                                <span className={`${styles.tag} ${styles.tagAmount}`}>Freight</span>
                                <span className={styles.tag}>Loading</span>
                                <span className={styles.tag}>Unloading</span>
                                <span className={styles.tag}>Halt</span>
                                <span className={`${styles.tag} ${styles.tagAmount}`}>Fuel Cost</span>
                                <span className={`${styles.tag} ${styles.tagAmount}`}>Driver Fee</span>
                                <span className={`${styles.tag} ${styles.tagAmount}`}>Total</span>
                            </div>
                        </div>

                        <div className={styles.financialUploadArea}>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFinancialFileChange}
                                id="financialFileUpload"
                                className={styles.fileInput}
                            />
                            <label htmlFor="financialFileUpload" className={styles.financialFileLabel}>
                                <Upload size={20} />
                                {financialFile ? financialFile.name : 'Select Excel File (.xlsx)'}
                            </label>
                            <Button
                                onClick={handleFinancialUpload}
                                disabled={!financialFile || loading}
                                className={styles.financialUploadBtn}
                            >
                                {loading ? 'Processing...' : '📊 Upload & Import'}
                            </Button>
                        </div>

                        {financialStatus && (
                            <div className={`${styles.status} ${styles[financialStatus.type]}`}>
                                {financialStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                {financialStatus.message}
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                            <h4 style={{ color: 'var(--color-danger)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Danger Zone</h4>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                This will permanently erase all dispatch, freight, and fleet tracking records from the database.
                            </p>
                            <Button
                                variant="outline"
                                onClick={handleResetData}
                                disabled={loading}
                                style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                            >
                                Delete All Data
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Recent Orders Table */}
                <div className={styles.tableSection}>
                    <div className={styles.tableHeader}>
                        <h2>Recent Orders</h2>
                        <Button variant="outline" size="sm" onClick={fetchOrders}><RefreshCw size={16} /> Refresh</Button>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Truck No.</th>
                                    <th>Status</th>
                                    <th>Location</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length > 0 ? (
                                    orders.map((order) => (
                                        <tr key={order.orderId}>
                                            <td>{order.orderId}</td>
                                            <td>{order.truckNumber}</td>
                                            <td>
                                                <span className={`${styles.badge} ${styles[order.status.toLowerCase().replace(' ', '')]}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td>{order.currentLocation}</td>
                                            <td>{new Date(order.timestamp).toLocaleString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No orders found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;
