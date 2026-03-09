import { useState, useEffect } from 'react';
import { CalendarDays, Filter, Search, TrendingUp, TrendingDown, DollarSign, Package, Truck, Activity, ChevronDown, X } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { getAnnualSummary, getTruckEarnings, getMonthlyEarnings, getFilteredRecords } from '../utils/api';
import { formatDate } from '../utils/dateFormatter';
import styles from './Dashboard.module.css';

const formatCurrency = (val) => {
    if (val === undefined || val === null) return '—';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toLocaleString('en-IN')}`;
};

const Dashboard = () => {
    const [annualData, setAnnualData] = useState([]);
    const [truckData, setTruckData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [isFiltering, setIsFiltering] = useState(false);

    // Filter State
    const [filters, setFilters] = useState({
        truckNo: '',
        invoiceNo: '',
        dispatchDate: '',

    });

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            const [annual, trucks, monthly] = await Promise.all([
                getAnnualSummary(),
                getTruckEarnings(selectedYear),
                getMonthlyEarnings(selectedYear)
            ]);
            setAnnualData(annual);
            setTruckData(trucks);
            setMonthlyData(monthly);

            // Auto-select valid year if current one has no data but other years do
            if (annual && annual.length > 0) {
                const years = annual.map(a => a.year);
                if (!years.includes(selectedYear)) {
                    setSelectedYear(years[0]); // Select latest year
                    return; // The change in selectedYear will re-trigger useEffect
                }
            }

            setTimeout(() => setLoaded(true), 100);
        };

        fetchAll();
        handleFilterSubmit(); // Initial fetch for filters
        const interval = setInterval(fetchAll, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, [selectedYear]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleFilterSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsFiltering(true);
        const data = await getFilteredRecords({ ...filters, year: selectedYear });
        setFilteredRecords(data);
        setIsFiltering(false);
    };

    const handleClearFilters = async () => {
        const clearedFilters = {
            truckNo: '',
            invoiceNo: '',
            dispatchDate: '',
        };
        setFilters(clearedFilters);
        setIsFiltering(true);
        const data = await getFilteredRecords({ ...clearedFilters, year: selectedYear });
        setFilteredRecords(data);
        setIsFiltering(false);
    };

    const currentYearData = annualData.length > 0 ? annualData.find(a => a.year === selectedYear) || annualData[0] : { totalEarnings: 0, totalExpenses: 0, netProfit: 0, totalTrips: 0, totalTons: 0 };

    const availableYears = annualData.map(a => a.year).length > 0
        ? annualData.map(a => a.year)
        : [new Date().getFullYear().toString()];

    const COLORS = ['#10b981', '#0ea5e9', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'];

    return (
        <div className={styles.dashboardPage}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1>Dispatch Analytics</h1>
                        <p>Comprehensive operations and financial overview</p>
                    </div>
                    <div className={styles.yearSelector}>
                        <CalendarDays size={16} />
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', marginRight: '4px' }}>Year:</span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <select
                                className={styles.yearSelectDropdown}
                                value={selectedYear}
                                onChange={(e) => {
                                    setLoaded(false);
                                    setSelectedYear(e.target.value);
                                }}
                            >
                                {availableYears.map(y => (
                                    <option key={y} value={y} style={{ color: '#111' }}>{y}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: 0, pointerEvents: 'none', color: '#fff' }} />
                        </div>
                    </div>
                </header>

                {/* KPI Cards */}
                <div className={styles.grid}>
                    <StatCard title="Total Revenue" value={formatCurrency(currentYearData.totalEarnings)} icon={TrendingUp} color="#10b981" />
                    <StatCard title="Net Profit" value={formatCurrency(currentYearData.netProfit)} icon={DollarSign} color="#0ea5e9" />
                    <StatCard title="Operating Costs" value={formatCurrency(currentYearData.totalExpenses)} icon={TrendingDown} color="#ef4444" />
                    <StatCard title="Total Tonnage" value={`${currentYearData.totalTons || 0} T`} icon={Package} color="#f59e0b" />
                    <StatCard title="Recorded Trips" value={currentYearData.totalTrips || 0} icon={Truck} color="#8b5cf6" />
                </div>

                {/* Main Charts Grid */}
                <div className={styles.chartsGrid}>
                    {/* Monthly Earnings Recharts Area Chart */}
                    <Card className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
                        <h2 className={styles.chartTitle}>Financial Trajectory - {selectedYear}</h2>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="monthName" stroke="#94a3b8" tick={{ fill: '#475569' }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#94a3b8" tick={{ fill: '#475569' }} tickFormatter={(val) => `₹${val / 1000}k`} axisLine={false} tickLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        formatter={(value) => formatCurrency(value)}
                                    />
                                    <Legend iconType="circle" />
                                    <Area type="monotone" dataKey="earnings" name="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" activeDot={{ r: 6 }} />
                                    <Area type="monotone" dataKey="expenses" name="Costs" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Truck-based Earnings Pie Chart */}
                    <Card className={styles.chartCard}>
                        <h2 className={styles.chartTitle}>Revenue by Truck - {selectedYear}</h2>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={truckData.slice(0, 8)} // Top 8 trucks
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="earnings"
                                        nameKey="truckNumber"
                                    >
                                        {truckData.slice(0, 8).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
                                        formatter={(value) => formatCurrency(value)}
                                    />
                                    <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Filter and Raw Data */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Filter size={22} color="#10b981" />
                        Explore Dispatch Records
                    </h2>
                    <Card className={styles.filterCard}>
                        <form onSubmit={handleFilterSubmit} className={styles.filterForm}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Truck Number</label>
                                    <input type="text" name="truckNo" value={filters.truckNo} onChange={handleFilterChange} placeholder="TN-12..." />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Invoice No.</label>
                                    <input type="text" name="invoiceNo" value={filters.invoiceNo} onChange={handleFilterChange} placeholder="INV-1234" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Dispatch Date</label>
                                    <input type="date" name="dispatchDate" value={filters.dispatchDate} onChange={handleFilterChange} />
                                </div>
                            </div>
                            <div className={styles.formRow} style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                                <div className={styles.formActions} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px', gap: '10px' }}>
                                    <Button type="button" onClick={handleClearFilters} disabled={isFiltering} variant="secondary" style={{ backgroundColor: '#475569', color: '#f8fafc' }}><X size={16} /> Clear</Button>
                                    <Button type="submit" disabled={isFiltering}><Search size={16} /> Apply Filters</Button>
                                </div>
                            </div>
                        </form>

                        {/* Read Only Data Table */}
                        <div className={styles.tableWrapper} style={{ marginTop: '20px' }}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Invoice No.</th>
                                        <th>Dispatch Date</th>
                                        <th>LR. No</th>
                                        <th>From</th>
                                        <th>To</th>
                                        <th>PO.Number</th>
                                        <th>Tons</th>
                                        <th>Truck.No</th>
                                        <th>Date of Arrival</th>
                                        <th>Freight</th>
                                        <th>Multi-Point</th>
                                        <th>Loading</th>
                                        <th>Un Loading</th>
                                        <th>Halting</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isFiltering ? (
                                        <tr><td colSpan="15" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                                    ) : filteredRecords.length > 0 ? (
                                        [...filteredRecords].sort((a, b) => {
                                            if (!a.invoiceNo) return 1;
                                            if (!b.invoiceNo) return -1;
                                            return String(a.invoiceNo).localeCompare(String(b.invoiceNo), undefined, { numeric: true, sensitivity: 'base' });
                                        }).map((record) => (
                                            <tr key={record.id}>
                                                <td>{record.invoiceNo || '-'}</td>
                                                <td>{formatDate(record.dispatchDate)}</td>
                                                <td>{record.lrNo || '-'}</td>
                                                <td>{record.sourceLocation}</td>
                                                <td>{record.finalDestination}</td>
                                                <td>{record.poNumber || '-'}</td>
                                                <td>{record.tons || 0}</td>
                                                <td style={{ fontWeight: 600 }}>{record.truckNo}</td>
                                                <td>{formatDate(record.dateOfArrival)}</td>
                                                <td>{formatCurrency(record.freight)}</td>
                                                <td>{formatCurrency(record.multiPoint)}</td>
                                                <td>{formatCurrency(record.loading)}</td>
                                                <td>{formatCurrency(record.unloading)}</td>
                                                <td>{formatCurrency(record.halt)}</td>
                                                <td style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(record.total)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="15" style={{ textAlign: 'center', padding: '2rem' }}>No records match these filters.</td></tr>
                                    )}
                                </tbody>
                                {!isFiltering && filteredRecords.length > 0 && (
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                                            <td colSpan="14" style={{ textAlign: 'right', fontWeight: 'bold', paddingRight: '1rem', color: 'var(--color-text-primary)' }}>
                                                Grand Total:
                                            </td>
                                            <td style={{ fontWeight: 600, color: '#10b981', fontSize: '1.05rem' }}>
                                                {formatCurrency(filteredRecords.reduce((sum, record) => sum + (Number(record.total) || 0), 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </Card>
                </section>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => {
    const Icon = icon;
    return (
        <Card className={styles.statCard}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: `${color}15`, color: color }}>
                <Icon size={24} />
            </div>
            <div className={styles.statInfo}>
                <p className={styles.statTitle}>{title}</p>
                <h3 className={styles.statValue}>{value}</h3>
            </div>
        </Card>
    );
};

export default Dashboard;
