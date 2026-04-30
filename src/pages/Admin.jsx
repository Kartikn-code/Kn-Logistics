import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, FileText, CheckCircle, AlertCircle, DollarSign, Trash2, Search, Bell, Edit2, X, Save, UserPlus, Database, Settings, ArrowRight } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { createDispatchRecord, uploadFinancialData, getFilteredRecords, getDashboardStats, getAnnualSummary, deleteDispatchRecords, deleteAllDispatchRecords, updateDispatchRecord } from '../utils/api';
import { formatDate } from '../utils/dateFormatter';
import styles from './Admin.module.css';
import clsx from 'clsx';

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
            alert(error.message || "Failed to update record.");
        }
        setLoading(false);
    };

    const handleDeleteOne = async (e, id) => {
        e.stopPropagation();
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
            setUploadStatus({ type: 'error', message: error.message || 'Failed to create record.' });
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

    const handleDeleteAllRecords = async () => {
        if (!window.confirm(`WARNING: Are you sure you want to permanently delete ALL dispatch records?`)) return;
        try {
            await deleteAllDispatchRecords();
            fetchData();
        } catch (error) {
            alert("Failed to delete all records");
        }
    };

    return (
        <div className={styles.adminPage}>
            <div className={styles.container}>
                <header className={styles.headerArea}>
                    <div className={styles.headerLeft}>
                        <div className={styles.iconBox}>
                            <Settings size={24} />
                        </div>
                        <div>
                            <h1 className="heading-xl">Infrastructure Control</h1>
                            <p className={styles.subtitle}>System administration and bulk data orchestration</p>
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <Button onClick={() => navigate('/signup')} variant="outline" className={styles.headerBtn}>
                            <UserPlus size={18} /> <span className={styles.btnText}>New Operator</span>
                        </Button>
                        <Button onClick={() => setIsModalOpen(true)} className={styles.headerBtn}>
                            <Database size={18} /> <span className={styles.btnText}>Ingest Data</span>
                        </Button>
                    </div>
                </header>

                <div className={styles.tableSection}>
                    <div className={styles.tableHeaderRow}>
                        <div className={styles.tableTitleArea}>
                            <h2 className="heading-md">Audit Summary</h2>
                            <span className={styles.countBadge}>{records.length} Logs</span>
                        </div>

                        <div className={styles.tableActionsRow}>
                            {selectedRecordIds.length > 0 && (
                                <Button variant="danger" size="sm" onClick={handleBulkDelete} className={styles.bulkBtn}>
                                    <Trash2 size={16} /> Wipe {selectedRecordIds.length} Selected
                                </Button>
                            )}
                            {records.length > 0 && (
                                <Button variant="outline" size="sm" onClick={handleDeleteAllRecords} className={styles.wipeBtn}>
                                    <Trash2 size={16} /> Factory Reset Database
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className={styles.recordsContainer}>
                        {/* Desktop Table View */}
                        <div className={styles.desktopWrapper}>
                            <table className={styles.ordersTable}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>
                                            <input type="checkbox" checked={selectedRecordIds.length === records.length && records.length > 0} onChange={handleSelectAll} />
                                        </th>
                                        <th className="label-text">Date</th>
                                        <th className="label-text">Identifier</th>
                                        <th className="label-text">Route</th>
                                        <th className="label-text">Vehicle</th>
                                        <th className="label-text">Weight</th>
                                        <th className="label-text">Valuation</th>
                                        <th style={{ textAlign: 'center' }} className="label-text">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.length > 0 ? (
                                        [...records].sort((a, b) => {
                                            if (!a.invoiceNo) return 1;
                                            if (!b.invoiceNo) return -1;
                                            return String(a.invoiceNo).localeCompare(String(b.invoiceNo), undefined, { numeric: true, sensitivity: 'base' });
                                        }).map((record) => {
                                            const isEditing = editingRecordId === record.id;
                                            const isSelected = selectedRecordIds.includes(record.id);

                                            return (
                                                <tr key={record.id} className={clsx(isSelected && styles.selectedRow)}>
                                                    <td>
                                                        <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(record.id)} />
                                                    </td>
                                                    <td className={styles.dateCell}>{formatDate(record.dispatchDate)}</td>
                                                    <td className={styles.idCell}>{record.invoiceNo || record.id.slice(0,8)}</td>
                                                    <td>
                                                        <div className={styles.routeCell}>
                                                            <span>{record.sourceLocation}</span>
                                                            <ArrowRight size={14} className={styles.routeIcon} />
                                                            <span>{record.finalDestination}</span>
                                                        </div>
                                                    </td>
                                                    <td className={styles.vehicleCell}>{record.truckNo}</td>
                                                    <td>{record.tons || 0} T</td>
                                                    <td className="value-text">₹{record.total?.toLocaleString()}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div className={styles.rowActions}>
                                                            <button onClick={() => startEditing(record)} className={styles.iconBtn}><Edit2 size={16} /></button>
                                                            <button onClick={(e) => handleDeleteOne(e, record.id)} className={styles.deleteBtn}><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className={styles.emptyCell}>No operational data detected.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className={styles.mobileWrapper}>
                            {records.map(record => (
                                <div key={record.id} className={styles.mobileCard}>
                                    <div className={styles.cardHeaderMobile}>
                                        <span className={styles.idCell}>{record.invoiceNo || record.id.slice(0,8)}</span>
                                        <div className={styles.cardActionsMobile}>
                                            <button onClick={() => startEditing(record)} className={styles.iconBtn}><Edit2 size={16} /></button>
                                            <button onClick={(e) => handleDeleteOne(e, record.id)} className={styles.deleteBtn}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className={styles.cardBodyMobile}>
                                        <div className={styles.routeCell}>
                                            <span>{record.sourceLocation}</span>
                                            <ArrowRight size={14} />
                                            <span>{record.finalDestination}</span>
                                        </div>
                                        <div className={styles.detailsRowMobile}>
                                            <span className={styles.vehicleCell}>{record.truckNo}</span>
                                            <span className="value-text">₹{record.total?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className={styles.cardFooterMobile}>
                                        <span className={styles.dateCell}>{formatDate(record.dispatchDate)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className="heading-lg">Data Orchestration</h2>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                        </div>

                        <div className={styles.modalBody}>
                            <Card className={styles.uploadCard}>
                                <div className={styles.uploadHeader}>
                                    <Upload size={24} className={styles.uploadIcon} />
                                    <div>
                                        <h3 className="heading-md">Bulk Ingestion</h3>
                                        <p className={styles.uploadDesc}>Upload Excel/CSV manifests for automated processing.</p>
                                    </div>
                                </div>
                                <div className={styles.uploadBox}>
                                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFinancialFileChange} id="financialFileUpload" className={styles.fileInput} />
                                    <label htmlFor="financialFileUpload" className={styles.fileLabel}>
                                        {financialFile ? financialFile.name : 'Choose dataset...'}
                                    </label>
                                    <Button onClick={handleFinancialUpload} disabled={!financialFile || loading} className={styles.uploadBtn}>
                                        {loading ? 'Processing...' : 'Start Import'}
                                    </Button>
                                </div>
                            </Card>

                            <Card className={styles.formCard}>
                                <h3 className="heading-md">Manual Entry</h3>
                                <form onSubmit={handleManualSubmit} className={styles.manualForm}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.formGroup}>
                                            <label className="label-text">Dispatch Date</label>
                                            <input type="date" name="dispatchDate" value={formData.dispatchDate} onChange={handleInputChange} required />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className="label-text">Vehicle ID</label>
                                            <input type="text" name="truckNo" value={formData.truckNo} onChange={handleInputChange} required placeholder="TN-00-XX-0000" />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className="label-text">Identifier (INV/LR)</label>
                                            <input type="text" name="lrNo" value={formData.lrNo} onChange={handleInputChange} placeholder="Ref-001" />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className="label-text">Valuation (₹)</label>
                                            <input type="number" name="freight" value={formData.freight} onChange={handleInputChange} placeholder="0.00" />
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={loading} className={styles.submitBtn}>
                                        {loading ? 'Committing...' : 'Commit Record'}
                                    </Button>
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
