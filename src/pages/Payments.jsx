import { useState, useEffect } from 'react';
import { Upload, DollarSign, FileText, CheckCircle, AlertCircle, TrendingUp, Briefcase, Trash2, Edit2, X, Save, Download, Calendar, BarChart3 } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import styles from './Payments.module.css';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Cell, AreaChart, Area } from 'recharts';
import { getBasicPayments, deleteBasicPayments, deleteAllBasicPayments, uploadBasicPayments, getInvoiceStats, uploadInvoicePayments, getInvoices, updateInvoice, deleteInvoices, deleteAllInvoices, getPaymentAnalytics, getPaymentYearlyBreakdown } from '../utils/api';
import { formatDate } from '../utils/dateFormatter';

const Payments = () => {
    const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'invoice', 'expenses', or 'analytics'
    const [loading, setLoading] = useState(false);

    // Determine admin status
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.role === 'admin') setIsAdmin(true);
            } catch (e) { /* ignore */ }
        }
    }, []);

    // Basic Payments State
    const [basicPayments, setBasicPayments] = useState([]);
    const [basicPage, setBasicPage] = useState(1);
    const [basicTotalPages, setBasicTotalPages] = useState(1);

    // Expenses State
    const [expenses, setExpenses] = useState([]);
    const [expensePage, setExpensePage] = useState(1);
    const [expenseTotalPages, setExpenseTotalPages] = useState(1);
    const [expenseFilters, setExpenseFilters] = useState({ truckNo: '', type: '', month: '', year: new Date().getFullYear().toString() });
    const [expenseAnalytics, setExpenseAnalytics] = useState({ totalExpense: 0, transactionCount: 0, breakdown: [] });
    const [expenseYearlyData, setExpenseYearlyData] = useState([]);
    const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [newExpense, setNewExpense] = useState({ expenseDate: new Date().toISOString().split('T')[0], expenseType: 'Diesel cost', vehicleNo: '', amount: '', description: '' });

    // Invoice State
    const [invoiceStats, setInvoiceStats] = useState({
        totalBillValue: 0, totalAmountReceived: 0, totalAmountDeducted: 0,
        yetToReceive: 0, tds: 0, totalBalance: 0, nipponRateSum: 0
    });
    const [invoices, setInvoices] = useState([]);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
    const [invoicePage, setInvoicePage] = useState(1);
    const [invoiceTotalPages, setInvoiceTotalPages] = useState(1);
    const [isEditingInvoice, setIsEditingInvoice] = useState(false);
    const [editingInvoiceData, setEditingInvoiceData] = useState({});

    const [uploadStatus, setUploadStatus] = useState(null);
    const [file, setFile] = useState(null);

    // Analytics State (Basic Payments Only)
    const [analyticsFilter, setAnalyticsFilter] = useState('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [analyticsData, setAnalyticsData] = useState({ totalReceived: 0, transactionCount: 0 });
    const [yearlyBreakdownYear, setYearlyBreakdownYear] = useState(new Date().getFullYear().toString());
    const [yearlyBreakdownData, setYearlyBreakdownData] = useState([]);

    // --- Data Fetching ---
    const fetchData = async () => {
        if (activeTab === 'basic') {
            const data = await getBasicPayments(basicPage);
            setBasicPayments(data.data || []);
            setBasicTotalPages(data.pagination?.totalPages || 1);
        } else if (activeTab === 'invoice') {
            const stats = await getInvoiceStats();
            setInvoiceStats(stats);
            const invData = await getInvoices(invoicePage);
            setInvoices(invData.data || []);
            setInvoiceTotalPages(invData.pagination?.totalPages || 1);
            setSelectedInvoiceIds([]);
        } else if (activeTab === 'expenses') {
            const data = await getExpenses(expensePage, 10, expenseFilters);
            setExpenses(data.data || []);
            setExpenseTotalPages(data.pagination?.totalPages || 1);
            const analytics = await getExpenseAnalytics(expenseFilters);
            setExpenseAnalytics(analytics);
            const yearly = await getExpenseYearlyBreakdown(expenseFilters.year, expenseFilters.truckNo);
            setExpenseYearlyData(yearly);
            setSelectedExpenseIds([]);
        } else if (activeTab === 'analytics') {
            fetchAnalyticsData();
            fetchYearlyBreakdown();
        }
    };

    const fetchAnalyticsData = async () => {
        let start = '';
        let end = '';
        const today = new Date();

        if (analyticsFilter === 'week') {
            const day = today.getDay();
            const firstDay = new Date(today);
            firstDay.setDate(today.getDate() - day);
            const lastDay = new Date(firstDay);
            lastDay.setDate(firstDay.getDate() + 6);
            start = firstDay.toISOString().split('T')[0];
            end = lastDay.toISOString().split('T')[0];
        } else if (analyticsFilter === 'month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            start = firstDay.toISOString().split('T')[0];
            end = lastDay.toISOString().split('T')[0];
        } else if (analyticsFilter === 'year') {
            const firstDay = new Date(today.getFullYear(), 0, 1);
            const lastDay = new Date(today.getFullYear(), 11, 31);
            start = firstDay.toISOString().split('T')[0];
            end = lastDay.toISOString().split('T')[0];
        } else if (analyticsFilter === 'custom') {
            start = customStartDate;
            end = customEndDate;
        }

        const data = await getPaymentAnalytics(start, end);
        setAnalyticsData(data);
    };

    const fetchYearlyBreakdown = async () => {
        const data = await getPaymentYearlyBreakdown(yearlyBreakdownYear);
        setYearlyBreakdownData(data);
    };

    useEffect(() => {
        fetchData();
        setUploadStatus(null);
        setFile(null);
    }, [activeTab, basicPage, invoicePage, expensePage, expenseFilters, analyticsFilter, customStartDate, customEndDate, yearlyBreakdownYear]);

    // --- Upload ---
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
            } else if (activeTab === 'invoice') {
                result = await uploadInvoicePayments(file);
            } else if (activeTab === 'expenses') {
                result = await uploadExpenses(file);
            }
            setUploadStatus({ type: 'success', message: result.message || 'File uploaded successfully!' });
            setFile(null);
            const input = document.getElementById(activeTab + 'Upload');
            if (input) input.value = '';
            fetchData();
        } catch (error) {
            setUploadStatus({ type: 'error', message: 'Upload failed.' });
        }
        setLoading(false);
        setTimeout(() => setUploadStatus(null), 4000);
    };

    // --- Invoice Handlers ---
    const invoiceChartData = [
        { name: 'My Rate (Total)', amount: invoiceStats.totalBillValue || 0, fill: '#818cf8' },
        { name: 'Nippon Rate', amount: invoiceStats.nipponRateSum || 0, fill: '#a78bfa' },
        { name: 'Received', amount: invoiceStats.totalAmountReceived || 0, fill: '#34d399' },
        { name: 'Deductions', amount: invoiceStats.totalAmountDeducted || 0, fill: '#fbbf24' },
        { name: 'Yet to Receive', amount: invoiceStats.yetToReceive || 0, fill: '#fb7185' },
        { name: 'TDS', amount: invoiceStats.tds || 0, fill: '#ec4899' }
    ];

    const startEditInvoice = (inv) => { setEditingInvoiceData({ ...inv }); setIsEditingInvoice(true); };

    const handleEditSave = async () => {
        setLoading(true);
        try { await updateInvoice(editingInvoiceData.id, editingInvoiceData); setIsEditingInvoice(false); fetchData(); }
        catch (error) { alert('Failed to update invoice'); }
        setLoading(false);
    };

    const handleDeleteOneInvoice = async (id) => {
        if (!window.confirm("Delete this invoice record?")) return;
        setLoading(true);
        try { await deleteInvoices([id]); fetchData(); } catch (error) { alert('Failed to delete invoice'); }
        setLoading(false);
    };

    const handleBulkDeleteInvoice = async () => {
        if (!window.confirm(`Delete ${selectedInvoiceIds.length} invoice records?`)) return;
        setLoading(true);
        try { await deleteInvoices(selectedInvoiceIds); fetchData(); } catch (error) { alert('Failed to delete invoices'); }
        setLoading(false);
    };

    const handleDeleteOneBasicPayment = async (id) => {
        if (!window.confirm("Delete this basic payment record?")) return;
        setLoading(true);
        try { await deleteBasicPayments([id]); fetchData(); } catch (error) { alert('Failed to delete payment'); }
        setLoading(false);
    };

    const handleDeleteAllBasicPayments = async () => {
        if (!window.confirm('WARNING: Are you sure you want to permanently delete ALL basic payment records?')) return;
        setLoading(true);
        try { await deleteAllBasicPayments(); fetchData(); } catch (error) { alert('Failed to delete all basic payments'); }
        setLoading(false);
    };

    const handleDeleteAllInvoices = async () => {
        if (!window.confirm('WARNING: Are you sure you want to permanently delete ALL invoice records?')) return;
        setLoading(true);
        try { await deleteAllInvoices(); fetchData(); } catch (error) { alert('Failed to delete all invoices'); }
        setLoading(false);
    };

    const handleSelectAllInvoices = (e) => {
        if (e.target.checked) setSelectedInvoiceIds(invoices.map(i => i.id));
        else setSelectedInvoiceIds([]);
    };

    const handleSelectOneInvoice = (id) => {
        setSelectedInvoiceIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    // --- Expense Handlers ---
    const handleDeleteOneExpense = async (id) => {
        if (!window.confirm("Delete this expense record?")) return;
        setLoading(true);
        try { await deleteExpenses([id]); fetchData(); } catch (error) { alert('Failed to delete expense'); }
        setLoading(false);
    };

    const handleBulkDeleteExpenses = async () => {
        if (!window.confirm(`Delete ${selectedExpenseIds.length} expense records?`)) return;
        setLoading(true);
        try { await deleteExpenses(selectedExpenseIds); fetchData(); } catch (error) { alert('Failed to delete expenses'); }
        setLoading(false);
    };

    const handleDeleteAllExpenses = async () => {
        if (!window.confirm('WARNING: Are you sure you want to permanently delete ALL expense records?')) return;
        setLoading(true);
        try { await deleteExpenses([], true); fetchData(); } catch (error) { alert('Failed to delete all expenses'); }
        setLoading(false);
    };

    const handleSelectAllExpenses = (e) => {
        if (e.target.checked) setSelectedExpenseIds(expenses.map(ex => ex.id));
        else setSelectedExpenseIds([]);
    };

    const handleSelectOneExpense = (id) => {
        setSelectedExpenseIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        const { expenseType, vehicleNo, amount } = newExpense;
        
        // Validation: Vehicle No required for everything except 'Driver cost'
        if (expenseType !== 'Driver cost' && !vehicleNo) {
            alert('Vehicle Number is required for ' + expenseType);
            return;
        }
        if (!amount || Number(amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            const result = await createExpense(newExpense);
            alert(result.message || 'Expense recorded');
            setIsAddingExpense(false);
            setNewExpense({ expenseDate: new Date().toISOString().split('T')[0], expenseType: 'Diesel cost', vehicleNo: '', amount: '', description: '' });
            fetchData();
        } catch (error) {
            alert(error.message || 'Failed to record expense');
        }
        setLoading(false);
    };

    // --- CSV Export ---
    const downloadCSV = (data, filename) => {
        if (!data || data.length === 0) { alert('No data to export.'); return; }
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => {
                let val = row[h] ?? '';
                val = String(val).replace(/"/g, '""');
                return `"${val}"`;
            }).join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const exportBasicPayments = () => {
        downloadCSV(basicPayments.map(p => ({
            'Payment Date': formatDate(p.paymentDate),
            'Payment Amount (₹)': Number(p.paymentAmount || 0)
        })), 'basic_payments.csv');
    };

    const exportInvoices = () => {
        downloadCSV(invoices.map(inv => ({
            'Date': formatDate(inv.paymentDate), 'Invoice No': inv.invoiceNo,
            'My Rate': Number(inv.myRate || 0), 'Nippon Rate': Number(inv.nipponRate || 0),
            'TDS': Number(inv.tds || 0), 'Total Received': Number(inv.totalReceived || 0),
            'Deduction': Number(inv.deduction || 0), 'Status': inv.receivedStatus || 'Pending'
        })), 'invoice_payments.csv');
    };

    const exportYearlyBreakdown = () => {
        downloadCSV(yearlyBreakdownData.map(m => ({
            'Month': m.monthName, 'Total Received (₹)': Number(m.totalReceived || 0)
        })), `yearly_breakdown_${yearlyBreakdownYear}.csv`);
    };

    // --- Filter label ---
    const getFilterLabel = () => {
        switch (analyticsFilter) {
            case 'week': return 'This Week';
            case 'month': return 'This Month';
            case 'year': return 'This Year';
            case 'custom': return customStartDate && customEndDate ? `${formatDate(customStartDate)} → ${formatDate(customEndDate)}` : 'Custom Range';
            default: return '';
        }
    };

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());
    const yearlyTotal = yearlyBreakdownData.reduce((sum, m) => sum + (m.totalReceived || 0), 0);

    return (
        <div className={styles.paymentsPage}>
            {/* Header */}
            <div className={styles.headerArea}>
                <h1 className={styles.pageTitle}>Payments Dashboard</h1>
                <div className={styles.headerRight}>
                    <div className={styles.tabContainer}>
                        <button className={`${styles.tabBtn} ${activeTab === 'basic' ? styles.activeTab : ''}`} onClick={() => setActiveTab('basic')}>
                            <DollarSign size={16} /> Basic Payments
                        </button>
                        <button className={`${styles.tabBtn} ${activeTab === 'invoice' ? styles.activeTab : ''}`} onClick={() => setActiveTab('invoice')}>
                            <Briefcase size={16} /> Invoice-wise
                        </button>
                        <button className={`${styles.tabBtn} ${activeTab === 'expenses' ? styles.activeTab : ''}`} onClick={() => setActiveTab('expenses')}>
                            <DollarSign size={16} /> Expenses
                        </button>
                        <button className={`${styles.tabBtn} ${activeTab === 'analytics' ? styles.activeTab : ''}`} onClick={() => setActiveTab('analytics')}>
                            <TrendingUp size={16} /> Analytics
                        </button>
                    </div>
                </div>
            </div>

            {/* ========== BASIC PAYMENTS TAB ========== */}
            {activeTab === 'basic' && (
                <div className={styles.contentGrid}>
                    <div className={styles.mainContent}>
                        <Card className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <h3 className={styles.chartTitle}>Basic Payment Records</h3>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    {basicPayments.length > 0 && (
                                        <Button variant="outline" onClick={exportBasicPayments} className={styles.exportBtn}>
                                            <Download size={16} /> Export CSV
                                        </Button>
                                    )}
                                    {isAdmin && basicPayments.length > 0 && (
                                        <Button variant="danger" onClick={handleDeleteAllBasicPayments} className={styles.deleteBtn}>
                                            <Trash2 size={16} /> Delete All Records
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className={styles.tableContainer}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>Payment Received Date</th>
                                            <th>Payment Received Amount</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {basicPayments.length === 0 ? (
                                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>No records found. Upload an Excel file to add payment data.</td></tr>
                                        ) : basicPayments.map(pay => (
                                            <tr key={pay.id}>
                                                <td>{formatDate(pay.paymentDate)}</td>
                                                <td><span style={{ fontWeight: '600', color: '#10b981' }}>₹{Number(pay.paymentAmount || 0).toLocaleString('en-IN')}</span></td>
                                                <td>
                                                    <div className={styles.actionButtons}>
                                                        <button className={`${styles.iconBtn} ${styles.dangerIcon}`} onClick={() => handleDeleteOneBasicPayment(pay.id)}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {basicPayments.length > 0 && (
                                <div className={styles.pagination}>
                                    <Button variant="outline" disabled={basicPage === 1} onClick={() => setBasicPage(p => p - 1)}>Previous</Button>
                                    <span className={styles.pageInfo}>Page {basicPage} of {basicTotalPages || 1}</span>
                                    <Button variant="outline" disabled={basicPage >= basicTotalPages} onClick={() => setBasicPage(p => p + 1)}>Next</Button>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Upload Sidebar */}
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
                                <div className={`${styles.status} ${styles[uploadStatus.type]}`}>{uploadStatus.message}</div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {/* ========== INVOICE TAB ========== */}
            {activeTab === 'invoice' && (
                <div className={styles.contentGrid}>
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

                        {/* Invoice Chart */}
                        <Card className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>Invoice Breakdown</h3>
                            <div style={{ height: '350px', marginTop: '1.5rem' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={invoiceChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                        <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={(value) => value >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : value > 0 ? `₹${(value / 1000).toFixed(0)}k` : '₹0'} />
                                        <ChartTooltip
                                            formatter={(value, name, props) => [`₹${Number(value).toLocaleString('en-IN')}`, props.payload.name]}
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                                            itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                                            labelStyle={{ display: 'none' }}
                                            cursor={{ fill: 'var(--color-bg-secondary)', opacity: 0.5 }}
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

                    {/* Invoice Sidebar */}
                    <div className={styles.sidebar}>
                        <Card className={styles.uploadCard}>
                            <h3 className={styles.sidebarTitle}>Upload Invoice Data</h3>
                            <p className={styles.sidebarDesc}>Upload file with columns:</p>
                            <div className={styles.colBadges}>
                                <span>Invoice No</span><span>My rate</span><span>Nippon rate</span><span>TDS</span>
                                <span>Total received</span><span>Deduction</span><span>Received Status</span><span>Date</span>
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
                                    <div className={`${styles.status} ${styles[uploadStatus.type]}`}>{uploadStatus.message}</div>
                                )}
                            </div>
                        </Card>

                        <Card className={styles.suggestionsCard}>
                            <h3 className={styles.sidebarTitle}>Balance Suggestions</h3>
                            <div className={styles.suggestionBox}>
                                <div className={styles.suggestionHeader}>
                                    <span className={styles.suggestionDot}></span>
                                    <h4>Invoice Pending</h4>
                                </div>
                                <p className={styles.suggestionAmount} style={{ fontSize: '1.4rem' }}>₹{invoiceStats.yetToReceive?.toLocaleString('en-IN') || 0}</p>
                                <div className={styles.suggestionHeader} style={{ marginTop: '1rem' }}>
                                    <span className={styles.suggestionDot} style={{ backgroundColor: '#ec4899' }}></span>
                                    <h4>TDS Pending</h4>
                                </div>
                                <p className={styles.suggestionAmount} style={{ fontSize: '1.4rem', color: '#ec4899' }}>₹{invoiceStats.tds?.toLocaleString('en-IN') || 0}</p>
                                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>Total Pending (Invoice + TDS)</span>
                                    <p className={styles.suggestionAmount} style={{ margin: '0.25rem 0 0 0' }}>₹{invoiceStats.totalBalance?.toLocaleString('en-IN') || 0}</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Invoice Data Table */}
                    <div className={styles.fullWidthSection}>
                        <Card className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <h3 className={styles.chartTitle}>Invoice Records</h3>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    {invoices.length > 0 && (
                                        <Button variant="outline" onClick={exportInvoices} className={styles.exportBtn}>
                                            <Download size={16} /> Export CSV
                                        </Button>
                                    )}
                                    {selectedInvoiceIds.length > 0 && (
                                        <Button variant="danger" onClick={handleBulkDeleteInvoice} className={styles.deleteBtn}>
                                            <Trash2 size={16} /> Delete Selected ({selectedInvoiceIds.length})
                                        </Button>
                                    )}
                                    {isAdmin && invoices.length > 0 && (
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
                                            <th>Date</th><th>Invoice No</th><th>My Rate</th><th>Nippon Rate</th>
                                            <th>TDS</th><th>Total Received</th><th>Deduction</th><th>Status</th><th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.length === 0 ? (
                                            <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>No invoice records found.</td></tr>
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
            {/* ========== EXPENSES TAB ========== */}
            {activeTab === 'expenses' && (
                <div className={styles.contentGrid}>
                    <div className={styles.mainContent}>
                        {/* KPI Cards for Expenses */}
                        <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <Card className={styles.kpiCard}>
                                <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                    <DollarSign size={24} style={{ color: '#ef4444' }} />
                                </div>
                                <div className={styles.kpiInfo}>
                                    <p className={styles.kpiLabel}>Total Expenses</p>
                                    <h3 className={styles.kpiValue}>₹{expenseAnalytics.totalExpense?.toLocaleString('en-IN') || 0}</h3>
                                </div>
                            </Card>
                            <Card className={styles.kpiCard}>
                                <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                    <FileText size={24} style={{ color: '#10b981' }} />
                                </div>
                                <div className={styles.kpiInfo}>
                                    <p className={styles.kpiLabel}>Transactions</p>
                                    <h3 className={styles.kpiValue}>{expenseAnalytics.transactionCount || 0}</h3>
                                </div>
                            </Card>
                        </div>

                        {/* Expense Analytics Charts inside tab */}
                        <Card className={styles.chartCard} style={{ marginBottom: '2rem' }}>
                            <div className={styles.yearlyHeader}>
                                <h3 className={styles.chartTitle}>Monthly Expense Trend</h3>
                                <p className={styles.yearlySubtext}>Current Year: {expenseFilters.year}</p>
                            </div>
                            <div style={{ height: '300px', marginTop: '1.5rem' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={expenseYearlyData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                        <XAxis dataKey="monthName" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v > 0 ? `₹${(v / 1000).toFixed(0)}k` : '₹0'} />
                                        <ChartTooltip
                                            formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Expense']}
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                        />
                                        <Area type="monotone" dataKey="totalExpense" stroke="#ef4444" strokeWidth={2.5} fill="url(#colorExpense)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <div className={styles.filterBar}>
                                    <div className={styles.filterGroup}>
                                        <label>Truck No</label>
                                        <input type="text" placeholder="Search vehicle..." value={expenseFilters.truckNo} onChange={(e) => setExpenseFilters({ ...expenseFilters, truckNo: e.target.value })} />
                                    </div>
                                    <div className={styles.filterGroup}>
                                        <label>Type</label>
                                        <select value={expenseFilters.type} onChange={(e) => setExpenseFilters({ ...expenseFilters, type: e.target.value })}>
                                            <option value="">All Types</option>
                                            <option value="Diesel cost">Diesel cost</option>
                                            <option value="Maintenance cost">Maintenance cost</option>
                                            <option value="Veh Due">Veh Due</option>
                                            <option value="Driver cost">Driver cost</option>
                                        </select>
                                    </div>
                                    <div className={styles.filterGroup}>
                                        <label>Year</label>
                                        <select value={expenseFilters.year} onChange={(e) => setExpenseFilters({ ...expenseFilters, year: e.target.value })}>
                                            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                    <Button onClick={() => setIsAddingExpense(true)}><DollarSign size={16} /> Add Manual Expense</Button>
                                    {selectedExpenseIds.length > 0 && (
                                        <Button variant="danger" onClick={handleBulkDeleteExpenses}>Delete Selected ({selectedExpenseIds.length})</Button>
                                    )}
                                    {isAdmin && expenses.length > 0 && (
                                        <Button variant="danger" onClick={handleDeleteAllExpenses}>Delete All</Button>
                                    )}
                                </div>
                            </div>
                            <div className={styles.tableContainer}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th><input type="checkbox" onChange={handleSelectAllExpenses} checked={selectedExpenseIds.length === expenses.length && expenses.length > 0} /></th>
                                            <th>Date</th>
                                            <th>Expense Type</th>
                                            <th>Vehicle No</th>
                                            <th>Amount (₹)</th>
                                            <th>Description</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenses.length === 0 ? (
                                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No expense records found.</td></tr>
                                        ) : expenses.map(ex => (
                                            <tr key={ex.id}>
                                                <td><input type="checkbox" checked={selectedExpenseIds.includes(ex.id)} onChange={() => handleSelectOneExpense(ex.id)} /></td>
                                                <td>{formatDate(ex.expenseDate)}</td>
                                                <td><span className={styles.badge} style={{ background: 'var(--color-bg-secondary)' }}>{ex.expenseType}</span></td>
                                                <td>{ex.vehicleNo || 'N/A'}</td>
                                                <td><span style={{ color: '#ef4444', fontWeight: 600 }}>₹{Number(ex.amount || 0).toLocaleString('en-IN')}</span></td>
                                                <td title={ex.description}>{ex.description || '-'}</td>
                                                <td>
                                                    <button className={`${styles.iconBtn} ${styles.dangerIcon}`} onClick={() => handleDeleteOneExpense(ex.id)}><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {expenses.length > 0 && (
                                <div className={styles.pagination}>
                                    <Button variant="outline" disabled={expensePage === 1} onClick={() => setExpensePage(p => p - 1)}>Previous</Button>
                                    <span className={styles.pageInfo}>Page {expensePage} of {expenseTotalPages || 1}</span>
                                    <Button variant="outline" disabled={expensePage >= expenseTotalPages} onClick={() => setExpensePage(p => p + 1)}>Next</Button>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Expenses Sidebar */}
                    <div className={styles.sidebar}>
                        <Card className={styles.uploadCard}>
                            <h3 className={styles.sidebarTitle}>Upload Expenses</h3>
                            <p className={styles.sidebarDesc}>Columns: Date, Type, Amount, Vehicle No, Description</p>
                            <div className={styles.colBadges}>
                                <span>Date</span><span>Type</span><span>Amount</span><span>Vehicle No</span><span>Description</span>
                            </div>
                            <div className={styles.uploadBox}>
                                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} id="expensesUpload" className={styles.fileInput} />
                                <label htmlFor="expensesUpload" className={styles.fileLabel}>
                                    <Upload size={18} />
                                    {file && activeTab === 'expenses' ? file.name : 'Choose File'}
                                </label>
                                <Button onClick={handleUpload} disabled={!file || loading} style={{ width: '100%', marginTop: '1rem' }}>
                                    {loading ? 'Uploading...' : 'Upload Data'}
                                </Button>
                            </div>
                            {uploadStatus && (
                                <div className={`${styles.status} ${styles[uploadStatus.type]}`}>{uploadStatus.message}</div>
                            )}
                        </Card>

                        <Card className={styles.suggestionsCard}>
                            <h3 className={styles.sidebarTitle}>Cost Breakdown</h3>
                            <div className={styles.suggestionBox}>
                                {expenseAnalytics.breakdown.length === 0 ? <p>No data available</p> : 
                                 expenseAnalytics.breakdown.map((item, idx) => (
                                    <div key={idx} style={{ marginBottom: '1rem' }}>
                                        <div className={styles.suggestionHeader}>
                                            <span className={styles.suggestionDot} style={{ 
                                                backgroundColor: item.expenseType === 'Diesel cost' ? '#34d399' : 
                                                                 item.expenseType === 'Maintenance cost' ? '#fbbf24' : 
                                                                 item.expenseType === 'Veh Due' ? '#6366f1' : '#ec4899' 
                                            }}></span>
                                            <h4>{item.expenseType}</h4>
                                        </div>
                                        <p className={styles.suggestionAmount}>₹{Number(item.total || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                 ))
                                }
                            </div>
                        </Card>
                    </div>
                </div>
            )}
            {activeTab === 'analytics' && (
                <div className={styles.analyticsSection}>
                    {/* Time-Based Filter */}
                    <Card className={styles.analyticsFilterCard}>
                        <div className={styles.filterRow}>
                            <div className={styles.filterLabel}>
                                <Calendar size={18} />
                                <span>Time Period</span>
                            </div>
                            <div className={styles.filterBtnGroup}>
                                {[
                                    { key: 'week', label: 'This Week' },
                                    { key: 'month', label: 'This Month' },
                                    { key: 'year', label: 'This Year' },
                                    { key: 'custom', label: 'Custom' }
                                ].map(f => (
                                    <button key={f.key} className={`${styles.filterBtn} ${analyticsFilter === f.key ? styles.filterBtnActive : ''}`} onClick={() => setAnalyticsFilter(f.key)}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            {analyticsFilter === 'custom' && (
                                <div className={styles.customDateRow}>
                                    <input type="date" className={styles.dateRangeInput} value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                                    <span className={styles.dateSeparator}>to</span>
                                    <input type="date" className={styles.dateRangeInput} value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Key Metrics — Basic Payments Only */}
                    <div className={styles.analyticsKpiRow}>
                        <Card className={styles.analyticsKpiCard}>
                            <div className={styles.analyticsKpiIcon} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                                <DollarSign size={24} color="#fff" />
                            </div>
                            <div className={styles.analyticsKpiInfo}>
                                <p className={styles.analyticsKpiLabel}>Total Payment Received</p>
                                <h3 className={styles.analyticsKpiValue}>₹{Number(analyticsData.totalReceived || 0).toLocaleString('en-IN')}</h3>
                                <span className={styles.analyticsKpiSubtext}>{getFilterLabel()}</span>
                            </div>
                        </Card>
                        <Card className={styles.analyticsKpiCard}>
                            <div className={styles.analyticsKpiIcon} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                                <FileText size={24} color="#fff" />
                            </div>
                            <div className={styles.analyticsKpiInfo}>
                                <p className={styles.analyticsKpiLabel}>Total Transactions</p>
                                <h3 className={styles.analyticsKpiValue}>{Number(analyticsData.transactionCount || 0).toLocaleString('en-IN')}</h3>
                                <span className={styles.analyticsKpiSubtext}>{getFilterLabel()}</span>
                            </div>
                        </Card>
                    </div>

                    {/* Yearly Breakdown */}
                    <Card className={styles.yearlyBreakdownCard}>
                        <div className={styles.yearlyHeader}>
                            <div>
                                <h3 className={styles.chartTitle}>
                                    <BarChart3 size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                    Yearly Breakdown — {yearlyBreakdownYear}
                                </h3>
                                <p className={styles.yearlySubtext}>Total: ₹{yearlyTotal.toLocaleString('en-IN')}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <select className={styles.filterSelect} value={yearlyBreakdownYear} onChange={(e) => setYearlyBreakdownYear(e.target.value)}>
                                    {yearOptions.map(y => (<option key={y} value={y}>{y}</option>))}
                                </select>
                                <Button variant="outline" onClick={exportYearlyBreakdown} className={styles.exportBtn}>
                                    <Download size={16} /> Export CSV
                                </Button>
                            </div>
                        </div>

                        <div style={{ height: '300px', marginTop: '1.5rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={yearlyBreakdownData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis dataKey="monthName" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 13 }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v > 0 ? `₹${(v / 1000).toFixed(0)}k` : '₹0'} />
                                    <ChartTooltip
                                        formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Received']}
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                                        itemStyle={{ color: '#34d399', fontWeight: 600 }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                    />
                                    <Area type="monotone" dataKey="totalReceived" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReceived)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className={styles.yearlyGrid}>
                            {yearlyBreakdownData.map((m, i) => (
                                <div key={m.month || i} className={`${styles.monthCard} ${m.totalReceived > 0 ? styles.monthCardActive : ''}`}>
                                    <div className={styles.monthTitle}>{m.monthName}</div>
                                    <div className={styles.monthValue}>₹{Number(m.totalReceived || 0).toLocaleString('en-IN')}</div>
                                </div>
                            ))}
                        </div>
                    </Card>
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
                                    <div className={styles.formGroup}><label>Invoice No</label><input type="text" value={editingInvoiceData.invoiceNo || ''} onChange={(e) => setEditingInvoiceData({ ...editingInvoiceData, invoiceNo: e.target.value })} /></div>
                                    <div className={styles.formGroup}><label>Payment Date</label><input type="date" value={editingInvoiceData.paymentDate || ''} onChange={(e) => setEditingInvoiceData({ ...editingInvoiceData, paymentDate: e.target.value })} /></div>
                                    <div className={styles.formGroup}><label>My Rate</label><input type="number" value={editingInvoiceData.myRate || 0} onChange={(e) => setEditingInvoiceData({ ...editingInvoiceData, myRate: e.target.value })} /></div>
                                    <div className={styles.formGroup}><label>Nippon Rate</label><input type="number" value={editingInvoiceData.nipponRate || 0} onChange={(e) => setEditingInvoiceData({ ...editingInvoiceData, nipponRate: e.target.value })} /></div>
                                    <div className={styles.formGroup}><label>TDS</label><input type="number" value={editingInvoiceData.tds || 0} onChange={(e) => setEditingInvoiceData({ ...editingInvoiceData, tds: e.target.value })} /></div>
                                    <div className={styles.formGroup}><label>Total Received</label><input type="number" value={editingInvoiceData.totalReceived || 0} onChange={(e) => setEditingInvoiceData({ ...editingInvoiceData, totalReceived: e.target.value })} /></div>
                                    <div className={styles.formGroup}><label>Deduction</label><input type="number" value={editingInvoiceData.deduction || 0} onChange={(e) => setEditingInvoiceData({ ...editingInvoiceData, deduction: e.target.value })} /></div>
                                    <div className={styles.formGroup}><label>Received Status</label><input type="text" value={editingInvoiceData.receivedStatus || ''} onChange={(e) => setEditingInvoiceData({ ...editingInvoiceData, receivedStatus: e.target.value })} /></div>
                                </div>
                                <div className={styles.modalFooter}>
                                    <Button variant="outline" onClick={() => setIsEditingInvoice(false)} type="button">Cancel</Button>
                                    <Button onClick={handleEditSave} disabled={loading} type="button"><Save size={16} /> Save Changes</Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}

            {/* Manual Expense Modal */}
            {isAddingExpense && (
                <div className={styles.modalOverlay}>
                    <Card className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Add New Expense</h2>
                            <button className={styles.closeBtn} onClick={() => setIsAddingExpense(false)}><X size={24} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <form onSubmit={handleAddExpense}>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>Date</label>
                                        <input type="date" required value={newExpense.expenseDate} onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Expense Type</label>
                                        <select value={newExpense.expenseType} onChange={(e) => setNewExpense({ ...newExpense, expenseType: e.target.value })}>
                                            <option value="Diesel cost">Diesel cost</option>
                                            <option value="Maintenance cost">Maintenance cost</option>
                                            <option value="Veh Due">Veh Due</option>
                                            <option value="Driver cost">Driver cost</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Vehicle No {newExpense.expenseType !== 'Driver cost' && <span style={{ color: '#ef4444' }}>*</span>}</label>
                                        <input type="text" placeholder="e.g. MH 01 AB 1234" value={newExpense.vehicleNo} onChange={(e) => setNewExpense({ ...newExpense, vehicleNo: e.target.value.toUpperCase() })} required={newExpense.expenseType !== 'Driver cost'} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Amount (₹)</label>
                                        <input type="number" step="0.01" required value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} />
                                    </div>
                                    <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                        <label>Description</label>
                                        <textarea placeholder="Optional notes..." value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} />
                                    </div>
                                </div>
                                <div className={styles.modalFooter}>
                                    <Button variant="outline" onClick={() => setIsAddingExpense(false)} type="button">Cancel</Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? 'Saving...' : 'Record Expense'}
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
