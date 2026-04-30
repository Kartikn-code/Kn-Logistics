import { useState, useEffect } from 'react';
import { 
    CalendarDays, Filter, Search, TrendingUp, TrendingDown, DollarSign, 
    Package, Truck, Activity, ChevronDown, X, Clock, MapPin, 
    RefreshCcw, LayoutDashboard, Database, BarChart3, ArrowRight 
} from 'lucide-react';
import { 
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
    ResponsiveContainer, Legend 
} from 'recharts';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { 
    getAnnualSummary, getTruckEarnings, getMonthlyEarnings, 
    getFilteredRecords 
} from '../utils/api';
import { formatDate } from '../utils/dateFormatter';
import styles from './Dashboard.module.css';
import { useTheme } from '../context/ThemeContext';
import clsx from 'clsx';

// Helper: Format Currency with fallbacks
const formatCurrency = (val) => {
    if (val === undefined || val === null) return '₹0';
    const num = Number(val);
    if (isNaN(num)) return '₹0';
    
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString('en-IN')}`;
};

// Sub-component: StatCard (Moved to top to prevent initialization errors)
const StatCard = ({ title, value, icon, color, trend }) => {
    const Icon = icon || Activity; // Fallback icon
    const safeColor = color || '#10b981';
    
    return (
        <Card className={styles.statCard} hover={true}>
            <div className={styles.statTopRow}>
                <div className={styles.statIcon} style={{ background: `${safeColor}15`, color: safeColor }}>
                    <Icon size={22} />
                </div>
                <span className={styles.trendText} style={{ color: safeColor }}>{trend}</span>
            </div>
            <div className={styles.statContent}>
                <p className="label-text">{title}</p>
                <h3 className={clsx("heading-lg", styles.statValue)}>{value || '0'}</h3>
            </div>
            <div className={styles.progressContainer}>
                <div className={styles.progressBar} style={{ width: '65%', background: safeColor }} />
            </div>
        </Card>
    );
};

const Dashboard = () => {
    const [annualData, setAnnualData] = useState([]);
    const [truckData, setTruckData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [isFiltering, setIsFiltering] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const { theme } = useTheme();

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    const fetchAll = async () => {
        try {
            const [annual, trucks, monthly] = await Promise.all([
                getAnnualSummary(''),
                getTruckEarnings(selectedYear, ''),
                getMonthlyEarnings(selectedYear, '')
            ]);
            setAnnualData(Array.isArray(annual) ? annual : []);
            setTruckData(Array.isArray(trucks) ? trucks : []);
            setMonthlyData(Array.isArray(monthly) ? monthly : []);
            setLoaded(true);
        } catch (error) {
            console.error("Dashboard data fetch error:", error);
        }
    };

    useEffect(() => {
        fetchAll();
        fetchLogs();
    }, [selectedYear]);

    const fetchLogs = async () => {
        setIsFiltering(true);
        try {
            const data = await getFilteredRecords({ year: selectedYear });
            setFilteredRecords(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Dashboard logs fetch error:", error);
        } finally {
            setIsFiltering(false);
        }
    };

    const currentYearData = annualData.length > 0 
        ? annualData.find(a => a.year === selectedYear) || annualData[0] 
        : { totalEarnings: 0, totalExpenses: 0, netProfit: 0, totalTrips: 0, totalTons: 0 };
    
    // Theme-aware Chart Colors
    const primaryColor = theme === 'dark' ? '#10b981' : '#0ea5e9';
    const secondaryColor = theme === 'dark' ? '#f472b6' : '#db2777';
    const CHART_COLORS = [primaryColor, secondaryColor, '#f59e0b', '#6366f1', '#8b5cf6', '#14b8a6'];

    return (
        <div className={styles.dashboardPage}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className="heading-xl">Executive Overview</h1>
                        <p className={styles.subtitle}>Intelligent fleet management & operational intelligence</p>
                    </div>
                    <div className={styles.headerActions}>
                        <Button variant="secondary" onClick={fetchAll} className={styles.refreshBtn}>
                            <RefreshCcw size={16} /> Sync Live Data
                        </Button>
                    </div>
                </header>

                {/* KPI Cards */}
                <div className={styles.kpiGrid}>
                    <StatCard 
                        title="Revenue" 
                        value={formatCurrency(currentYearData.totalEarnings)} 
                        icon={TrendingUp} 
                        color={primaryColor} 
                        trend="+12%" 
                    />
                    <StatCard 
                        title="Net Savings" 
                        value={formatCurrency(currentYearData.netProfit)} 
                        icon={DollarSign} 
                        color={secondaryColor} 
                        trend="+5%" 
                    />
                    <StatCard 
                        title="Tonnage" 
                        value={`${currentYearData.totalTons || 0} T`} 
                        icon={Package} 
                        color="#f59e0b" 
                        trend="Stable" 
                    />
                    <StatCard 
                        title="Total Trips" 
                        value={currentYearData.totalTrips || 0} 
                        icon={Truck} 
                        color="#8b5cf6" 
                        trend="High" 
                    />
                </div>

                {/* Charts Section */}
                <div className={styles.chartsGrid}>
                    <Card className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h2 className="heading-md">Revenue Trajectory</h2>
                            <BarChart3 size={18} color={primaryColor} />
                        </div>
                        <div className={styles.chartWrapper}>
                            <ResponsiveContainer width="100%" height={320}>
                                <AreaChart data={monthlyData}>
                                    <defs>
                                        <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.15} />
                                            <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)', fontWeight: 600 }} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} tick={{ fontSize: 12, fill: 'var(--color-text-muted)', fontWeight: 600 }} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-lg)', background: 'var(--color-bg-primary)' }}
                                        itemStyle={{ color: 'var(--color-text-primary)', fontWeight: 700 }}
                                        formatter={(val) => formatCurrency(val)} 
                                    />
                                    <Area type="monotone" dataKey="earnings" stroke={primaryColor} strokeWidth={4} fillOpacity={1} fill="url(#colorPrimary)" />
                                    <Area type="monotone" dataKey="expenses" stroke={secondaryColor} strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h2 className="heading-md">Fleet Utilization</h2>
                            <Database size={18} color={secondaryColor} />
                        </div>
                        <div className={styles.chartWrapper}>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie
                                        data={truckData.slice(0, 5)}
                                        cx="50%" cy="50%"
                                        innerRadius={70} outerRadius={100}
                                        paddingAngle={8}
                                        dataKey="earnings"
                                        nameKey="truckNumber"
                                    >
                                        {truckData.slice(0, 5).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-lg)', background: 'var(--color-bg-primary)' }}
                                        formatter={(val) => formatCurrency(val)} 
                                    />
                                    <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Operations Table - Responsive Card View */}
                <div className={styles.tableSection}>
                    <div className={styles.sectionHeader}>
                        <h2 className="heading-md">Operational Intelligence</h2>
                        <span className={styles.recordCount}>{filteredRecords.length} Live Logs</span>
                    </div>

                    {/* Desktop View */}
                    <div className={styles.desktopTable}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className="label-text">Ref ID</th>
                                    <th className="label-text">Dispatch</th>
                                    <th className="label-text">Vehicle</th>
                                    <th className="label-text">Transit Route</th>
                                    <th className="label-text">Valuation</th>
                                    <th className="label-text">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((record) => (
                                    <tr key={record.id}>
                                        <td className={styles.refCell}>{record.invoiceNo || record.id?.slice(0, 8) || 'N/A'}</td>
                                        <td>{formatDate(record.dispatchDate)}</td>
                                        <td className={styles.vehicleCell}>{record.truckNo}</td>
                                        <td>
                                            <div className={styles.routeCell}>
                                                <span>{record.sourceLocation}</span>
                                                <ArrowRight size={14} className={styles.routeIcon} />
                                                <span>{record.finalDestination}</span>
                                            </div>
                                        </td>
                                        <td className="value-text">{formatCurrency(record.total)}</td>
                                        <td><span className={styles.statusBadge}>Verified</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View - Card based */}
                    <div className={styles.mobileCards}>
                        {filteredRecords.map((record) => (
                            <div key={record.id} className={styles.mobileCard}>
                                <div className={styles.cardTop}>
                                    <span className={styles.refCell}>{record.invoiceNo || record.id?.slice(0, 8) || 'N/A'}</span>
                                    <span className={styles.statusBadge}>Verified</span>
                                </div>
                                <div className={styles.cardMid}>
                                    <div className={styles.routeCell}>
                                        <span>{record.sourceLocation}</span>
                                        <ArrowRight size={14} />
                                        <span>{record.finalDestination}</span>
                                    </div>
                                    <div className={styles.cardDetails}>
                                        <span className={styles.vehicleCell}>{record.truckNo}</span>
                                        <span className="value-text">{formatCurrency(record.total)}</span>
                                    </div>
                                </div>
                                <div className={styles.cardBot}>
                                    <span className={styles.dateLabel}>{formatDate(record.dispatchDate)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
