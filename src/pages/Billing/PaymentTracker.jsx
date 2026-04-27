import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Plus, History, PieChart, CheckCircle, Clock, AlertCircle, Trash2, Search, Calendar, Wallet, FileText } from 'lucide-react';
import PageWrapper from '../../components/UI/PageWrapper';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { getBills, getPayments, recordPayment, deletePayment } from '../../utils/api';
import { formatDate } from '../../utils/dateFormatter';
import styles from './PaymentTracker.module.css';
import clsx from 'clsx';
import DatePicker from '../../components/UI/DatePicker';

const METHODS = ['NEFT', 'RTGS', 'IMPS', 'Cheque', 'Cash', 'UPI'];

const PaymentTracker = () => {
    const [bills, setBills] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null);

    const [paymentForm, setPaymentForm] = useState({
        billNo: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'NEFT',
        note: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [billsData, paymentsData] = await Promise.all([
                getBills(),
                getPayments()
            ]);
            setBills(billsData);
            setPayments(paymentsData);
        } catch (err) {
            console.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const totalBilled = bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
        const totalReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        return {
            totalBilled,
            totalReceived,
            totalPending: totalBilled - totalReceived
        };
    }, [bills, payments]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setPaymentForm(prev => ({ ...prev, [name]: value }));
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!paymentForm.billNo || !paymentForm.amount) {
            alert('Bill No and Amount are required');
            return;
        }

        try {
            await recordPayment(paymentForm);
            setStatus({ type: 'success', message: 'Payment recorded successfully!' });
            setPaymentForm({
                billNo: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                method: 'NEFT',
                note: ''
            });
            fetchData();
            setTimeout(() => setStatus(null), 3000);
        } catch (err) {
            setStatus({ type: 'error', message: err.message });
        }
    };

    const handleDeletePayment = async (id) => {
        if (!window.confirm('Delete this payment record?')) return;
        try {
            await deletePayment(id);
            fetchData();
        } catch (err) {
            alert('Failed to delete payment');
        }
    };

    return (
        <PageWrapper>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>Payment Tracker</h1>
                    <p>Manage collections and track bill statuses</p>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <Card className={styles.statCard}>
                        <div className={clsx(styles.statIcon, styles.billed)}>
                            <FileText size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span>Total Billed</span>
                            <h3>₹{stats.totalBilled.toLocaleString()}</h3>
                        </div>
                    </Card>
                    <Card className={styles.statCard}>
                        <div className={clsx(styles.statIcon, styles.received)}>
                            <Wallet size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span>Total Received</span>
                            <h3>₹{stats.totalReceived.toLocaleString()}</h3>
                        </div>
                    </Card>
                    <Card className={styles.statCard}>
                        <div className={clsx(styles.statIcon, styles.pending)}>
                            <Clock size={24} />
                        </div>
                        <div className={styles.statInfo}>
                            <span>Total Pending</span>
                            <h3>₹{stats.totalPending.toLocaleString()}</h3>
                        </div>
                    </Card>
                </div>

                <div className={styles.mainGrid}>
                    {/* Left: Add Payment & Status Table */}
                    <div className={styles.leftCol}>
                        <Card className={styles.formCard}>
                            <div className={styles.cardHeader}>
                                <Plus size={20} />
                                <h2>Log New Payment</h2>
                            </div>
                            <form onSubmit={handleAddPayment} className={styles.form}>
                                <div className={styles.formRow}>
                                    <div className={styles.field}>
                                        <label>Select Bill *</label>
                                        <select name="billNo" value={paymentForm.billNo} onChange={handleFormChange}>
                                            <option value="">Select a Bill</option>
                                            {bills.filter(b => b.status !== 'Paid').map(b => (
                                                <option key={b.billNo} value={b.billNo}>
                                                    {b.billNo} (Pending: ₹{b.pendingAmount?.toLocaleString()})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles.field}>
                                        <label>Amount (₹) *</label>
                                        <input type="number" name="amount" value={paymentForm.amount} onChange={handleFormChange} placeholder="0.00" />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <DatePicker 
                                        label="Payment Date *"
                                        name="date" 
                                        value={paymentForm.date} 
                                        onChange={handleFormChange} 
                                    />
                                    <div className={styles.field}>
                                        <label>Method</label>
                                        <select name="method" value={paymentForm.method} onChange={handleFormChange}>
                                            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className={styles.field}>
                                    <label>Notes (Optional)</label>
                                    <input type="text" name="note" value={paymentForm.note} onChange={handleFormChange} placeholder="Reference No / Remarks" />
                                </div>
                                <Button type="submit" className={styles.submitBtn}>
                                    <DollarSign size={18} /> Record Payment
                                </Button>
                                {status && <div className={clsx(styles.status, styles[status.type])}>{status.message}</div>}
                            </form>
                        </Card>

                        <Card className={styles.statusCard}>
                            <div className={styles.cardHeader}>
                                <History size={20} />
                                <h2>Bill Payment Status</h2>
                            </div>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Bill No</th>
                                            <th>Total</th>
                                            <th>Received</th>
                                            <th>Pending</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bills.map(bill => (
                                            <tr key={bill.billNo}>
                                                <td className={styles.billNo}>{bill.billNo}</td>
                                                <td>₹{bill.grandTotal?.toLocaleString()}</td>
                                                <td>₹{(bill.grandTotal - bill.pendingAmount)?.toLocaleString()}</td>
                                                <td className={styles.pendingVal}>₹{bill.pendingAmount?.toLocaleString()}</td>
                                                <td>
                                                    <span className={clsx(styles.statusBadge, styles[bill.status])}>
                                                        {bill.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>

                    {/* Right: Payment History */}
                    <div className={styles.rightCol}>
                        <Card className={styles.historyCard}>
                            <div className={styles.cardHeader}>
                                <History size={20} />
                                <h2>Recent Transactions</h2>
                            </div>
                            <div className={styles.historyList}>
                                {payments.length === 0 ? (
                                    <div className={styles.emptyHistory}>No payments recorded yet.</div>
                                ) : (
                                    payments.map(payment => (
                                        <div key={payment.id} className={styles.historyItem}>
                                            <div className={styles.itemMain}>
                                                <div className={styles.itemInfo}>
                                                    <span className={styles.itemDate}>{formatDate(payment.date)}</span>
                                                    <span className={styles.itemBill}>Bill #{payment.billNo}</span>
                                                </div>
                                                <div className={styles.itemAmount}>
                                                    ₹{payment.amount?.toLocaleString()}
                                                    <span className={styles.itemMethod}>{payment.method}</span>
                                                </div>
                                            </div>
                                            <div className={styles.itemFooter}>
                                                <span className={styles.itemNote}>{payment.note || 'No notes'}</span>
                                                <button onClick={() => handleDeletePayment(payment.id)} className={styles.itemDelete}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default PaymentTracker;
