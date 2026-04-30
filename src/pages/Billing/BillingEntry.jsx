import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Save, AlertCircle, CheckCircle, Calculator, MapPin, DollarSign } from 'lucide-react';
import PageWrapper from '../../components/UI/PageWrapper';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { createBill, createEntry, getBills, getLocations, getParties } from '../../utils/api';
import styles from './BillingEntry.module.css';
import clsx from 'clsx';
import DatePicker from '../../components/UI/DatePicker';



const LOCATION_ADDRESS_MAP = {
    'SRIPERUMBUDHUR': 'No. 123, SIPCOT Industrial Park, Sriperumbudur, Tamil Nadu 602105',
    'CHENNAI': 'No. 45, GST Road, Guindy, Chennai, Tamil Nadu 600032',
    'VILLUPURAM': 'No. 8, Bypass Road, Villupuram, Tamil Nadu 605602',
    'KUNNAM': 'Kunnam Village, Sriperumbudur Taluk, Kanchipuram District, TN',
    'COIMBATORE': 'No. 22, Avinashi Road, Coimbatore, Tamil Nadu 641018',
    // Fallback for others
};

const DEFAULT_BILL_TO = 'KN LOGISTICS\nNo. 10, Logistics Hub\nChennai, TN 600001\nGSTIN: 33AAAAA0000A1Z5';

