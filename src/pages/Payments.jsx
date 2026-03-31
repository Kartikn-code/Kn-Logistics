import { useState, useEffect } from 'react';
import { Upload, DollarSign, FileText, TrendingUp, Trash2, Download, Calendar, BarChart3 } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import styles from './Payments.module.css';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, AreaChart, Area } from 'recharts';
import { getBasicPayments, deleteAllBasicPayments, uploadBasicPayments, getPaymentAnalytics, getPaymentYearlyBreakdown } from '../utils/api';
import { formatDate } from '../utils/dateFormatter';

const Payments = () => {
    const [activeTab, setActiveTab] = useState('payments'); // 'payments' or 'analytics'
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

    const [uploadStatus, setUploadStatus] = useState(null);
    const [file, setFile] = useState(null);

    // Analytics State
    const [analyticsFilter, setAnalyticsFilter] = useState('month'); // week, month, year, custom
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [analyticsData, setAnalyticsData] = useState({ totalReceived: 0, transactionCount: 0 });
    const [yearlyBreakdownYear, setYearlyBreakdownYear] = useState(new Date().getFullYear().toString());
    const [yearlyBreakdownData, setYearlyBreakdownData] = useState([]);

    // --- Data Fetching ---
    const fetchData = async () => {
        if (activeTab === 'payments') {
            const data = await getBasicPayments(basicPage);
            setBasicPayments(data.data || []);
            setBasicTotalPages(data.pagination?.totalPages || 1);
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
            start = firstDay.toISOString().split('T')[0];
            end = today.toISOString().split('T')[0];
        } else if (analyticsFilter === 'month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            start = firstDay.toISOString().split('T')[0];
            end = today.toISOString().split('T')[0];
        } else if (analyticsFilter === 'year') {
            const firstDay = new Date(today.getFullYear(), 0, 1);
            start = firstDay.toISOString().split('T')[0];
            end = today.toISOString().split('T')[0];
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
    }, [activeTab, basicPage, analyticsFilter, customStartDate, customEndDate, yearlyBreakdownYear]);

    // --- Upload ---
    const handleFileChange = (e) => {
        if (e.target.files) setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const result = await uploadBasicPayments(file);
            setUploadStatus({ type: 'success', message: result.message || 'File uploaded successfully!' });
            setFile(null);
            const input = document.getElementById('basicUpload');
            if (input) input.value = '';
            fetchData();
        } catch (error) {
            setUploadStatus({ type: 'error', message: 'Upload failed.' });
        }
        setLoading(false);
        setTimeout(() => setUploadStatus(null), 4000);
    };

    // --- Delete All ---
    const handleDeleteAllBasicPayments = async () => {
        if (!window.confirm('WARNING: Are you sure you want to permanently delete ALL basic payment records?')) return;
        setLoading(true);
        try {
            await deleteAllBasicPayments();
            fetchData();
        } catch (error) {
            alert('Failed to delete all basic payments');
        }
        setLoading(false);
    };

    // --- CSV Export ---
    const downloadCSV = (data, filename) => {
        if (!data || data.length === 0) {
            alert('No data to export.');
            return;
        }
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

    const exportYearlyBreakdown = () => {
        downloadCSV(yearlyBreakdownData.map(m => ({
            'Month': m.monthName,
            'Total Received (₹)': Number(m.totalReceived || 0)
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

    // --- Year options for selector ---
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());

    // Compute yearly total from breakdown data
    const yearlyTotal = yearlyBreakdownData.reduce((sum, m) => sum + (m.totalReceived || 0), 0);

    return (
        <div className={styles.paymentsPage}>
            {/* Header */}
            <div className={styles.headerArea}>
                <h1 className={styles.pageTitle}>Payments Dashboard</h1>
                <div className={styles.headerRight}>
                    <div className={styles.tabContainer}>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'payments' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('payments')}
                        >
                            <DollarSign size={16} /> Payments
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'analytics' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('analytics')}
                        >
                            <TrendingUp size={16} /> Analytics
                        </button>
                    </div>
                </div>
            </div>

            {/* ========== PAYMENTS TAB ========== */}
            {activeTab === 'payments' && (
                <div className={styles.contentGrid}>
                    {/* Basic Payments Table */}
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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {basicPayments.length === 0 ? (
                                            <tr><td colSpan="2" style={{ textAlign: 'center', padding: '2rem' }}>No records found. Upload an Excel file to add payment data.</td></tr>
                                        ) : basicPayments.map(pay => (
                                            <tr key={pay.id}>
                                                <td>{formatDate(pay.paymentDate)}</td>
                                                <td><span style={{ fontWeight: '600', color: '#10b981' }}>₹{Number(pay.paymentAmount || 0).toLocaleString('en-IN')}</span></td>
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
                                    {file ? file.name : 'Choose File'}
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

            {/* ========== ANALYTICS TAB ========== */}
            {activeTab === 'analytics' && (
                <div className={styles.analyticsSection}>
                    {/* Time-Based Filter Row */}
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
                                    <button
                                        key={f.key}
                                        className={`${styles.filterBtn} ${analyticsFilter === f.key ? styles.filterBtnActive : ''}`}
                                        onClick={() => setAnalyticsFilter(f.key)}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            {analyticsFilter === 'custom' && (
                                <div className={styles.customDateRow}>
                                    <input
                                        type="date"
                                        className={styles.dateRangeInput}
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                    />
                                    <span className={styles.dateSeparator}>to</span>
                                    <input
                                        type="date"
                                        className={styles.dateRangeInput}
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                    />
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

                    {/* Yearly Breakdown Section */}
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
                                <select
                                    className={styles.filterSelect}
                                    value={yearlyBreakdownYear}
                                    onChange={(e) => setYearlyBreakdownYear(e.target.value)}
                                >
                                    {yearOptions.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <Button variant="outline" onClick={exportYearlyBreakdown} className={styles.exportBtn}>
                                    <Download size={16} /> Export CSV
                                </Button>
                            </div>
                        </div>

                        {/* Monthly Trend Chart */}
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
                                    <YAxis stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => v > 0 ? `₹${(v / 1000).toFixed(0)}k` : '₹0'} />
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

                        {/* Month Cards Grid */}
                        <div className={styles.yearlyGrid}>
                            {yearlyBreakdownData.map((m, i) => (
                                <div key={m.month || i} className={`${styles.monthCard} ${m.totalReceived > 0 ? styles.monthCardActive : ''}`}>
                                    <div className={styles.monthTitle}>{m.monthName}</div>
                                    <div className={styles.monthValue}>
                                        ₹{Number(m.totalReceived || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Payments;
