import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Search, AlertCircle, CheckCircle } from 'lucide-react';
import PageWrapper from '../../components/UI/PageWrapper';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { getLocations, createLocation, deleteLocation } from '../../utils/api';
import styles from './Locations.module.css';

const Locations = () => {
    const [locations, setLocations] = useState([]);
    const [newName, setNewName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const data = await getLocations();
            setLocations(data);
        } catch (err) {
            console.error('Failed to fetch locations');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setLoading(true);
        setStatus(null);
        try {
            await createLocation(newName.toUpperCase().trim());
            setNewName('');
            setStatus({ type: 'success', message: 'Location added successfully' });
            fetchLocations();
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Failed to add location' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this location?')) return;
        
        try {
            await deleteLocation(id);
            fetchLocations();
        } catch (err) {
            alert('Failed to delete location');
        }
    };

    const filteredLocations = locations.filter(loc => 
        loc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <PageWrapper>
            <div className={styles.container}>
                <div className={styles.header}>
                    <MapPin size={32} className={styles.icon} />
                    <div>
                        <h1>Manage Locations</h1>
                        <p>Add or remove locations for billing entries</p>
                    </div>
                </div>

                <div className={styles.content}>
                    {/* Add New Section */}
                    <Card className={styles.addCard}>
                        <h2>Add New Location</h2>
                        <form onSubmit={handleAdd} className={styles.addForm}>
                            <input 
                                type="text" 
                                value={newName}
                                onChange={(e) => setNewName(e.target.value.toUpperCase())}
                                placeholder="Enter Location Name"
                                disabled={loading}
                            />
                            <Button type="submit" disabled={loading || !newName.trim()}>
                                <Plus size={20} /> Add Location
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
                            <h2>Location List ({locations.length})</h2>
                            <div className={styles.search}>
                                <Search size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search locations..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Location Name</th>
                                        <th>Added Date</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLocations.map(loc => (
                                        <tr key={loc.id}>
                                            <td><strong>{loc.name}</strong></td>
                                            <td>{new Date(loc.createdAt).toLocaleDateString()}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button 
                                                    className={styles.deleteBtn}
                                                    onClick={() => handleDelete(loc.id)}
                                                    title="Delete Location"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLocations.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className={styles.empty}>No locations found</td>
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

export default Locations;
