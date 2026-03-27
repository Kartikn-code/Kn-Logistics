import { useState, useEffect } from 'react';
import { Upload, DollarSign, FileText, CheckCircle, AlertCircle, TrendingUp, Briefcase, Trash2, Edit2, X, Save } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import styles from './Payments.module.css';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, BarChart, Bar, Legend, Cell, PieChart, Pie } from 'recharts';
import { getBasicStats, uploadBasicPayments, getInvoiceStats, uploadInvoicePayments, getInvoices, updateInvoice, deleteInvoices, deleteAllInvoices } from '../utils/api';
import { formatDate } from '../utils/dateFormatter';

const Payments = () => {
    const [activeTab, setActiveTab] = useState('basic'); // 'basic' or 'invoice'
    const [loading, setLoading] = useState(false);
    
    // Stats for Basic Payments
    const [basicStats, setBasicStats] = useState({
        expected: 0,
        received: 0,
        pending: 0
    });
    
    // Stats for Invoice Payments
    const [invoiceStats, setInvoiceStats] = useState({
        totalBillValue: 0,
        totalAmountReceived: 0,
        totalAmountDeducted: 0,
        yetToReceive: 0,
        tds: 0,
        totalBalance: 0
    });

    const [uploadStatus, setUploadStatus] = useState(null);
    const [file, setFile] = useState(null);

    // Invoice Table State
    const [invoices, setInvoices] = useState([]);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
    const [invoicePage, setInvoicePage] = useState(1);
    const [invoiceTotalPages, setInvoiceTotalPages] = useState(1);
    const [isEditingInvoice, setIsEditingInvoice] = useState(false);
    const [editingInvoiceData, setEditingInvoiceData] = useState({});

    const fetchData = async () => {
        if (activeTab === 'basic') {
            const stats = await getBasicStats();
            setBasicStats(stats);
        } else {
            const stats = await getInvoiceStats();
            setInvoiceStats(stats);
            
            const invData = await getInvoices(invoicePage);
            setInvoices(invData.data || []);
            setInvoiceTotalPages(invData.pagination?.totalPages || 1);
            setSelectedInvoiceIds([]);
        }
    };

    useEffect(() => {
        fetchData();
        setUploadStatus(null);
        setFile(null);
    }, [activeTab, invoicePage]);

    const handleFileChange = (e) => {
        if (e.target.files) setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            let result;
            if (activeTab === 'basic') {
                result = await uploadBasicPayments(file);
            } else {
                result = await uploadInvoicePayments(file);
            }
            setUploadStatus({ type: 'success', message: result.message || 'File uploaded successfully!' });
            setFile(null);
            const input = document.getElementById(activeTab === 'basic' ? 'basicUpload' : 'invoiceUpload');
            if (input) input.value = '';
            fetchData();
        } catch (error) {
            setUploadStatus({ type: 'error', message: 'Upload failed.' });
        }
        setLoading(false);
        setTimeout(() => setUploadStatus(null), 4000);
    };

    const basicChartData = [
        { name: 'Expected', amount: basicStats.expected, fill: '#60a5fa' },
        { name: 'Received', amount: basicStats.received, fill: '#34d399' },
        { name: 'Pending', amount: basicStats.pending, fill: '#fb7185' }
    ];

    const invoiceChartData = [
        { name: 'My Rate (Total)', amount: invoiceStats.totalBillValue || 0, fill: '#818cf8' },
        { name: 'Nippon Rate', amount: invoiceStats.nipponRateSum || 0, fill: '#a78bfa' },
        { name: 'Received', amount: invoiceStats.totalAmountReceived || 0, fill: '#34d399' },
        { name: 'Deductions', amount: invoiceStats.totalAmountDeducted || 0, fill: '#fbbf24' },
        { name: 'Yet to Receive', amount: invoiceStats.yetToReceive || 0, fill: '#fb7185' },
        { name: 'TDS', amount: invoiceStats.tds || 0, fill: '#ec4899' }
    ];

    const startEditInvoice = (inv) => {
        setEditingInvoiceData({ ...inv });
        setIsEditingInvoice(true);
    };

    const handleEditSave = async () => {
        setLoading(true);
        try {
            await updateInvoice(editingInvoiceData.id, editingInvoiceData);
            setIsEditingInvoice(false);
            fetchData();
        } catch (error) {
            alert('Failed to update invoice');
        }
        setLoading(false);
    };

    const handleDeleteOneInvoice = async (id) => {
        if (!window.confirm("Delete this invoice record?")) return;
        setLoading(true);
        try {
            await deleteInvoices([id]);
            fetchData();
        } catch (error) {
            alert('Failed to delete invoice');
        }
        setLoading(false);
    };

    const handleBulkDeleteInvoice = async () => {
        if (!window.confirm(`Delete ${selectedInvoiceIds.length} invoice records?`)) return;
        setLoading(true);
        try {
            await deleteInvoices(selectedInvoiceIds);
            fetchData();
        } catch (error) {
            alert('Failed to delete invoices');
        }
        setLoading(false);
    };

    const handleDeleteAllInvoices = async () => {
        if (!window.confirm(`WARNING: Are you sure you want to permanently delete ALL invoice records?`)) return;
        setLoading(true);
        try {
            await deleteAllInvoices();
            fetchData();
        } catch (error) {
            alert('Failed to delete all invoices');
        }
        setLoading(false);
    };

    const handleSelectAllInvoices = (e) => {
        if (e.target.checked) setSelectedInvoiceIds(invoices.map(i => i.id));
        else setSelectedInvoiceIds([]);
    };

    const handleSelectOneInvoice = (id) => {
        setSelectedInvoiceIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    return (
        <div className={styles.paymentsPage}>
            {/* Header */}
            <div className={styles.headerArea}>
                <h1 className={styles.pageTitle}>Payments Dashboard</h1>
                <div className={styles.headerRight}>
                    <div className={styles.tabContainer}>
                        <button 
                            className={`${styles.tabBtn} ${activeTab === 'basic' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('basic')}
                        >
                            <DollarSign size={16} /> Basic Payments
                        </button>
                        <button 
                            className={`${styles.tabBtn} ${activeTab === 'invoice' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('invoice')}
                        >
                            <Briefcase size={16} /> Invoice-wise
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'basic' && (
                <div className={styles.contentGrid}>
                    {/* Basic Payments View */}
                    <div className={styles.mainContent}>
                        {/* KPI Cards */}
                        <div className={styles.kpiGrid}>
                            <Card className={styles.kpiCard}>
                                <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                    <FileText size={24} style={{ color: '#3b82f6' }} />
                                </div>
                                <div className={styles.kpiInfo}>
                                    <p className={styles.kpiLabel}>Total Expected</p>
                                    <h3 className={styles.kpiValue}>₹{basicStats.expected.toLocaleString('en-IN')}</h3>
                                </div>
                            </Card>
                            <Card className={styles.kpiCard}>
                                <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                    <TrendingUp size={24} style={{ color: '#10b981' }} />
                                </div>
                                <div className={styles.kpiInfo}>
                                    <p className={styles.kpiLabel}>Total Received</p>
                                    <h3 className={styles.kpiValue}>₹{basicStats.received.toLocaleString('en-IN')}</h3>
                                </div>
                            </Card>
                            <Card className={styles.kpiCard}>
                                <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                    <AlertCircle size={24} style={{ color: '#ef4444' }} />
                                </div>
                                <div className={styles.kpiInfo}>
                                    <p className={styles.kpiLabel}>Pending Amount</p>
                                    <h3 className={styles.kpiValue}>₹{basicStats.pending.toLocaleString('en-IN')}</h3>
                                </div>
                            </Card>
                        </div>

                        {/* Chart Area */}
                        <Card className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>Payment Trends</h3>
                            <div style={{ height: '350px', marginTop: '1.5rem' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={basicChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                        <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`} />
                                        <ChartTooltip 
                                            formatter={(value, name, props) => [`₹${Number(value).toLocaleString('en-IN')}`, props.payload.name]}
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                                            itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                                            labelStyle={{ display: 'none' }}
                                            cursor={{fill: 'var(--color-bg-secondary)', opacity: 0.5}}
                                        />
                                        <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                            {basicChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* Basic Upload Sidebar */}
                    <div className={styles.sidebar}>
                        <Card className={styles.uploadCard}>
                            <h3 className={styles.sidebarTitle}>Upload Basic Payments</h3>
                            <p className={styles.sidebarDesc}>Upload an Excel/CSV file with columns:</p>
                            <div className={styles.colBadges}>
                                <span>Payment Received Date</span>
                                <span>Payment Received Amount</span>
                            </div>
                            
                            <div className={styles.uploadBox}>
                                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} id="basicUpload" className={styles.fileInput} />
                                <label htmlFor="basicUpload" className={styles.fileLabel}>
                                    <Upload size={18} />
                                    {file && activeTab === 'basic' ? file.name : 'Choose File'}
                                </label>
                                <Button onClick={handleUpload} disabled={!file || loading} style={{ width: '100%', marginTop: '1rem' }}>
                                    {loading ? 'Uploading...' : 'Upload Data'}
                                </Button>
                            </div>
                            {uploadStatus && (
                                <div className={`${styles.status} ${styles[uploadStatus.type]}`}>
                                    {uploadStatus.message}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === 'invoice' && (
                <div className={styles.contentGrid}>
                    {/* Invoice Payments View */}
                    <div className={styles.mainContent}>
                        {/* KPI Cards */}
                        <div className={styles.kpiGrid}>
                            <Card className={styles.kpiCard}>
                                <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                                    <FileText size={24} style={{ color: '#6366f1' }} />
                                </div>
                                <div className={styles.kpiInfo}>
                                    <p className={styles.kpiLabel}>Total Bill Value</p>
                                    <h3 className={styles.kpiValue}>₹{invoiceStats.totalBillValue?.toLocaleString('en-IN') || 0}</h3>
                                </div>
                            </Card>
                            <Card className={styles.kpiCard}>
                                <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                    <TrendingUp size={24} style={{ color: '#10b981' }} />
                                </div>
                                <div className={styles.kpiInfo}>
                                    <p className={styles.kpiLabel}>Amount Received</p>
                                    <h3 className={styles.kpiValue}>₹{invoiceStats.totalAmountReceived?.toLocaleString('en-IN') || 0}</h3>
                                </div>
                            </Card>
                            <Card className={styles.kpiCard}>
                                <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                    <Briefcase size={24} style={{ color: '#f59e0b' }} />
                                </div>
                                <div className={styles.kpiInfo}>
                                    <p className={styles.kpiLabel}>Amount Deducted</p>
                                    <h3 className={styles.kpiValue}>₹{invoiceStats.totalAmountDeducted?.toLocaleString('en-IN') || 0}</h3>
                                </div>
                            </Card>
                            <Card className={styles.kpiCard}>
                                <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                    <AlertCircle size={24} style={{ color: '#ef4444' }} />
                                </div>
                                <div className={styles.kpiInfo}>
                                    <p className={styles.kpiLabel}>Yet to Receive</p>
                                    <h3 className={styles.kpiValue}>₹{invoiceStats.yetToReceive?.toLocaleString('en-IN') || 0}</h3>
                                </div>
                            </Card>
                        </div>

                        {/* Chart Area */}
                        <Card className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>Invoice Breakdown</h3>
                            <div style={{ height: '350px', marginTop: '1.5rem', display: 'flex', gap: '2rem' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={invoiceChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                        <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`} />
                                        <ChartTooltip 
                                            formatter={(value, name, props) => [`₹${Number(value).toLocaleString('en-IN')}`, props.payload.name]}
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                                            itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                                            labelStyle={{ display: 'none' }}
                                            cursor={{fill: 'var(--color-bg-secondary)', opacity: 0.5}}
                                        />
                                        <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                            {invoiceChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* Invoice Upload & Balance Suggestions Sidebar */}
                    <div className={styles.sidebar}>
                        <Card className={styles.uploadCard}>
                            <h3 className={styles.sidebarTitle}>Upload Invoice Data</h3>
                            <p className={styles.sidebarDesc}>Upload file with columns:</p>
                            <div className={styles.colBadges}>
                                <span>Invoice No</span>
                                <span>My rate</span>
                                <span>Nippon rate</span>
                                <span>TDS</span>
                                <span>Total received</span>
                                <span>Deduction</span>
                                <span>Received Status</span>
                                <span>Date</span>
                            </div>
                            
                            <div className={styles.uploadBox}>
                                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} id="invoiceUpload" className={styles.fileInput} />
                                <label htmlFor="invoiceUpload" className={styles.fileLabel}>
                                    <Upload size={18} />
                                    {file && activeTab === 'invoice' ? file.name : 'Choose File'}
                                </label>
                                <Button onClick={handleUpload} disabled={!file || loading} style={{ width: '100%', marginTop: '1rem' }}>
                                    {loading ? 'Uploading...' : 'Upload Data'}
                                </Button>
                                {uploadStatus && (
                                    <div className={`${styles.status} ${styles[uploadStatus.type]}`}>
                                        {uploadStatus.message}
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Balance Suggestions Panel */}
                        <Card className={styles.suggestionsCard}>
                            <h3 className={styles.sidebarTitle}>Balance Suggestions</h3>
                            <div className={styles.suggestionBox}>
                                <div className={styles.suggestionHeader}>
                                    <span className={styles.suggestionDot}></span>
                                    <h4>Invoice Pending</h4>
                                </div>
                                <p className={styles.suggestionAmount} style={{fontSize: '1.4rem'}}>₹{invoiceStats.yetToReceive?.toLocaleString('en-IN') || 0}</p>

                                <div className={styles.suggestionHeader} style={{marginTop: '1rem'}}>
                                    <span className={styles.suggestionDot} style={{backgroundColor: '#ec4899'}}></span>
                                    <h4>TDS Pending</h4>
                                </div>
                                <p className={styles.suggestionAmount} style={{fontSize: '1.4rem', color: '#ec4899'}}>₹{invoiceStats.tds?.toLocaleString('en-IN') || 0}</p>

                                <div style={{marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)'}}>
                                    <span style={{fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: '600'}}>Total Pending (Invoice + TDS)</span>
                                    <p className={styles.suggestionAmount} style={{margin: '0.25rem 0 0 0'}}>₹{invoiceStats.totalBalance?.toLocaleString('en-IN') || 0}</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Full Width Data Table */}
                    <div className={styles.fullWidthSection}>
                        <Card className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <h3 className={styles.chartTitle}>Invoice Records</h3>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    {selectedInvoiceIds.length > 0 && (
                                        <Button variant="danger" onClick={handleBulkDeleteInvoice} className={styles.deleteBtn}>
                                            <Trash2 size={16} /> Delete Selected ({selectedInvoiceIds.length})
                                        </Button>
                                    )}
                                    {invoices.length > 0 && (
                                        <Button variant="danger" onClick={handleDeleteAllInvoices} className={styles.deleteBtn}>
                                            <Trash2 size={16} /> Delete All Records
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className={styles.tableContainer}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th><input type="checkbox" onChange={handleSelectAllInvoices} checked={selectedInvoiceIds.length === invoices.length && invoices.length > 0} /></th>
                                            <th>Date</th>
                                            <th>Invoice No</th>
                                            <th>My Rate</th>
                                            <th>Nippon Rate</th>
                                            <th>TDS</th>
                                            <th>Total Received</th>
                                            <th>Deduction</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.length === 0 ? (
                                            <tr><td colSpan="10" style={{textAlign: 'center', padding: '2rem'}}>No invoice records found.</td></tr>
                                        ) : invoices.map(inv => (
                                            <tr key={inv.id}>
                                                <td><input type="checkbox" checked={selectedInvoiceIds.includes(inv.id)} onChange={() => handleSelectOneInvoice(inv.id)} /></td>
                                                <td>{formatDate(inv.paymentDate)}</td>
                                                <td>{inv.invoiceNo}</td>
                                                <td>₹{Number(inv.myRate || 0).toLocaleString('en-IN')}</td>
                                                <td>₹{Number(inv.nipponRate || 0).toLocaleString('en-IN')}</td>
                                                <td>₹{Number(inv.tds || 0).toLocaleString('en-IN')}</td>
                                                <td>₹{Number(inv.totalReceived || 0).toLocaleString('en-IN')}</td>
                                                <td>₹{Number(inv.deduction || 0).toLocaleString('en-IN')}</td>
                                                <td>
                                                    <span className={styles.badge} data-status={
                                                        (inv.receivedStatus || '').toLowerCase().includes('received') || (inv.receivedStatus || '').toLowerCase().includes('yes') ? 'success' : 'error'
                                                    }>
                                                        {inv.receivedStatus || 'Pending'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={styles.actionButtons}>
                                                        <button className={styles.iconBtn} onClick={() => startEditInvoice(inv)}><Edit2 size={16} /></button>
                                                        <button className={`${styles.iconBtn} ${styles.dangerIcon}`} onClick={() => handleDeleteOneInvoice(inv.id)}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {invoices.length > 0 && (
                                <div className={styles.pagination}>
                                    <Button variant="outline" disabled={invoicePage === 1} onClick={() => setInvoicePage(p => p - 1)}>Previous</Button>
                                    <span className={styles.pageInfo}>Page {invoicePage} of {invoiceTotalPages || 1}</span>
                                    <Button variant="outline" disabled={invoicePage >= invoiceTotalPages} onClick={() => setInvoicePage(p => p + 1)}>Next</Button>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {/* Edit Invoice Modal */}
            {isEditingInvoice && (
                <div className={styles.modalOverlay}>
                    <Card className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Edit Invoice</h2>
                            <button className={styles.closeBtn} onClick={() => setIsEditingInvoice(false)}><X size={24} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <form>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>Invoice No</label>
                                        <input type="text" value={editingInvoiceData.invoiceNo || ''} onChange={(e) => setEditingInvoiceData({...editingInvoiceData, invoiceNo: e.target.value})} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Payment Date</label>
                                        <input type="date" value={editingInvoiceData.paymentDate || ''} onChange={(e) => setEditingInvoiceData({...editingInvoiceData, paymentDate: e.target.value})} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>My Rate</label>
                                        <input type="number" value={editingInvoiceData.myRate || 0} onChange={(e) => setEditingInvoiceData({...editingInvoiceData, myRate: e.target.value})} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Nippon Rate</label>
                                        <input type="number" value={editingInvoiceData.nipponRate || 0} onChange={(e) => setEditingInvoiceData({...editingInvoiceData, nipponRate: e.target.value})} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>TDS</label>
                                        <input type="number" value={editingInvoiceData.tds || 0} onChange={(e) => setEditingInvoiceData({...editingInvoiceData, tds: e.target.value})} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Total Received</label>
                                        <input type="number" value={editingInvoiceData.totalReceived || 0} onChange={(e) => setEditingInvoiceData({...editingInvoiceData, totalReceived: e.target.value})} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Deduction</label>
                                        <input type="number" value={editingInvoiceData.deduction || 0} onChange={(e) => setEditingInvoiceData({...editingInvoiceData, deduction: e.target.value})} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Received Status</label>
                                        <input type="text" value={editingInvoiceData.receivedStatus || ''} onChange={(e) => setEditingInvoiceData({...editingInvoiceData, receivedStatus: e.target.value})} />
                                    </div>
                                </div>
                                <div className={styles.modalFooter}>
                                    <Button variant="outline" onClick={() => setIsEditingInvoice(false)} type="button">Cancel</Button>
                                    <Button onClick={handleEditSave} disabled={loading} type="button">
                                        <Save size={16} /> Save Changes
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Payments;
