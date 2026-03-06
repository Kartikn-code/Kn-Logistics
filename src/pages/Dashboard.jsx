import { useState, useEffect } from 'react';
import { LayoutDashboard, Truck, Package, Route, Activity, TrendingUp, TrendingDown, DollarSign, IndianRupee, CalendarDays, Filter, Search } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { getDashboardStats, getAnnualSummary, getTruckEarnings, getMonthlyEarnings, getFilteredRecords } from '../utils/api';
import styles from './Dashboard.module.css';

const formatCurrency = (val) => {
    if (val === undefined || val === null) return '—';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toLocaleString('en-IN')}`;
};

const Dashboard = () => {
    const [stats, setStats] = useState({
        activeTrucks: 0,
        inwardOps: 0,
        outwardOps: 0,
        inTransit: 0
    });
    const [annualData, setAnnualData] = useState([]);
    const [truckData, setTruckData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [isFiltering, setIsFiltering] = useState(false);

    // Filter State
    const [filters, setFilters] = useState({
        truckType: '',
        month: '',
        year: new Date().getFullYear().toString(),
        sourceLocation: '',
        minRevenue: '',
        maxRevenue: ''
    });

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            const [statsData, annual, trucks, monthly] = await Promise.all([
                getDashboardStats(),
                getAnnualSummary(),
                getTruckEarnings(selectedYear),
                getMonthlyEarnings(selectedYear)
            ]);
            setStats(statsData);
            setAnnualData(annual);
            setTruckData(trucks);
            setMonthlyData(monthly);
            setTimeout(() => setLoaded(true), 100);
        };

        fetchAll();
        handleFilterSubmit(); // Initial fetch for filters
        const interval = setInterval(fetchAll, 15000);
        return () => clearInterval(interval);
    }, [selectedYear]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleFilterSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsFiltering(true);
        const data = await getFilteredRecords(filters);
        setFilteredRecords(data);
        setIsFiltering(false);
    };

    const currentYearData = annualData.length > 0 ? annualData[0] : { totalEarnings: 0, totalExpenses: 0, netProfit: 0, totalTrips: 0 };
    const maxTruckEarning = truckData.length > 0 ? Math.max(...truckData.map(t => t.earnings)) : 1;
    const maxMonthValue = monthlyData.length > 0 ? Math.max(...monthlyData.map(m => Math.max(m.earnings, m.expenses)), 1) : 1;

    const availableYears = annualData.map(a => a.year).length > 0
        ? annualData.map(a => a.year)
        : [new Date().getFullYear().toString()];

    return (
        <div className={styles.dashboardPage}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1>Operations Dashboard</h1>
                        <p>Real-time fleet analytics & financial overview</p>
                    </div>
                    <div className={styles.yearSelector}>
                        <CalendarDays size={16} />
                        <select
                            value={selectedYear}
                            onChange={(e) => {
                                setLoaded(false);
                                setSelectedYear(e.target.value);
                            }}
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </header>

                {/* Fleet Status Cards */}
                <div className={styles.grid}>
                    <StatCard title="Active Trucks" value={stats.activeTrucks} icon={Truck} color="#3498DB" />
                    <StatCard title="Platform Total Orders" value={stats.total} icon={Package} color="#9b59b6" />
                    <StatCard title="Annual Recorded Trips" value={currentYearData.totalTrips || 0} icon={Route} color="#f1c40f" />
                    <StatCard title="Vehicles In Transit" value={stats.inTransit} icon={Activity} color="#C0392B" />
                </div>

                {/* Filter Dashboard */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Filter size={22} />
                        Dispatch Records Filter
                    </h2>
                    <Card className={styles.filterCard}>
                        <form onSubmit={handleFilterSubmit} className={styles.filterForm}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Truck Number</label>
                                    <input type="text" name="truckType" value={filters.truckType} onChange={handleFilterChange} placeholder="e.g. TN-12..." />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Month</label>
                                    <select name="month" value={filters.month} onChange={handleFilterChange}>
                                        <option value="">All Months</option>
                                        <option value="1">January</option>
                                        <option value="2">February</option>
                                        <option value="3">March</option>
                                        <option value="4">April</option>
                                        <option value="5">May</option>
                                        <option value="6">June</option>
                                        <option value="7">July</option>
                                        <option value="8">August</option>
                                        <option value="9">September</option>
                                        <option value="10">October</option>
                                        <option value="11">November</option>
                                        <option value="12">December</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Year</label>
                                    <select name="year" value={filters.year} onChange={handleFilterChange}>
                                        <option value="">All Years</option>
                                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Source Location</label>
                                    <input type="text" name="sourceLocation" value={filters.sourceLocation} onChange={handleFilterChange} placeholder="City name" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Min Revenue (₹)</label>
                                    <input type="number" name="minRevenue" value={filters.minRevenue} onChange={handleFilterChange} placeholder="0" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Max Revenue (₹)</label>
                                    <input type="number" name="maxRevenue" value={filters.maxRevenue} onChange={handleFilterChange} placeholder="100000" />
                                </div>
                                <div className={styles.formActions}>
                                    <Button type="submit" disabled={isFiltering}><Search size={16} /> Filter</Button>
                                </div>
                            </div>
                        </form>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Truck No</th>
                                        <th>Source</th>
                                        <th>Destination</th>
                                        <th>Tons</th>
                                        <th>Revenue</th>
                                        <th>Expenses</th>
                                        <th>Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isFiltering ? (
                                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                                    ) : filteredRecords.length > 0 ? (
                                        filteredRecords.map((record) => {
                                            const revenue = record.freight + record.loading + record.unloading + record.halt;
                                            const expenses = record.fuelCost + record.driverFee;
                                            return (
                                                <tr key={record.id}>
                                                    <td>{record.dispatchDate}</td>
                                                    <td>{record.truckNo}</td>
                                                    <td>{record.sourceLocation}</td>
                                                    <td>{record.finalDestination}</td>
                                                    <td>{record.tons}</td>
                                                    <td>{formatCurrency(revenue)}</td>
                                                    <td>{formatCurrency(expenses)}</td>
                                                    <td style={{ color: (revenue - expenses) >= 0 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                                                        {formatCurrency(revenue - expenses)}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    ) : (
                                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No records match these filters.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </section>

                {/* Annual Financial Summary */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <IndianRupee size={22} />
                        Annual Dispatch Summary
                        {currentYearData.year && <span className={styles.yearBadge}>{currentYearData.year || selectedYear}</span>}
                    </h2>
                    <div className={styles.financialGrid}>
                        <FinanceCard
                            title="Total Freight"
                            value={currentYearData.totalEarnings || 0}
                            icon={TrendingUp}
                            gradient="linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)"
                            loaded={loaded}
                        />
                        <FinanceCard
                            title="Operating Costs"
                            value={currentYearData.totalExpenses || 0}
                            icon={TrendingDown}
                            gradient="linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)"
                            loaded={loaded}
                        />
                        <FinanceCard
                            title="Net Profit"
                            value={currentYearData.netProfit || 0}
                            icon={DollarSign}
                            gradient={
                                (currentYearData.netProfit || 0) >= 0
                                    ? "linear-gradient(135deg, #2c3e50 0%, #3498db 100%)"
                                    : "linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)"
                            }
                            loaded={loaded}
                        />
                    </div>

                    {/* Earnings vs Expenses Comparison Bar */}
                    {(currentYearData.totalEarnings > 0 || currentYearData.totalExpenses > 0) && (
                        <Card className={styles.comparisonCard}>
                            <div className={styles.comparisonBar}>
                                <div className={styles.comparisonLabel}>
                                    <span>Earnings vs Expenses Ratio</span>
                                    <span className={styles.ratio}>
                                        {currentYearData.totalExpenses > 0
                                            ? `${((currentYearData.totalEarnings / currentYearData.totalExpenses) * 100).toFixed(0)}%`
                                            : '∞'}
                                    </span>
                                </div>
                                <div className={styles.barTrack}>
                                    <div
                                        className={styles.barEarning}
                                        style={{
                                            width: loaded
                                                ? `${(currentYearData.totalEarnings / (currentYearData.totalEarnings + currentYearData.totalExpenses)) * 100}%`
                                                : '0%'
                                        }}
                                    >
                                        <span>Freight</span>
                                    </div>
                                    <div
                                        className={styles.barExpense}
                                        style={{
                                            width: loaded
                                                ? `${(currentYearData.totalExpenses / (currentYearData.totalEarnings + currentYearData.totalExpenses)) * 100}%`
                                                : '0%'
                                        }}
                                    >
                                        <span>Costs</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </section>

                {/* Truck-based Earnings */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Truck size={22} />
                        Truck-wise Earnings
                    </h2>
                    {truckData.length > 0 ? (
                        <Card className={styles.chartCard}>
                            <div className={styles.truckChart}>
                                {truckData.map((truck, index) => (
                                    <div key={truck.truckNumber} className={styles.truckRow} style={{ animationDelay: `${index * 0.08}s` }}>
                                        <div className={styles.truckInfo}>
                                            <span className={styles.truckNumber}>{truck.truckNumber}</span>
                                            <div className={styles.truckValues}>
                                                <span className={styles.earning}>{formatCurrency(truck.earnings)}</span>
                                                <span className={styles.expense}>-{formatCurrency(truck.expenses)}</span>
                                            </div>
                                        </div>
                                        <div className={styles.truckBarWrapper}>
                                            <div
                                                className={styles.truckBar}
                                                style={{
                                                    width: loaded ? `${(truck.earnings / maxTruckEarning) * 100}%` : '0%',
                                                    animationDelay: `${index * 0.08}s`
                                                }}
                                            />
                                            <div
                                                className={styles.truckBarExpense}
                                                style={{
                                                    width: loaded ? `${(truck.expenses / maxTruckEarning) * 100}%` : '0%',
                                                    animationDelay: `${index * 0.08 + 0.15}s`
                                                }}
                                            />
                                        </div>
                                        <span className={styles.truckProfit} data-positive={truck.profit >= 0}>
                                            {truck.profit >= 0 ? '+' : ''}{formatCurrency(truck.profit)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className={styles.chartLegend}>
                                <span className={styles.legendItem}><span className={styles.legendDotEarning} /> Revenue (Freight+Load+Unload+Halt)</span>
                                <span className={styles.legendItem}><span className={styles.legendDotExpense} /> Operating Costs (Fuel+Driver)</span>
                            </div>
                        </Card>
                    ) : (
                        <Card className={styles.emptyCard}>
                            <Truck size={40} />
                            <p>No truck earnings data available. Upload financial data from the Admin page.</p>
                        </Card>
                    )}
                </section>

                {/* Monthly Earnings Chart */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <CalendarDays size={22} />
                        Month-wise Earnings & Expenses
                        <span className={styles.yearBadge}>{selectedYear}</span>
                    </h2>
                    <Card className={styles.chartCard}>
                        <div className={styles.monthlyChart}>
                            {monthlyData.map((month, index) => (
                                <div key={month.month} className={styles.monthColumn}>
                                    <div className={styles.monthBars}>
                                        <div className={styles.monthBarGroup}>
                                            <div
                                                className={styles.monthBarEarning}
                                                style={{
                                                    height: loaded ? `${(month.earnings / maxMonthValue) * 180}px` : '0px',
                                                    animationDelay: `${index * 0.06}s`
                                                }}
                                                title={`Earnings: ${formatCurrency(month.earnings)}`}
                                            >
                                                {month.earnings > 0 && (
                                                    <span className={styles.barValue}>{formatCurrency(month.earnings)}</span>
                                                )}
                                            </div>
                                            <div
                                                className={styles.monthBarExpense}
                                                style={{
                                                    height: loaded ? `${(month.expenses / maxMonthValue) * 180}px` : '0px',
                                                    animationDelay: `${index * 0.06 + 0.1}s`
                                                }}
                                                title={`Expenses: ${formatCurrency(month.expenses)}`}
                                            >
                                                {month.expenses > 0 && (
                                                    <span className={styles.barValue}>{formatCurrency(month.expenses)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={styles.monthLabel}>{month.monthName}</span>
                                </div>
                            ))}
                        </div>
                        <div className={styles.chartLegend}>
                            <span className={styles.legendItem}><span className={styles.legendDotEarning} /> Revenue</span>
                            <span className={styles.legendItem}><span className={styles.legendDotExpense} /> Operating Costs</span>
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
            <div className={styles.statHeader}>
                <div className={styles.iconBox} style={{ backgroundColor: `${color}20`, color: color }}>
                    <Icon size={24} />
                </div>
                <span className={styles.liveBadge}><span className={styles.pulse}></span> Live</span>
            </div>
            <div className={styles.statContent}>
                <h3>{value}</h3>
                <p>{title}</p>
            </div>
        </Card>
    );
};

const FinanceCard = ({ title, value, icon, gradient, loaded }) => {
    const Icon = icon;
    return (
        <div className={styles.financeCard} style={{ background: gradient }}>
            <div className={styles.financeCardInner}>
                <Icon size={28} className={styles.financeIcon} />
                <div>
                    <p className={styles.financeLabel}>{title}</p>
                    <h3 className={styles.financeValue}>
                        {loaded ? formatCurrency(Math.abs(value)) : '—'}
                        {value < 0 && <span className={styles.negativeBadge}>Loss</span>}
                    </h3>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
