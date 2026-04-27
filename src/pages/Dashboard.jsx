import { useState, useEffect } from 'react';
import { CalendarDays, Filter, Search, TrendingUp, TrendingDown, DollarSign, Package, Truck, Activity, ChevronDown, X, Clock, MapPin, RefreshCcw } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { getAnnualSummary, getTruckEarnings, getMonthlyEarnings, getFilteredRecords, getBillingAnalytics } from '../utils/api';
import { formatDate } from '../utils/dateFormatter';
import LogisticsLoader from '../components/UI/LogisticsLoader';
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
    const [loaded, setLoaded] = useState(false);
    const [billingData, setBillingData] = useState(null);

    // Filter State
    const [filters, setFilters] = useState({
        truckNo: '',
        invoiceNo: '',
        dispatchDate: '',
        paymentStatus: 'All'
    });
    const [appliedFilters, setAppliedFilters] = useState({ paymentStatus: 'All' });
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    const fetchAll = async () => {
        const [annual, trucks, monthly, billing] = await Promise.all([
            getAnnualSummary(appliedFilters.paymentStatus === 'All' ? '' : appliedFilters.paymentStatus),
            getTruckEarnings(selectedYear, appliedFilters.paymentStatus === 'All' ? '' : appliedFilters.paymentStatus),
            getMonthlyEarnings(selectedYear, appliedFilters.paymentStatus === 'All' ? '' : appliedFilters.paymentStatus),
            getBillingAnalytics(selectedYear)
        ]);
        setAnnualData(annual);
        setTruckData(trucks);
        setMonthlyData(monthly);
        setBillingData(billing);

        if (annual && annual.length > 0) {
            const years = annual.map(a => a.year);
            if (!years.includes(selectedYear)) {
                setSelectedYear(years[0]);
                return;
            }
        }
        setLoaded(true);
    };

    useEffect(() => {
        fetchAll();
        handleFilterSubmit();
        const interval = setInterval(fetchAll, 30000);
        return () => clearInterval(interval);
    }, [selectedYear, appliedFilters.paymentStatus]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleFilterSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsFiltering(true);
        setAppliedFilters({ paymentStatus: filters.paymentStatus });
        const data = await getFilteredRecords({ ...filters, year: selectedYear });
        setFilteredRecords(data);
        setIsFiltering(false);
    };

    const handleClearFilters = async () => {
        const clearedFilters = {
            truckNo: '',
            invoiceNo: '',
            dispatchDate: '',
            paymentStatus: 'All'
        };
        setFilters(clearedFilters);
        setAppliedFilters({ paymentStatus: 'All' });
        setIsFiltering(true);
        const data = await getFilteredRecords({ ...clearedFilters, year: selectedYear });
        setFilteredRecords(data);
        setIsFiltering(false);
    };

    const currentYearData = annualData.length > 0 ? annualData.find(a => a.year === selectedYear) || annualData[0] : { totalEarnings: 0, totalExpenses: 0, netProfit: 0, totalTrips: 0, totalTons: 0 };
    const availableYears = annualData.map(a => a.year).length > 0 ? annualData.map(a => a.year) : [new Date().getFullYear().toString()];
    const COLORS = ['#0d9488', '#0ea5e9', '#6366f1', '#8b5cf6', '#f59e0b', '#f43f5e', '#14b8a6', '#4f46e5'];

    return (
        <div className={styles.dashboardPage}>
            {!loaded && <LogisticsLoader message="Optimizing Fleet View..." />}
            
            <div className={styles.container}>
                <div className={styles.dashboardLayout}>
                    {/* Main Content Area */}
                    <main className={styles.mainContent}>
                        <header className={styles.header}>
                            <div className={styles.headerLeft}>
                                <h1>Dispatch Analytics</h1>
                                <p>Operational and financial intelligence hub</p>
                            </div>
                            <div className={styles.headerActions}>
                                <Button variant="secondary" onClick={() => { setLoaded(false); fetchAll(); }} className={styles.refreshBtn}>
                                    <RefreshCcw size={16} /> Sync Data
                                </Button>
                            </div>
                        </header>

                        {/* KPI Cards */}
                        <div className={styles.kpiGrid}>
                            <StatCard title="Revenue" value={formatCurrency(currentYearData.totalEarnings)} icon={TrendingUp} color="var(--color-primary)" />
                            <StatCard title="Net Profit" value={formatCurrency(currentYearData.netProfit)} icon={DollarSign} color="var(--color-secondary)" />
                            <StatCard title="Total Tonnage" value={`${currentYearData.totalTons || 0} T`} icon={Package} color="#f59e0b" />
                            <StatCard title="Total Trips" value={currentYearData.totalTrips || 0} icon={Truck} color="#8b5cf6" />
                        </div>

                        {/* Primary Charts */}
                        <div className={styles.chartsGrid}>
                            <Card className={styles.chartCard}>
                                <div className={styles.cardHeader}>
                                    <h2 className={styles.chartTitle}>Revenue & Costs - {selectedYear}</h2>
                                    <Activity size={18} color="var(--color-primary)" />
                                </div>
                                <div className={styles.chartWrapper}>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={monthlyData}>
                                            <defs>
                                                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} tick={{ fontSize: 12 }} />
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                            <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                                            <Area type="monotone" dataKey="earnings" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" />
                                            <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fill="transparent" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            <Card className={styles.chartCard}>
                                <div className={styles.cardHeader}>
                                    <h2 className={styles.chartTitle}>Revenue by Truck</h2>
                                    <Truck size={18} color="var(--color-secondary)" />
                                </div>
                                <div className={styles.chartWrapper}>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={truckData.slice(0, 8)}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="earnings"
                                                nameKey="truckNumber"
                                            >
                                                {truckData.slice(0, 8).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                                            <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>

                        {/* Table Section */}
                        <div className={styles.tableSection}>
                            <div className={styles.sectionHeader}>
                                <h2>Detailed Dispatch Logs</h2>
                                <span className={styles.badge}>{filteredRecords.length} Records</span>
                            </div>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Invoice</th>
                                            <th>Dispatch</th>
                                            <th>LR No</th>
                                            <th>Route</th>
                                            <th>Truck</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isFiltering ? (
                                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Fetching Records...</td></tr>
                                        ) : filteredRecords.length > 0 ? (
                                            filteredRecords.map((record) => (
                                                <tr key={record.id}>
                                                    <td>{record.invoiceNo || '-'}</td>
                                                    <td>{formatDate(record.dispatchDate)}</td>
                                                    <td>{record.lrNo || '-'}</td>
                                                    <td>
                                                        <div className={styles.routeCol}>
                                                            <span>{record.sourceLocation}</span>
                                                            <div className={styles.routeArrow} />
                                                            <span>{record.finalDestination}</span>
                                                        </div>
                                                    </td>
                                                    <td className={styles.truckCol}>{record.truckNo}</td>
                                                    <td className={styles.totalCol}>{formatCurrency(record.total)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>No data found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </main>

                    {/* Integrated Side Filter Panel */}
                    <aside className={styles.filterSidebar}>
                        <div className={styles.sidebarHeader}>
                            <Filter size={20} />
                            <h2>Fleet Filters</h2>
                        </div>

                        <div className={styles.filterSection}>
                            <label className={styles.filterLabel}>Reporting Year</label>
                            <div className={styles.selectWrapper}>
                                <select 
                                    value={selectedYear} 
                                    onChange={(e) => { setLoaded(false); setSelectedYear(e.target.value); }}
                                    className={styles.sidebarSelect}
                                >
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <ChevronDown size={14} className={styles.selectIcon} />
                            </div>
                        </div>

                        <form onSubmit={handleFilterSubmit} className={styles.sidebarForm}>
                            <div className={styles.filterSection}>
                                <label className={styles.filterLabel}>Truck Number</label>
                                <input type="text" name="truckNo" value={filters.truckNo} onChange={handleFilterChange} placeholder="e.g. TN 12..." />
                            </div>

                            <div className={styles.filterSection}>
                                <label className={styles.filterLabel}>Invoice Number</label>
                                <input type="text" name="invoiceNo" value={filters.invoiceNo} onChange={handleFilterChange} placeholder="INV-001" />
                            </div>

                            <div className={styles.filterSection}>
                                <label className={styles.filterLabel}>Payment Status</label>
                                <div className={styles.selectWrapper}>
                                    <select name="paymentStatus" value={filters.paymentStatus} onChange={handleFilterChange} className={styles.sidebarSelect}>
                                        <option value="All">All Statuses</option>
                                        <option value="Received">Received</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                    <ChevronDown size={14} className={styles.selectIcon} />
                                </div>
                            </div>

                            <div className={styles.sidebarActions}>
                                <Button type="submit" disabled={isFiltering} fullWidth>
                                    <Search size={16} /> Apply Filters
                                </Button>
                                <Button type="button" variant="secondary" onClick={handleClearFilters} disabled={isFiltering} fullWidth>
                                    <X size={16} /> Reset
                                </Button>
                            </div>
                        </form>

                        <div className={styles.sidebarFooter}>
                            <div className={styles.healthCheck}>
                                <div className={styles.statusDot} />
                                <span>Real-time Sync Active</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => {
    const Icon = icon;
    return (
        <Card className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: `${color}15`, color: color }}>
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
