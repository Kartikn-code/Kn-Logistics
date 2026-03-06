import { useState } from 'react';
import { Search, Package, MapPin, Truck, CheckCircle } from 'lucide-react';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import { getOrderById } from '../utils/api';
import styles from './Tracking.module.css';

const Tracking = () => {
    const [orderId, setOrderId] = useState('');
    const [trackingData, setTrackingData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTrack = async (e) => {
        e.preventDefault();
        if (!orderId.trim()) return;

        setLoading(true);
        setError('');
        setTrackingData(null);

        try {
            const data = await getOrderById(orderId);
            if (data) {
                // Calculate progress
                let progress = 0;
                switch (data.status) {
                    case 'Loading': progress = 10; break;
                    case 'In Transit': progress = 50; break;
                    case 'Near Destination': progress = 80; break;
                    case 'Delivered': progress = 100; break;
                    default: progress = 0;
                }

                setTrackingData({
                    ...data,
                    location: data.currentLocation, // Map backend field to frontend expected field
                    lastUpdated: new Date(data.timestamp).toLocaleString(),
                    progress
                });
            } else {
                setError('Order not found. Please check the ID.');
            }
        } catch (err) {
            setError('Failed to fetch tracking info');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status) => {
        switch (status) {
            case 'Loading': return 1;
            case 'In Transit': return 2;
            case 'Near Destination': return 3;
            case 'Delivered': return 4;
            default: return 0;
        }
    };

    return (
        <div className={styles.trackingPage}>
            <header className={styles.header}>
                <div className={styles.container}>
                    <h1>Live Tracking</h1>
                    <p>Track your shipment in real-time with your Order ID.</p>
                </div>
            </header>

            <section className={styles.section}>
                <div className={styles.container}>
                    <Card className={styles.trackingCard}>
                        <form onSubmit={handleTrack} className={styles.searchForm}>
                            <input
                                type="text"
                                placeholder="Enter Order ID (e.g., KN-2024-X4)"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                className={styles.input}
                            />
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Tracking...' : 'Track Order'}
                            </Button>
                        </form>

                        {error && <p className={styles.error}>{error}</p>}

                        {trackingData && (
                            <div className={styles.result}>
                                <div className={styles.statusHeader}>
                                    <div>
                                        <h3>Order #{trackingData.orderId}</h3>
                                        <p className={styles.timestamp}>Last Updated: {trackingData.lastUpdated}</p>
                                    </div>
                                    <div className={`${styles.statusBadge} ${styles[trackingData.status.replace(/\s/g, '').toLowerCase()]}`}>
                                        {trackingData.status}
                                    </div>
                                </div>

                                <div className={styles.detailsGrid}>
                                    <div className={styles.detailItem}>
                                        <Truck size={20} />
                                        <div>
                                            <label>Truck details</label>
                                            <p>{trackingData.truckNumber} ({trackingData.truckType})</p>
                                        </div>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <MapPin size={20} />
                                        <div>
                                            <label>Current Location</label>
                                            <p>{trackingData.location}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.progressBar}>
                                    <div className={styles.progressLine}>
                                        <div className={styles.progressFill} style={{ width: `${trackingData.progress}%` }}></div>
                                    </div>
                                    <div className={styles.steps}>
                                        {['Loading', 'In Transit', 'Near Destination', 'Delivered'].map((step, idx) => {
                                            const currentStep = getStatusStep(trackingData.status);
                                            const isCompleted = idx + 1 <= currentStep;
                                            return (
                                                <div key={idx} className={`${styles.step} ${isCompleted ? styles.completed : ''}`}>
                                                    <div className={styles.dot}>{isCompleted ? <CheckCircle size={14} /> : null}</div>
                                                    <span>{step}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!trackingData && !loading && (
                            <div className={styles.placeholder}>
                                <Package size={64} style={{ opacity: 0.2 }} />
                                <p>Enter your Order ID to see shipment details</p>
                            </div>
                        )}
                    </Card>
                </div>
            </section>
        </div>
    );
};

export default Tracking;
