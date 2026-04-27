import React, { useState, useEffect } from 'react';
import { Search, Filter, RotateCcw, ChevronDown, ChevronRight, Edit2, Trash2, FileText, CheckCircle, Clock, AlertCircle, Save, X } from 'lucide-react';
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
    const [expandedBills, setExpandedBills] = useState({}); // { billNo: { entries: [], loading: false } }
    const [filters, setFilters] = useState({
        search: '',
        from: '',
        to: '',
        status: ''
    });

    // Inline edit state
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
        // From/To filtering would ideally happen on entries, but for bills we can check if any entry matches or just filter bills.
        // For now, filtering bills by status and search.
        return matchesSearch && matchesStatus;
    });

    const handleEditClick = (entry) => {
        setEditingId(entry.id);
        setEditData({ ...entry });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => {
            const next = { ...prev, [name]: value };
            // Recalculate total if charges change
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
            // Refresh entries for this bill
            const billDetails = await getBillByNo(billNo);
            setExpandedBills(prev => ({
                ...prev,
                [billNo]: { entries: billDetails.entries, loading: false }
            }));
            fetchBills(); // Refresh grand total
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteEntry = async (billNo, id) => {
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

    const handleDeleteBill = async (billNo) => {
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
            case 'Paid': return <CheckCircle size={14} className={styles.statusPaid} />;
            case 'Partial': return <Clock size={14} className={styles.statusPartial} />;
            default: return <AlertCircle size={14} className={styles.statusPending} />;
        }
    };

    return (
        <PageWrapper>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>Billing Records</h1>
                    <div className={styles.actions}>
                        <Button variant="outline" onClick={() => navigate('/billing/entry')}>
                            <Plus size={16} /> New Entry
                        </Button>
                    </div>
                </div>

                <Card className={styles.filterCard}>
                    <div className={styles.filterGrid}>
                        <div className={styles.searchBox}>
                            <Search size={18} />
                            <input 
                                type="text" 
                                name="search" 
                                placeholder="Search Bill No, LR No, Truck No..." 
                                value={filters.search}
                                onChange={handleFilterChange}
                            />
                        </div>
                        <select name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Partial">Partial</option>
                            <option value="Paid">Paid</option>
                        </select>
                        <Button variant="secondary" onClick={resetFilters} className={styles.resetBtn}>
                            <RotateCcw size={16} />
                            Reset
                        </Button>
                    </div>
                </Card>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Bill No</th>
                                <th>Date</th>
                                <th>LR Count</th>
                                <th>Grand Total</th>
                                <th>Pending</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className={styles.loadingCell}>Loading records...</td></tr>
                            ) : filteredBills.length === 0 ? (
                                <tr><td colSpan="8" className={styles.emptyCell}>No bills found matching your criteria.</td></tr>
                            ) : filteredBills.map(bill => (
                                <React.Fragment key={bill.billNo}>
                                    <tr 
                                        className={clsx(styles.billRow, expandedBills[bill.billNo] && styles.expandedRow)}
                                        onClick={() => toggleExpand(bill.billNo)}
                                    >
                                        <td>
                                            {expandedBills[bill.billNo] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </td>
                                        <td className={styles.billNo}>{bill.billNo}</td>
                                        <td>{formatDate(bill.date)}</td>
                                        <td>{bill.entryCount}</td>
                                        <td className={styles.amount}>₹{bill.grandTotal?.toLocaleString()}</td>
                                        <td className={clsx(styles.amount, styles.pendingAmount)}>
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
                                                    <FileText size={14} /> Invoice
                                                </Button>
                                                <Button size="sm" variant="outline" className={styles.deleteBtn} onClick={() => handleDeleteBill(bill.billNo)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedBills[bill.billNo] && (
                                        <tr className={styles.subEntriesRow}>
                                            <td colSpan="8">
                                                <div className={styles.subEntriesContainer}>
                                                    {expandedBills[bill.billNo].loading ? (
                                                        <div className={styles.subLoading}>Fetching entries...</div>
                                                    ) : (
                                                        <table className={styles.subTable}>
                                                            <thead>
                                                                <tr>
                                                                    <th>Dispatch Date</th>
                                                                    <th>LR No</th>
                                                                    <th>From</th>
                                                                    <th>To</th>
                                                                    <th>Truck No</th>
                                                                    <th>Tons</th>
                                                                    <th>Freight</th>
                                                                    <th>Loading</th>
                                                                    <th>Unloading</th>
                                                                    <th>Total</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {expandedBills[bill.billNo].entries.map(entry => (
                                                                    <tr key={entry.id}>
                                                                        {editingId === entry.id ? (
                                                                            <>
                                                                                <td><input type="date" name="dispatchDate" value={editData.dispatchDate} onChange={handleEditChange} /></td>
                                                                                <td><input type="text" name="lrNo" value={editData.lrNo} onChange={handleEditChange} /></td>
                                                                                <td><input type="text" name="from_" value={editData.from_} onChange={handleEditChange} /></td>
                                                                                <td><input type="text" name="to_" value={editData.to_} onChange={handleEditChange} /></td>
                                                                                <td><input type="text" name="truckNo" value={editData.truckNo} onChange={handleEditChange} /></td>
                                                                                <td><input type="number" name="tons" value={editData.tons} onChange={handleEditChange} /></td>
                                                                                <td><input type="number" name="freight" value={editData.freight} onChange={handleEditChange} /></td>
                                                                                <td><input type="number" name="loading" value={editData.loading} onChange={handleEditChange} /></td>
                                                                                <td><input type="number" name="unloading" value={editData.unloading} onChange={handleEditChange} /></td>
                                                                                <td className={styles.amount}>₹{editData.total?.toLocaleString()}</td>
                                                                                <td>
                                                                                    <div className={styles.editActions}>
                                                                                        <button onClick={() => handleSaveEntry(bill.billNo)} title="Save"><Save size={16} /></button>
                                                                                        <button onClick={() => setEditingId(null)} title="Cancel"><X size={16} /></button>
                                                                                    </div>
                                                                                </td>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <td>{formatDate(entry.dispatchDate)}</td>
                                                                                <td>{entry.lrNo}</td>
                                                                                <td>{entry.from_}</td>
                                                                                <td>{entry.to_}</td>
                                                                                <td>{entry.truckNo}</td>
                                                                                <td>{entry.tons}</td>
                                                                                <td>₹{entry.freight}</td>
                                                                                <td>₹{entry.loading}</td>
                                                                                <td>₹{entry.unloading}</td>
                                                                                <td className={styles.amount}>₹{entry.total?.toLocaleString()}</td>
                                                                                <td>
                                                                                    <div className={styles.subRowActions}>
                                                                                        <button onClick={() => handleEditClick(entry)}><Edit2 size={14} /></button>
                                                                                        <button onClick={() => handleDeleteEntry(bill.billNo, entry.id)}><Trash2 size={14} /></button>
                                                                                    </div>
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                            <tfoot>
                                                                <tr>
                                                                    <td colSpan="9" style={{ textAlign: 'right', fontWeight: 'bold' }}>Bill Subtotal:</td>
                                                                    <td className={styles.amount} style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                                                        ₹{expandedBills[bill.billNo].entries.reduce((sum, e) => sum + (e.total || 0), 0).toLocaleString()}
                                                                    </td>
                                                                    <td></td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
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
            </div>
        </PageWrapper>
    );
};

const Plus = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

export default BillingRecords;
