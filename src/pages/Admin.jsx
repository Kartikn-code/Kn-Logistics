import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, FileText, CheckCircle, AlertCircle, DollarSign, Trash2, Search, Bell, Edit2, X, Save, UserPlus } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { createDispatchRecord, uploadFinancialData, getFilteredRecords, getDashboardStats, getAnnualSummary, deleteDispatchRecords, updateDispatchRecord } from '../utils/api';
import { formatDate } from '../utils/dateFormatter';
import styles from './Admin.module.css';

const Admin = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [financialFile, setFinancialFile] = useState(null);
    const [financialStatus, setFinancialStatus] = useState(null);
    const [selectedRecordIds, setSelectedRecordIds] = useState([]);

    const navigate = useNavigate();

    // Edit tracking
    const [editingRecordId, setEditingRecordId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // Filters state
    const [filters, setFilters] = useState({
        truckType: '', month: '', year: '', sourceLocation: ''
    });

    // Stats State
    const [stats, setStats] = useState({ completed: 5846, inProgress: 1342, pending: 791 });
    const [totalRevenue, setTotalRevenue] = useState(0);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Manual Entry Form State
    const initialFormState = {
        dispatchDate: '', invoiceNo: '', lrNo: '', poNumber: '', truckNo: '',
        sourceLocation: '', finalDestination: '', dateOfArrival: '', deliveryDate: '',
        tons: '', freight: '', multiPoint: '', loading: '', unloading: '', halt: '',
        fuelCost: '', driverFee: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [recordsData, dbStats, annualData] = await Promise.all([
                getFilteredRecords(filters),
                getDashboardStats(),
                getAnnualSummary()
            ]);

            setRecords(recordsData);
            setSelectedRecordIds([]);

            if (dbStats) {
                setStats({
                    completed: dbStats.total - dbStats.inTransit - dbStats.activeTrucks || 5846,
                    inProgress: dbStats.inTransit || 1342,
                    pending: dbStats.activeTrucks || 791
                });
            }

            if (annualData && annualData.length > 0) {
                setTotalRevenue(annualData[0].totalEarnings);
            }

        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const startEditing = (record) => {
        setEditingRecordId(record.id);
        setEditFormData({ ...record });
    };

    const handleEditSave = async (id) => {
        if (!window.confirm("Save changes?")) return;
        setLoading(true);
        try {
            await updateDispatchRecord(id, editFormData);
            setEditingRecordId(null);
            fetchData();
        } catch (error) {
            alert("Failed to update record.");
        }
        setLoading(false);
    };

    const handleDeleteOne = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;
        setLoading(true);
        try {
            await deleteDispatchRecords([id]);
            fetchData();
        } catch (error) {
            alert("Failed to delete record");
        }
        setLoading(false);
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createDispatchRecord(formData);
            setUploadStatus({ type: 'success', message: 'Record created successfully!' });
            setFormData(initialFormState);
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            setUploadStatus({ type: 'error', message: 'Failed to create record.' });
        }
        setLoading(false);
        setTimeout(() => setUploadStatus(null), 3000);
    };

    const handleFinancialFileChange = (e) => {
        if (e.target.files) setFinancialFile(e.target.files[0]);
    };

    const handleFinancialUpload = async () => {
        if (!financialFile) return;
        setLoading(true);
        try {
            const result = await uploadFinancialData(financialFile);
            setFinancialStatus({
                type: 'success',
                message: `${result.message} — ✅ ${result.success} success, ❌ ${result.failed} failed`
            });
            setFinancialFile(null);
            const input = document.getElementById('financialFileUpload');
            if (input) input.value = '';
            fetchData();
        } catch (error) {
            setFinancialStatus({ type: 'error', message: 'File upload failed.' });
        }
        setLoading(false);
        setTimeout(() => setFinancialStatus(null), 3000);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRecordIds(records.map(r => r.id));
        } else {
            setSelectedRecordIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedRecordIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedRecordIds.length} records?`)) return;
        try {
            await deleteDispatchRecords(selectedRecordIds);
            fetchData();
        } catch (error) {
            alert("Failed to delete records");
        }
    };

    return (
        <div className={styles.adminPage}>
            {/* Top Navigation */}
            <div className={styles.headerArea}>
                <h1 className={styles.pageTitle}>Admin Console</h1>
                <div className={styles.headerRight}>
                    <Button onClick={() => navigate('/signup')} variant="outline" className={styles.addDataBtn}>
                        <UserPlus size={16} /> Create User
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)} className={styles.addDataBtn}>
                        <Plus size={16} /> Manage Data
                    </Button>
                </div>
            </div>


            {/* Dispatch Records Table Section */}
            <div className={styles.tableSection}>
                <div className={styles.tableHeaderRow}>
                    <div className={styles.tableTitleArea}>
                        <h2>Dispatch Records Summary</h2>
                        <span className={styles.countBadge}>{records.length}</span>
                    </div>

                    <div className={styles.tableActionsRow}>
                        {selectedRecordIds.length > 0 && (
                            <Button variant="danger" size="sm" onClick={handleBulkDelete} className={styles.deleteBtn}>
                                <Trash2 size={16} /> Delete Selected
                            </Button>
                        )}
                    </div>
                </div>

                <div className={styles.tableWrapper} style={{ overflowX: 'auto' }}>
                    <table className={styles.ordersTable} style={{ minWidth: '1500px' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', paddingLeft: '1rem' }}>
                                    <input type="checkbox" className={styles.customCheckbox} checked={selectedRecordIds.length === records.length && records.length > 0} onChange={handleSelectAll} />
                                </th>
                                <th>Dispatch Date</th>
                                <th>Invoice No.</th>
                                <th>LR. No</th>
                                <th>From</th>
                                <th>To</th>
                                <th>PO.Number</th>
                                <th>Tons</th>
                                <th>Truck.No</th>
                                <th>Date of Arrival</th>
                                <th>Date of Delivery</th>
                                <th>Freight</th>
                                <th>Multi-Point</th>
                                <th>Loading</th>
                                <th>Un Loading</th>
                                <th>Halting</th>
                                <th>Total</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.length > 0 ? (
                                records.map((record) => {
                                    const isEditing = editingRecordId === record.id;
                                    const isSelected = selectedRecordIds.includes(record.id);

                                    return (
                                        <tr key={record.id} className={isSelected ? styles.selectedRow : ''}>
                                            <td style={{ paddingLeft: '1rem' }}>
                                                <input type="checkbox" className={styles.customCheckbox} checked={isSelected} onChange={() => handleSelectOne(record.id)} />
                                            </td>

                                            {isEditing ? (
                                                <>
                                                    <td><input type="date" name="dispatchDate" value={editFormData.dispatchDate} onChange={handleEditInputChange} style={{ width: "110px" }} /></td>
                                                    <td><input type="text" name="invoiceNo" value={editFormData.invoiceNo} onChange={handleEditInputChange} style={{ width: "90px" }} /></td>
                                                    <td><input type="text" name="lrNo" value={editFormData.lrNo} onChange={handleEditInputChange} style={{ width: "90px" }} /></td>
                                                    <td><input type="text" name="sourceLocation" value={editFormData.sourceLocation} onChange={handleEditInputChange} style={{ width: "100px" }} /></td>
                                                    <td><input type="text" name="finalDestination" value={editFormData.finalDestination} onChange={handleEditInputChange} style={{ width: "100px" }} /></td>
                                                    <td><input type="text" name="poNumber" value={editFormData.poNumber} onChange={handleEditInputChange} style={{ width: "90px" }} /></td>
                                                    <td><input type="number" name="tons" value={editFormData.tons} onChange={handleEditInputChange} style={{ width: "60px" }} /></td>
                                                    <td><input type="text" name="truckNo" value={editFormData.truckNo} onChange={handleEditInputChange} style={{ width: "100px" }} /></td>
                                                    <td><input type="date" name="dateOfArrival" value={editFormData.dateOfArrival} onChange={handleEditInputChange} style={{ width: "110px" }} /></td>
                                                    <td><input type="date" name="deliveryDate" value={editFormData.deliveryDate} onChange={handleEditInputChange} style={{ width: "110px" }} /></td>
                                                    <td><input type="number" name="freight" value={editFormData.freight} onChange={handleEditInputChange} style={{ width: "80px" }} /></td>
                                                    <td><input type="number" name="multiPoint" value={editFormData.multiPoint} onChange={handleEditInputChange} style={{ width: "80px" }} /></td>
                                                    <td><input type="number" name="loading" value={editFormData.loading} onChange={handleEditInputChange} style={{ width: "80px" }} /></td>
                                                    <td><input type="number" name="unloading" value={editFormData.unloading} onChange={handleEditInputChange} style={{ width: "80px" }} /></td>
                                                    <td><input type="number" name="halt" value={editFormData.halt} onChange={handleEditInputChange} style={{ width: "80px" }} /></td>
                                                    <td className={styles.cellBold}>₹{record.total}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                            <button onClick={() => handleEditSave(record.id)} className={styles.iconBtnTable} style={{ color: 'green' }}><Save size={16} /></button>
                                                            <button onClick={() => setEditingRecordId(null)} className={styles.iconBtnTable} style={{ color: 'red' }}><X size={16} /></button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>{formatDate(record.dispatchDate)}</td>
                                                    <td>{record.invoiceNo || '-'}</td>
                                                    <td>{record.lrNo || '-'}</td>
                                                    <td>{record.sourceLocation}</td>
                                                    <td>{record.finalDestination}</td>
                                                    <td>{record.poNumber || '-'}</td>
                                                    <td>{record.tons || 0}</td>
                                                    <td className={styles.cellBold}>{record.truckNo}</td>
                                                    <td>{formatDate(record.dateOfArrival)}</td>
                                                    <td>{formatDate(record.deliveryDate)}</td>
                                                    <td>₹{record.freight || 0}</td>
                                                    <td>₹{record.multiPoint || 0}</td>
                                                    <td>₹{record.loading || 0}</td>
                                                    <td>₹{record.unloading || 0}</td>
                                                    <td>₹{record.halt || 0}</td>
                                                    <td className={styles.cellBold} style={{ color: "var(--color-primary)" }}>₹{record.total}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                            <button onClick={() => startEditing(record)} className={styles.iconBtnTable}><Edit2 size={16} /></button>
                                                            <button onClick={() => handleDeleteOne(record.id)} className={styles.iconBtnTable} style={{ color: 'var(--color-danger)' }}><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan="16" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>No records found for this filter.</td>
                                </tr>
                            )}
                        </tbody>
                        {records.length > 0 && (
                            <tfoot>
                                <tr>
                                    <td colSpan="15" style={{ textAlign: 'right', fontWeight: 'bold', paddingRight: '1rem', color: 'var(--color-text-primary)' }}>Grand Total:</td>
                                    <td className={styles.cellBold} style={{ color: "var(--color-primary)", fontSize: '1.05rem' }}>
                                        ₹{records.reduce((sum, record) => sum + (Number(record.total) || 0), 0).toFixed(2)}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* MODAL Overlay for Managing Existing Forms */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
                        <div className={styles.modalHeader}>
                            <h2>Manage Data</h2>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>

                        <div className={styles.modalBody}>
                            {/* Financial Data Upload Section */}
                            <Card className={styles.formCard} style={{ marginBottom: '20px' }}>
                                <div className={styles.financialHeader}>
                                    <FileText size={20} className={styles.iconGreen} />
                                    <div>
                                        <h3>Excel / CSV Bulk Upload</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                            Upload a <span style={{ fontWeight: 600 }}>.xls, .xlsx, or .csv</span> file containing these exact columns:
                                        </p>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex', flexWrap: 'wrap', gap: '6px',
                                    margin: '15px 0', padding: '12px',
                                    background: 'var(--color-bg-primary)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    {[
                                        'INVOICE NO', 'DISPATCH - DATE', 'LR. NO', 'FROM', 'TO',
                                        'PO.NUMBER', 'TONS', 'TRUCK.NO', 'DATE OF ARRIVAL',
                                        'DATE OF DELIVERY', 'FREIGHT', 'MULTI-POINT', 'LOADING',
                                        'UN LOADING', 'HALTING', 'TOTAL'
                                    ].map(col => (
                                        <span key={col} style={{
                                            fontSize: '0.75rem',
                                            padding: '4px 8px',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            color: '#10b981',
                                            borderRadius: '4px',
                                            fontWeight: 600
                                        }}>{col}</span>
                                    ))}
                                </div>

                                <div className={styles.uploadBox}>
                                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFinancialFileChange} id="financialFileUpload" className={styles.fileInput} />
                                    <label htmlFor="financialFileUpload" className={styles.fileLabel}>
                                        <Upload size={18} />
                                        {financialFile ? financialFile.name : 'Choose Excel or CSV File'}
                                    </label>
                                    <Button onClick={handleFinancialUpload} disabled={!financialFile || loading} style={{ marginTop: '10px', width: '100%' }}>
                                        {loading ? 'Processing...' : 'Upload & Import'}
                                    </Button>
                                    {financialStatus && (
                                        <div className={`${styles.status} ${styles[financialStatus.type]}`}>
                                            {financialStatus.message}
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Manual Entry */}
                            <Card className={styles.formCard}>
                                <h3><Plus size={18} /> Manual Entry: New Dispatch Record</h3>
                                <form onSubmit={handleManualSubmit} className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>Dispatch Date *</label>
                                        <input type="date" name="dispatchDate" value={formData.dispatchDate} onChange={handleInputChange} required />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Truck Number *</label>
                                        <input type="text" name="truckNo" value={formData.truckNo} onChange={handleInputChange} required placeholder="TN-45-AA-1234" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>LR No</label>
                                        <input type="text" name="lrNo" value={formData.lrNo} onChange={handleInputChange} placeholder="LR-10293" />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Source (From)</label>
                                        <input type="text" name="sourceLocation" value={formData.sourceLocation} onChange={handleInputChange} placeholder="Chennai" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Destination (To)</label>
                                        <input type="text" name="finalDestination" value={formData.finalDestination} onChange={handleInputChange} placeholder="Mumbai" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Invoice Number</label>
                                        <input type="text" name="invoiceNo" value={formData.invoiceNo} onChange={handleInputChange} placeholder="INV-2024" />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>PO Number</label>
                                        <input type="text" name="poNumber" value={formData.poNumber} onChange={handleInputChange} placeholder="PO-9921" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Date of Arrival</label>
                                        <input type="date" name="dateOfArrival" value={formData.dateOfArrival} onChange={handleInputChange} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Date of Delivery</label>
                                        <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleInputChange} />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Tons</label>
                                        <input type="number" step="0.01" name="tons" value={formData.tons} onChange={handleInputChange} placeholder="0.00" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Freight (₹)</label>
                                        <input type="number" step="0.01" name="freight" value={formData.freight} onChange={handleInputChange} placeholder="0.00" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Multi-Point (₹)</label>
                                        <input type="number" step="0.01" name="multiPoint" value={formData.multiPoint} onChange={handleInputChange} placeholder="0.00" />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Loading (₹)</label>
                                        <input type="number" step="0.01" name="loading" value={formData.loading} onChange={handleInputChange} placeholder="0.00" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Un Loading (₹)</label>
                                        <input type="number" step="0.01" name="unloading" value={formData.unloading} onChange={handleInputChange} placeholder="0.00" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Halting (₹)</label>
                                        <input type="number" step="0.01" name="halt" value={formData.halt} onChange={handleInputChange} placeholder="0.00" />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Fuel Cost (Expenses ₹)</label>
                                        <input type="number" step="0.01" name="fuelCost" value={formData.fuelCost} onChange={handleInputChange} placeholder="0.00" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Driver Fee (Expenses ₹)</label>
                                        <input type="number" step="0.01" name="driverFee" value={formData.driverFee} onChange={handleInputChange} placeholder="0.00" />
                                    </div>

                                    <div className={styles.formSubmitAction}>
                                        <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: 'auto' }}>
                                            {loading ? 'Saving...' : 'Create Record  →'}
                                        </Button>
                                    </div>

                                    {uploadStatus && (
                                        <div className={`${styles.status} ${styles[uploadStatus.type]} ${styles.formSubmitAction}`}>
                                            {uploadStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                            {uploadStatus.message}
                                        </div>
                                    )}
                                </form>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
