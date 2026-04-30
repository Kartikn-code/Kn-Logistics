import React, { useState, useEffect } from 'react';
import { Search, Filter, RotateCcw, ChevronDown, ChevronRight, Edit2, Trash2, FileText, CheckCircle, Clock, AlertCircle, Save, X, Plus, Receipt } from 'lucide-react';
import PageWrapper from '../../components/UI/PageWrapper';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { getBills, getBillByNo, updateEntry, deleteEntry, deleteBill } from '../../utils/api';
import { formatDate } from '../../utils/dateFormatter';
import styles from './BillingRecords.module.css';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

const BillingRecords = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBills, setExpandedBills] = useState({});
    const [filters, setFilters] = useState({
        search: '',
        from: '',
        to: '',
        status: ''
    });

    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});

    const navigate = useNavigate();

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        setLoading(true);
        try {
            const data = await getBills();
            setBills(data);
        } catch (err) {
            console.error('Failed to fetch bills');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = async (billNo) => {
        if (expandedBills[billNo]) {
            const newExpanded = { ...expandedBills };
            delete newExpanded[billNo];
            setExpandedBills(newExpanded);
        } else {
            setExpandedBills(prev => ({ ...prev, [billNo]: { entries: [], loading: true } }));
            try {
                const billDetails = await getBillByNo(billNo);
                setExpandedBills(prev => ({ 
                    ...prev, 
                    [billNo]: { entries: billDetails.entries, loading: false } 
                }));
            } catch (err) {
                console.error('Failed to fetch entries');
                setExpandedBills(prev => {
                    const next = { ...prev };
                    delete next[billNo];
                    return next;
                });
            }
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({ search: '', from: '', to: '', status: '' });
    };

    const filteredBills = bills.filter(bill => {
        const matchesSearch = !filters.search || 
            bill.billNo.toLowerCase().includes(filters.search.toLowerCase());
        const matchesStatus = !filters.status || bill.status === filters.status;
        return matchesSearch && matchesStatus;
    });

    const handleEditClick = (e, entry) => {
        e.stopPropagation();
        setEditingId(entry.id);
        setEditData({ ...entry });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => {
            const next = { ...prev, [name]: value };
            if (['freight', 'multiPoint', 'loading', 'unloading', 'halting'].includes(name)) {
                next.total = [
                    next.freight, next.multiPoint, next.loading, 
                    next.unloading, next.halting
                ].reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
            }
            return next;
        });
    };

    const handleSaveEntry = async (billNo) => {
        try {
            await updateEntry(editingId, editData);
            setEditingId(null);
            const billDetails = await getBillByNo(billNo);
            setExpandedBills(prev => ({
                ...prev,
                [billNo]: { entries: billDetails.entries, loading: false }
            }));
            fetchBills();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteEntry = async (e, billNo, id) => {
        e.stopPropagation();
        if (!window.confirm('Delete this entry?')) return;
        try {
            await deleteEntry(id);
            const billDetails = await getBillByNo(billNo);
            setExpandedBills(prev => ({
                ...prev,
                [billNo]: { entries: billDetails.entries, loading: false }
            }));
            fetchBills();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteBill = async (e, billNo) => {
        e.stopPropagation();
        if (!window.confirm(`Delete entire Bill #${billNo} and all its entries?`)) return;
        try {
            await deleteBill(billNo);
            fetchBills();
        } catch (err) {
            alert(err.message);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Paid': return <CheckCircle size={14} />;
            case 'Partial': return <Clock size={14} />;
            default: return <AlertCircle size={14} />;
        }
    };

    return (
        <PageWrapper>
            <div className={styles.container}>
                <header className={styles.pageHeader}>
                    <div className={styles.headerTitle}>
                        <div className={styles.iconBox}>
                            <Receipt size={24} />
                        </div>
                        <div>
                            <h1 className="heading-xl">Financial Records</h1>
                            <p className={styles.subtitle}>Audit logs and settlement history for all clients</p>
                        </div>
                    </div>
                    <Button variant="primary" onClick={() => navigate('/billing/entry')}>
                        <Plus size={18} /> <span className={styles.btnText}>Create Entry</span>
                    </Button>
                </header>

                <Card className={styles.filterCard}>
                    <div className={styles.filterGrid}>
                        <div className={styles.searchContainer}>
                            <Search size={18} className={styles.searchIcon} />
                            <input 
                                type="text" 
                                name="search" 
                                placeholder="Ref No, Vehicle or LR..." 
                                value={filters.search}
                                onChange={handleFilterChange}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <select name="status" value={filters.status} onChange={handleFilterChange} className={styles.selectInput}>
                                <option value="">All Settlement Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Partial">Partial</option>
                                <option value="Paid">Settled</option>
                            </select>
                            <Button variant="secondary" onClick={resetFilters} className={styles.resetBtn}>
                                <RotateCcw size={16} />
                            </Button>
                        </div>
                    </div>
                </Card>

                <div className={styles.recordsList}>
                    {/* Desktop View */}
                    <div className={styles.desktopContainer}>
                        <table className={styles.mainTable}>
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}></th>
                                    <th className="label-text">Identifier</th>
                                    <th className="label-text">Date</th>
                                    <th className="label-text">Logs</th>
                                    <th className="label-text">Settlement</th>
                                    <th className="label-text">Balance</th>
                                    <th className="label-text">Status</th>
                                    <th style={{ textAlign: 'right' }} className="label-text">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="8" className={styles.loadingCell}>Syncing data...</td></tr>
                                ) : filteredBills.length === 0 ? (
                                    <tr><td colSpan="8" className={styles.emptyCell}>No matching records found.</td></tr>
                                ) : filteredBills.map(bill => (
                                    <React.Fragment key={bill.billNo}>
                                        <tr 
                                            className={clsx(styles.billRow, expandedBills[bill.billNo] && styles.expandedRow)}
                                            onClick={() => toggleExpand(bill.billNo)}
                                        >
                                            <td>
                                                <div className={styles.expandIcon}>
                                                    {expandedBills[bill.billNo] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                </div>
                                            </td>
                                            <td className={styles.billId}>{bill.billNo}</td>
                                            <td className={styles.dateCell}>{formatDate(bill.date)}</td>
                                            <td><span className={styles.countBadge}>{bill.entryCount} Entries</span></td>
                                            <td className="value-text">₹{bill.grandTotal?.toLocaleString()}</td>
                                            <td className={clsx("value-text", styles.pendingVal)}>
                                                ₹{bill.pendingAmount?.toLocaleString()}
                                            </td>
                                            <td>
                                                <span className={clsx(styles.statusBadge, styles[bill.status])}>
                                                    {getStatusIcon(bill.status)}
                                                    {bill.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className={styles.rowActions} onClick={e => e.stopPropagation()}>
                                                    <Button size="sm" variant="outline" onClick={() => navigate(`/billing/invoice?billNo=${bill.billNo}`)}>
                                                        <FileText size={14} />
                                                    </Button>
                                                    <Button size="sm" variant="outline" className={styles.deleteBtn} onClick={(e) => handleDeleteBill(e, bill.billNo)}>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedBills[bill.billNo] && (
                                            <tr className={styles.expandedContentRow}>
                                                <td colSpan="8">
                                                    <div className={styles.expandedWrapper}>
                                                        {expandedBills[bill.billNo].loading ? (
                                                            <div className={styles.nestedLoading}>Decompressing logs...</div>
                                                        ) : (
                                                            <div className={styles.nestedTableContainer}>
                                                                <table className={styles.nestedTable}>
                                                                    <thead>
                                                                        <tr>
                                                                            <th className="label-text">Date</th>
                                                                            <th className="label-text">LR No</th>
                                                                            <th className="label-text">Route</th>
                                                                            <th className="label-text">Vehicle</th>
                                                                            <th className="label-text">Weight</th>
                                                                            <th className="label-text">Freight</th>
                                                                            <th className="label-text">Total</th>
                                                                            <th className="label-text">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {expandedBills[bill.billNo].entries.map(entry => (
                                                                            <tr key={entry.id}>
                                                                                {editingId === entry.id ? (
                                                                                    <>
                                                                                        <td><input type="date" name="dispatchDate" value={editData.dispatchDate} onChange={handleEditChange} className={styles.editInput} /></td>
                                                                                        <td><input type="text" name="lrNo" value={editData.lrNo} onChange={handleEditChange} className={styles.editInput} /></td>
                                                                                        <td>
                                                                                            <div className={styles.routeEdit}>
                                                                                                <input type="text" name="from_" value={editData.from_} onChange={handleEditChange} placeholder="From" />
                                                                                                <input type="text" name="to_" value={editData.to_} onChange={handleEditChange} placeholder="To" />
                                                                                            </div>
                                                                                        </td>
                                                                                        <td><input type="text" name="truckNo" value={editData.truckNo} onChange={handleEditChange} className={styles.editInput} /></td>
                                                                                        <td><input type="number" name="tons" value={editData.tons} onChange={handleEditChange} className={styles.editInput} /></td>
                                                                                        <td><input type="number" name="freight" value={editData.freight} onChange={handleEditChange} className={styles.editInput} /></td>
                                                                                        <td className="value-text">₹{editData.total?.toLocaleString()}</td>
                                                                                        <td>
                                                                                            <div className={styles.saveActions}>
                                                                                                <button onClick={() => handleSaveEntry(bill.billNo)} className={styles.saveBtn}><Save size={18} /></button>
                                                                                                <button onClick={() => setEditingId(null)} className={styles.cancelBtn}><X size={18} /></button>
                                                                                            </div>
                                                                                        </td>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <td>{formatDate(entry.dispatchDate)}</td>
                                                                                        <td className={styles.lrCell}>{entry.lrNo}</td>
                                                                                        <td className={styles.routeCellSmall}>{entry.from_} → {entry.to_}</td>
                                                                                        <td className={styles.vehicleSmall}>{entry.truckNo}</td>
                                                                                        <td>{entry.tons} T</td>
                                                                                        <td className="value-text">₹{entry.freight?.toLocaleString()}</td>
                                                                                        <td className="value-text">₹{entry.total?.toLocaleString()}</td>
                                                                                        <td>
                                                                                            <div className={styles.nestedRowActions}>
                                                                                                <button onClick={(e) => handleEditClick(e, entry)} className={styles.editBtn}><Edit2 size={14} /></button>
                                                                                                <button onClick={(e) => handleDeleteEntry(e, bill.billNo, entry.id)} className={styles.nestedDeleteBtn}><Trash2 size={14} /></button>
                                                                                            </div>
                                                                                        </td>
                                                                                    </>
                                                                                )}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View - Card based UI */}
                    <div className={styles.mobileContainer}>
                        {loading ? (
                            <div className={styles.mobileLoading}>Syncing data...</div>
                        ) : filteredBills.length === 0 ? (
                            <div className={styles.mobileEmpty}>No records found.</div>
                        ) : filteredBills.map(bill => (
                            <div key={bill.billNo} className={styles.mobileCard}>
                                <div className={styles.cardHeaderMobile} onClick={() => toggleExpand(bill.billNo)}>
                                    <div className={styles.cardTopMobile}>
                                        <span className={styles.billIdMobile}>#{bill.billNo}</span>
                                        <span className={clsx(styles.statusBadge, styles[bill.status])}>
                                            {bill.status}
                                        </span>
                                    </div>
                                    <div className={styles.cardMidMobile}>
                                        <div className={styles.cardValGroup}>
                                            <span className="label-text">Total</span>
                                            <span className="value-text">₹{bill.grandTotal?.toLocaleString()}</span>
                                        </div>
                                        <div className={styles.cardValGroup}>
                                            <span className="label-text">Pending</span>
                                            <span className={clsx("value-text", styles.pendingVal)}>₹{bill.pendingAmount?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className={styles.cardFooterMobile}>
                                        <span className={styles.dateMobile}>{formatDate(bill.date)}</span>
                                        <div className={styles.expandTrigger}>
                                            {expandedBills[bill.billNo] ? 'Hide Details' : 'View Details'}
                                            {expandedBills[bill.billNo] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </div>
                                    </div>
                                </div>
                                
                                {expandedBills[bill.billNo] && (
                                    <div className={styles.mobileExpanded}>
                                        {expandedBills[bill.billNo].loading ? (
                                            <div className={styles.nestedLoading}>Fetching...</div>
                                        ) : (
                                            <div className={styles.nestedListMobile}>
                                                {expandedBills[bill.billNo].entries.map(entry => (
                                                    <div key={entry.id} className={styles.nestedEntryMobile}>
                                                        <div className={styles.nestedTopMobile}>
                                                            <span className={styles.lrMobile}>LR: {entry.lrNo}</span>
                                                            <span className="value-text">₹{entry.total?.toLocaleString()}</span>
                                                        </div>
                                                        <div className={styles.nestedMidMobile}>
                                                            <span className={styles.routeMobile}>{entry.from_} → {entry.to_}</span>
                                                            <span className={styles.vehicleMobile}>{entry.truckNo}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className={styles.mobileActions}>
                                                    <Button size="sm" variant="outline" onClick={() => navigate(`/billing/invoice?billNo=${bill.billNo}`)}>
                                                        Generate Invoice
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default BillingRecords;
