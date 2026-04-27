import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Search, AlertCircle, CheckCircle, FileText, Hash } from 'lucide-react';
import PageWrapper from '../../components/UI/PageWrapper';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { getParties, createParty, deleteParty } from '../../utils/api';
import styles from './Parties.module.css';

const Parties = () => {
    const [parties, setParties] = useState([]);
    const [formData, setFormData] = useState({ name: '', address: '', gst: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        fetchParties();
    }, []);

    const fetchParties = async () => {
        setLoading(true);
        try {
            const data = await getParties();
            setParties(data);
        } catch (err) {
            console.error('Failed to fetch parties');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setLoading(true);
        setStatus(null);
        try {
            await createParty(formData);
            setFormData({ name: '', address: '', gst: '' });
            setStatus({ type: 'success', message: 'Party added successfully' });
            fetchParties();
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Failed to add party' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this party?')) return;
        try {
            await deleteParty(id);
            fetchParties();
        } catch (err) {
            alert('Failed to delete party');
        }
    };

    const filteredParties = parties.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.gst?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <PageWrapper>
            <div className={styles.container}>
                <div className={styles.header}>
                    <Users size={32} className={styles.icon} />
                    <div>
                        <h1>Manage Parties & Addresses</h1>
                        <p>Save customer addresses and GST numbers for quick invoicing</p>
                    </div>
                </div>

                <div className={styles.content}>
                    {/* Add New Section */}
                    <Card className={styles.addCard}>
                        <h2>Add New Party</h2>
                        <form onSubmit={handleAdd} className={styles.addForm}>
                            <div className={styles.field}>
                                <label><Users size={16} /> Party Name *</label>
                                <input 
                                    type="text" 
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="E.G. NIPPON PAINT (INDIA) PVT LTD"
                                    required
                                />
                            </div>
                            <div className={styles.field}>
                                <label><Hash size={16} /> GST NO</label>
                                <input 
                                    type="text" 
                                    name="gst"
                                    value={formData.gst}
                                    onChange={handleChange}
                                    placeholder="33AAC..."
                                />
                            </div>
                            <div className={styles.field}>
                                <label><FileText size={16} /> Full Address</label>
                                <textarea 
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Line 1, Line 2, City, State - PIN"
                                    rows={4}
                                />
                            </div>
                            <Button type="submit" disabled={loading || !formData.name.trim()}>
                                <Plus size={20} /> Add Party
                            </Button>
                        </form>
                        {status && (
                            <div className={`${styles.status} ${styles[status.type]}`}>
                                {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                {status.message}
                            </div>
                        )}
                    </Card>

                    {/* List Section */}
                    <Card className={styles.listCard}>
                        <div className={styles.listHeader}>
                            <h2>Party List ({parties.length})</h2>
                            <div className={styles.search}>
                                <Search size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search by name or GST..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Party Name / GST</th>
                                        <th>Address</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredParties.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                <div className={styles.partyInfo}>
                                                    <strong>{p.name}</strong>
                                                    <span className={styles.gstTag}>{p.gst || 'NO GST'}</span>
                                                </div>
                                            </td>
                                            <td className={styles.addrCell}>{p.address}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button 
                                                    className={styles.deleteBtn}
                                                    onClick={() => handleDelete(p.id)}
                                                    title="Delete Party"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredParties.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className={styles.empty}>No parties found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </PageWrapper>
    );
};

export default Parties;