const BillingEntry = () => {
    const [locations, setLocations] = useState([]);
    const [parties, setParties] = useState([]);
    const [existingBills, setExistingBills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [errors, setErrors] = useState({});

    // Header Fields
    const [billData, setBillData] = useState({
        billNo: '',
        date: new Date().toISOString().split('T')[0],
        billToAddr: DEFAULT_BILL_TO,
        dispatchAddr: ''
    });

    // Entry Fields
    const initialEntryState = {
        dispatchDate: new Date().toISOString().split('T')[0],
        lrNo: '',
        from_: '',
        to_: '',
        poInvoiceNo: '',
        tons: 0,
        truckNo: '',
        dateOfArrival: '',
        dateOfDelivery: '',
        freight: 0,
        multiPoint: 0,
        loading: 0,
        unloading: 0,
        halting: 0
    };
    const [entryData, setEntryData] = useState(initialEntryState);

    // Derived State
    const existingBillMatch = useMemo(() => {
        return existingBills.find(b => b.billNo === billData.billNo);
    }, [billData.billNo, existingBills]);

    const entryTotal = useMemo(() => {
        return (
            (entryData.freight || 0) + 
            (entryData.multiPoint || 0) + 
            (entryData.loading || 0) + 
            (entryData.unloading || 0) + 
            (entryData.halting || 0)
        );
    }, [entryData]);

    useEffect(() => {
        fetchBills();
        fetchLocations();
        fetchParties();
    }, []);

    const fetchParties = async () => {
        try {
            const data = await getParties();
            setParties(data);
        } catch (err) {
            console.error('Failed to fetch parties');
        }
    };

    const handlePartySelect = (e) => {
        const partyName = e.target.value;
        const party = parties.find(p => p.name === partyName);
        if (party) {
            setBillData(prev => ({
                ...prev,
                billToAddr: party.address || '',
                billToGst: party.gst || ''
            }));
        }
    };

    const fetchLocations = async () => {
        try {
            const data = await getLocations();
            setLocations(data.map(l => l.name));
        } catch (err) {
            console.error('Failed to fetch locations');
        }
    };

    useEffect(() => {
        if (existingBillMatch) {
            setBillData(prev => ({
                ...prev,
                date: existingBillMatch.date || prev.date,
                billToAddr: existingBillMatch.billToAddr || prev.billToAddr,
                dispatchAddr: existingBillMatch.dispatchAddr || prev.dispatchAddr
            }));
        }
    }, [existingBillMatch]);

    const fetchBills = async () => {
        try {
            const data = await getBills();
            setExistingBills(data);
        } catch (err) {
            console.error('Failed to fetch bills');
        }
    };

    const handleBillChange = (e) => {
        let { name, value, type } = e.target;
        if (type === 'text' || e.target.tagName === 'TEXTAREA') {
            value = value.toUpperCase();
        }
        setBillData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleEntryChange = (e) => {
        let { name, value, type } = e.target;
        
        // Handle numeric fields
        if (type === 'number') {
            value = value === '' ? 0 : parseFloat(value);
        } else if (type === 'text' || type === 'select-one' || e.target.list) {
            value = value.toUpperCase();
        }
        
        setEntryData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const validate = () => {
        const newErrors = {};
        if (!billData.billNo) newErrors.billNo = 'Bill No is required';
        if (!billData.date) newErrors.date = 'Bill Date is required';
        if (!entryData.lrNo) newErrors.lrNo = 'LR No is required';
        if (!entryData.poInvoiceNo) newErrors.poInvoiceNo = 'PO/Invoice No is required';
        if (!entryData.truckNo) newErrors.truckNo = 'Truck No is required';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setStatus(null);

        try {
            // 1. Create/Update Bill
            await createBill(billData);

            // 2. Create Entry
            await createEntry({
                ...entryData,
                billNo: billData.billNo,
                total: entryTotal
            });

            setStatus({ type: 'success', message: `Entry added to Bill #${billData.billNo} successfully!` });
            
            // Reset entry fields but keep bill info
            setEntryData({
                ...initialEntryState,
                from_: entryData.from_,
                to_: entryData.to_
            });
            
            fetchBills(); // Refresh to catch updated entry counts
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Failed to save entry' });
            if (err.message.includes('LR No') || err.message.includes('duplicate')) {
                setErrors(prev => ({ ...prev, lrNo: 'Duplicate LR No detected' }));
            }
        } finally {
            setLoading(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <PageWrapper>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <FileText className={styles.icon} size={32} />
                        <div>
                            <h1 className="heading-xl">LR Billing Entry</h1>
                            <p className={styles.subtitle}>Generate bills and add logistics records</p>
                        </div>
                    </div>
                    {existingBillMatch && (
                        <div className={styles.matchBadge}>
                            <CheckCircle size={16} />
                            Adding to existing bill <strong>#{existingBillMatch.billNo}</strong> ({existingBillMatch.entryCount} entries)
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Bill Header Section */}
                    <Card className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <Plus size={20} />
                            <h2 className="heading-md">Bill Header Information</h2>
                        </div>
                        <div className={styles.grid}>
                            <div className={styles.field}>
                                <label>Bill Number *</label>
                                <input 
                                    type="text" 
                                    name="billNo" 
                                    value={billData.billNo} 
                                    onChange={handleBillChange}
                                    placeholder="Enter Bill Number"
                                    className={errors.billNo ? styles.inputError : ''}
                                />
                                {errors.billNo && <span className={styles.errorMsg}>{errors.billNo}</span>}
                            </div>
                            <DatePicker 
                                label="Bill Date *"
                                name="date" 
                                value={billData.date} 
                                onChange={handleBillChange}
                                error={errors.date}
                            />
                        </div>

                        {/* Party Selection (Added back as per request for dropdown selection) */}
                        <div className={styles.partyField}>
                            <label className="label-text">Select Party (Auto-fills Address & GST)</label>
                            <input 
                                list="party-list" 
                                placeholder="Enter party name" 
                                onChange={handlePartySelect}
                            />
                            <datalist id="party-list">
                                {parties.map(p => <option key={p.id} value={p.name} />)}
                            </datalist>
                        </div>
                    </Card>

                    {/* LR Details Section */}
                    <Card className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <MapPin size={20} />
                            <h2 className="heading-md">LR & Dispatch Details</h2>
                        </div>
                        <div className={styles.gridWide}>
                            <DatePicker 
                                label="Dispatch Date"
                                name="dispatchDate" 
                                value={entryData.dispatchDate} 
                                onChange={handleEntryChange} 
                            />
                            <div className={styles.field}>
                                <label>LR Number *</label>
                                <input 
                                    type="text" 
                                    name="lrNo" 
                                    value={entryData.lrNo} 
                                    onChange={handleEntryChange}
                                    placeholder="Enter LR Number"
                                    className={errors.lrNo ? styles.inputError : ''}
                                />
                                {errors.lrNo && <span className={styles.errorMsg}>{errors.lrNo}</span>}
                            </div>
                            <div className={styles.field}>
                                <label>From</label>
                                <input 
                                    list="locations" 
                                    name="from_" 
                                    value={entryData.from_} 
                                    onChange={handleEntryChange} 
                                    placeholder="Enter Source"
                                />
                                <datalist id="locations">
                                    {locations.map(loc => <option key={loc} value={loc} />)}
                                </datalist>
                            </div>
                            <div className={styles.field}>
                                <label>To</label>
                                <input 
                                    list="locations" 
                                    name="to_" 
                                    value={entryData.to_} 
                                    onChange={handleEntryChange} 
                                    placeholder="Enter Destination"
                                />
                            </div>
                            <div className={styles.field}>
                                <label>PO / Invoice No *</label>
                                <input 
                                    type="text" 
                                    name="poInvoiceNo" 
                                    value={entryData.poInvoiceNo} 
                                    onChange={handleEntryChange}
                                    placeholder="Enter PO/Invoice No"
                                    className={errors.poInvoiceNo ? styles.inputError : ''}
                                />
                                {errors.poInvoiceNo && <span className={styles.errorMsg}>{errors.poInvoiceNo}</span>}
                            </div>
                            <div className={styles.field}>
                                <label>Truck Number *</label>
                                <input 
                                    type="text" 
                                    name="truckNo" 
                                    value={entryData.truckNo} 
                                    onChange={handleEntryChange}
                                    placeholder="Enter Vehicle Number"
                                    className={errors.truckNo ? styles.inputError : ''}
                                />
                                {errors.truckNo && <span className={styles.errorMsg}>{errors.truckNo}</span>}
                            </div>
                            <div className={styles.field}>
                                <label>Tons</label>
                                <input type="number" step="0.01" name="tons" value={entryData.tons} onChange={handleEntryChange} placeholder="Enter Weight" />
                            </div>
                            <DatePicker 
                                label="Arrival"
                                name="dateOfArrival" 
                                value={entryData.dateOfArrival} 
                                onChange={handleEntryChange} 
                            />
                            <DatePicker 
                                label="Delivery"
                                name="dateOfDelivery" 
                                value={entryData.dateOfDelivery} 
                                onChange={handleEntryChange} 
                            />
                        </div>
                    </Card>

                    {/* Charges Section */}
                    <Card className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <DollarSign size={20} />
                            <h2 className="heading-md">Charges & Financials</h2>
                        </div>
                        <div className={styles.grid}>
                            <div className={styles.field}>
                                <label>Freight (₹)</label>
                                <input type="number" name="freight" value={entryData.freight} onChange={handleEntryChange} placeholder="Enter Amount" />
                            </div>
                            <div className={styles.field}>
                                <label>Multi-Point (₹)</label>
                                <input type="number" name="multiPoint" value={entryData.multiPoint} onChange={handleEntryChange} placeholder="Enter Amount" />
                            </div>
                            <div className={styles.field}>
                                <label>Loading (₹)</label>
                                <input type="number" name="loading" value={entryData.loading} onChange={handleEntryChange} placeholder="Enter Amount" />
                            </div>
                        </div>
                        <div className={styles.grid}>
                            <div className={styles.field}>
                                <label>Unloading (₹)</label>
                                <input type="number" name="unloading" value={entryData.unloading} onChange={handleEntryChange} placeholder="Enter Amount" />
                            </div>
                            <div className={styles.field}>
                                <label>Halting (₹)</label>
                                <input type="number" name="halting" value={entryData.halting} onChange={handleEntryChange} placeholder="Enter Amount" />
                            </div>
                            <div className={styles.totalPreview}>
                                <span>Entry Total</span>
                                <h3>₹{entryTotal.toLocaleString()}</h3>
                            </div>
                        </div>
                    </Card>

                    <div className={styles.formActions}>
                        {status && (
                            <div className={clsx(styles.statusMsg, styles[status.type])}>
                                {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                {status.message}
                            </div>
                        )}
                        <Button type="submit" size="lg" disabled={loading} className={styles.submitBtn}>
                            {loading ? 'Saving Entry...' : (
                                <>
                                    <Save size={20} />
                                    Save LR Entry
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </PageWrapper>
    );
};

export default BillingEntry;
