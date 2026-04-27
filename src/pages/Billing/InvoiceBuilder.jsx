import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Save, FileText, Type, Bold } from 'lucide-react';
import PageWrapper from '../../components/UI/PageWrapper';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { getBills, getBillByNo, createBill, getParties } from '../../utils/api';
import styles from './InvoiceBuilder.module.css';
import clsx from 'clsx';

const FONTS = ['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New'];

const InvoiceBuilder = () => {
    const [searchParams] = useSearchParams();
    const [bills, setBills] = useState([]);
    const [parties, setParties] = useState([]);
    const [selectedBillNo, setSelectedBillNo] = useState(searchParams.get('billNo') || '');
    const [billData, setBillData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Styling State
    const [fontFamily, setFontFamily] = useState('Arial');
    const [fontSize, setFontSize] = useState(12);

    // Editable Header Labels (to allow flexibility as per user request)
    const [headers, setHeaders] = useState({
        sno: 'S.NO',
        dispatchDate: 'DISPATCH - DATE',
        lrNo: 'LR. NO',
        from: 'FROM',
        to: 'TO',
        po: 'PO.NUMBER',
        tons: 'TONS',
        truck: 'TRUCK.NO',
        arrival: 'DATE OF ARRIVAL',
        delivery: 'DATE OF DELIVERY',
        freight: 'FREIGHT',
        loading: 'LOADING',
        unloading: 'UN LOADING',
        halt: 'HALTING',
        total: 'TOTAL'
    });

    const [labels, setLabels] = useState({
        billTo: 'BILL TO:-',
        gstNo: 'GST NO:-',
        invoiceNo: 'INVOICE NO: -',
        invoiceDate: 'INVOICE DATE: -',
        grandTotal: 'TOTAL: -'
    });

    const printRef = useRef();

    useEffect(() => {
        fetchBills();
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

    useEffect(() => {
        if (selectedBillNo) {
            fetchBillDetails(selectedBillNo);
        }
    }, [selectedBillNo]);

    const fetchBills = async () => {
        try {
            const data = await getBills();
            setBills(data);
        } catch (err) {
            console.error('Failed to fetch bills');
        }
    };

    const fetchBillDetails = async (no) => {
        setLoading(true);
        try {
            const data = await getBillByNo(no);
            setBillData(data);
        } catch (err) {
            console.error('Failed to fetch bill details');
        } finally {
            setLoading(false);
        }
    };

    const formatImgDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '-';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}.${month}.${year}`;
    };

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setBillData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSaveAddresses = async () => {
        if (!billData) return;
        try {
            await createBill({
                billNo: billData.billNo,
                date: billData.date,
                billToAddr: billData.billToAddr,
                dispatchAddr: billData.dispatchAddr,
                billToGst: billData.billToGst
            });
            alert('Addresses saved to bill successfully!');
        } catch (err) {
            alert('Failed to save addresses');
        }
    };

    if (loading && !billData) return <PageWrapper><div className={styles.loading}>Loading bill data...</div></PageWrapper>;

    return (
        <PageWrapper>
            <div className={styles.container}>
                {/* Toolbar */}
                <Card className={styles.toolbar}>
                    <div className={styles.toolGroup}>
                        <div className={styles.billSelect}>
                            <FileText size={18} />
                            <select value={selectedBillNo} onChange={(e) => setSelectedBillNo(e.target.value)}>
                                <option value="">Select a Bill</option>
                                {bills.map(b => <option key={b.billNo} value={b.billNo}>{b.billNo}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.toolGroup}>
                        <div className={styles.styleTool}>
                            <Type size={18} />
                            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className={styles.styleTool}>
                            <span style={{ fontSize: '12px' }}>{fontSize}px</span>
                            <input 
                                type="range" 
                                min="8" 
                                max="16" 
                                value={fontSize} 
                                onChange={(e) => setFontSize(parseInt(e.target.value))} 
                            />
                        </div>
                    </div>

                    <div className={styles.toolGroup}>
                        <Button variant="secondary" size="sm" onClick={handleSaveAddresses}>
                            <Save size={16} /> Save Addr
                        </Button>
                        <Button size="sm" onClick={handlePrint}>
                            <Printer size={16} /> Print / PDF
                        </Button>
                    </div>
                </Card>

                {/* Invoice Preview */}
                {!billData ? (
                    <div className={styles.emptyState}>
                        <FileText size={64} />
                        <h2>Select a bill to start building an invoice</h2>
                    </div>
                ) : (
                    <div 
                        className={styles.invoicePreview} 
                        style={{ fontFamily: fontFamily, fontSize: `${fontSize}px` }}
                        ref={printRef}
                    >
                        {/* Letterhead */}
                        <div className={styles.letterhead}>
                            <h1>PONNIAMMAN TRANSPORT</h1>
                            <p>NO: 80 Kamatchipuram, Thiruverkadu, Chennai -77. Contact no: -9841937544</p>
                            <p>
                                <span className={styles.redText}>GSTIN:</span> -33BFVPD6065F1ZC 
                                <span className={styles.redText} style={{ marginLeft: '20px' }}>MAIL:</span>-ponniammantransport2023@gmail.com
                            </p>
                        </div>

                        <div className={styles.invoiceMeta}>
                            <div className={styles.billToBox}>
                                <label><HeaderInput value={labels.billTo} onRename={(v) => setLabels(p => ({...p, billTo: v}))} /></label>
                                <input 
                                    list="party-list" 
                                    placeholder="Select or type party..." 
                                    className={styles.partySelectInput}
                                    onChange={handlePartySelect}
                                />
                                <datalist id="party-list">
                                    {parties.map(p => <option key={p.id} value={p.name} />)}
                                </datalist>
                                <textarea 
                                    name="billToAddr"
                                    value={billData.billToAddr || ''} 
                                    onChange={handleAddressChange}
                                    rows={5}
                                />
                                <div className={styles.gstLine}>
                                    <label><HeaderInput value={labels.gstNo} onRename={(v) => setLabels(p => ({...p, gstNo: v}))} /></label>
                                    <input 
                                        className={styles.gstValue}
                                        value={billData.billToGst || ''}
                                        onChange={(e) => setBillData({...billData, billToGst: e.target.value.toUpperCase()})}
                                        placeholder="33AAC..."
                                    />
                                </div>
                            </div>

                            <div className={styles.invoiceInfo}>
                                <div className={styles.infoRow}>
                                    <span><HeaderInput value={labels.invoiceNo} onRename={(v) => setLabels(p => ({...p, invoiceNo: v}))} /></span>
                                    <span className={styles.redValue}>{billData.billNo}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span><HeaderInput value={labels.invoiceDate} onRename={(v) => setLabels(p => ({...p, invoiceDate: v}))} /></span>
                                    <span className={styles.redValue}>{formatImgDate(billData.date)}</span>
                                </div>
                            </div>
                        </div>

                        <table className={styles.invoiceTable}>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}><HeaderInput value={headers.sno} onRename={(v) => setHeaders(p => ({...p, sno: v}))} /></th>
                                    <th><HeaderInput value={headers.dispatchDate} onRename={(v) => setHeaders(p => ({...p, dispatchDate: v}))} /></th>
                                    <th><HeaderInput value={headers.lrNo} onRename={(v) => setHeaders(p => ({...p, lrNo: v}))} /></th>
                                    <th><HeaderInput value={headers.from} onRename={(v) => setHeaders(p => ({...p, from: v}))} /></th>
                                    <th><HeaderInput value={headers.to} onRename={(v) => setHeaders(p => ({...p, to: v}))} /></th>
                                    <th><HeaderInput value={headers.po} onRename={(v) => setHeaders(p => ({...p, po: v}))} /></th>
                                    <th><HeaderInput value={headers.tons} onRename={(v) => setHeaders(p => ({...p, tons: v}))} /></th>
                                    <th><HeaderInput value={headers.truck} onRename={(v) => setHeaders(p => ({...p, truck: v}))} /></th>
                                    <th><HeaderInput value={headers.arrival} onRename={(v) => setHeaders(p => ({...p, arrival: v}))} /></th>
                                    <th><HeaderInput value={headers.delivery} onRename={(v) => setHeaders(p => ({...p, delivery: v}))} /></th>
                                    <th><HeaderInput value={headers.freight} onRename={(v) => setHeaders(p => ({...p, freight: v}))} /></th>
                                    <th><HeaderInput value={headers.loading} onRename={(v) => setHeaders(p => ({...p, loading: v}))} /></th>
                                    <th><HeaderInput value={headers.unloading} onRename={(v) => setHeaders(p => ({...p, unloading: v}))} /></th>
                                    <th><HeaderInput value={headers.halt} onRename={(v) => setHeaders(p => ({...p, halt: v}))} /></th>
                                    <th><HeaderInput value={headers.total} onRename={(v) => setHeaders(p => ({...p, total: v}))} /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {billData.entries?.map((entry, idx) => (
                                    <tr key={entry.id}>
                                        <td>{idx + 1}</td>
                                        <td>{formatImgDate(entry.dispatchDate)}</td>
                                        <td>{entry.lrNo}</td>
                                        <td>{entry.from_}</td>
                                        <td>{entry.to_}</td>
                                        <td>{entry.poInvoiceNo}</td>
                                        <td>{entry.tons}</td>
                                        <td>{entry.truckNo}</td>
                                        <td>{formatImgDate(entry.dateOfArrival)}</td>
                                        <td>{formatImgDate(entry.dateOfDelivery)}</td>
                                        <td>{entry.freight || '-'}</td>
                                        <td>{entry.loading || '-'}</td>
                                        <td>{entry.unloading || '-'}</td>
                                        <td>{entry.halting || '-'}</td>
                                        <td>{entry.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className={styles.totalSection}>
                            <span><HeaderInput value={labels.grandTotal} onRename={(v) => setLabels(p => ({...p, grandTotal: v}))} /></span>
                            <span className={styles.redValue}>
                                {billData.entries?.reduce((sum, e) => sum + (e.total || 0), 0).toLocaleString()}/-
                            </span>
                        </div>

                        <div className={styles.signatures}>
                            <div className={styles.signBlock}>
                                <div className={styles.signLine} />
                                <p>Receiver's Signature</p>
                            </div>
                            <div className={styles.signBlock}>
                                <p>For PONNIAMMAN TRANSPORT</p>
                                <div className={styles.signLine} style={{ marginTop: '40px' }} />
                                <p>Authorised Signatory</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PageWrapper>
    );
};

const HeaderInput = ({ value, onRename }) => {
    const [editing, setEditing] = useState(false);
    return editing ? (
        <input 
            type="text" 
            autoFocus 
            value={value} 
            onChange={(e) => onRename(e.target.value)} 
            onBlur={() => setEditing(false)} 
            className={styles.headerInput}
            style={{ width: 'auto', display: 'inline', border: '1px dashed #ccc' }}
        />
    ) : (
        <span onClick={() => setEditing(true)} title="Click to rename">{value}</span>
    );
};

export default InvoiceBuilder;
