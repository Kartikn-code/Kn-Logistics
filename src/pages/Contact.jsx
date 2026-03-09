import { useState, useRef } from 'react';
import { Phone, Mail, MapPin, Clock, Loader2 } from 'lucide-react';
import emailjs from '@emailjs/browser';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import styles from './Contact.module.css';

const Contact = () => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }

    const form = useRef();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const serviceId = 'service_m36m2ub'; // Replace with your actual Service ID
            const publicKey = 'sjYV23tYneXD3eLTD'; // Replace with your actual Public Key

            // 1. Send Admin Notification Email
            await emailjs.sendForm(
                serviceId,
                'admin_template', // Replaced with your admin template ID
                form.current,
                publicKey
            );

            // 2. Send User Confirmation Email
            await emailjs.sendForm(
                serviceId,
                'user_template', // Replaced with your user template ID
                form.current,
                publicKey
            );

            console.log('Emails successfully sent.');
            setStatus({ type: 'success', message: 'Thank you! Your message has been sent successfully.' });
            e.target.reset(); // Clear the form
        } catch (error) {
            console.error('EmailJS Error:', error.text || error);
            setStatus({ type: 'error', message: 'Could not connect to the email server. Please try again later.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.contactPage}>
            <header className={styles.header}>
                <div className={styles.container}>
                    <h1>Contact Us</h1>
                    <p>Get in touch for quotes, support, or general inquiries.</p>
                </div>
            </header>

            <section className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.grid}>
                        <div className={styles.infoColumn}>
                            <h2>Get in Touch</h2>
                            <p className={styles.intro}>
                                Whether you have a question about our services, pricing, or need to track a shipment,
                                our team is ready to answer all your questions.
                            </p>

                            <div className={styles.contactInfo}>
                                <div className={styles.infoItem}>
                                    <div className={styles.iconBox}><Phone size={24} /></div>
                                    <div>
                                        <h3>Phone</h3>
                                        <p><a href="tel:8072034620" style={{ color: 'inherit' }}>+91 8072034620</a></p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.iconBox}><Mail size={24} /></div>
                                    <div>
                                        <h3>Email</h3>
                                        <p><a href="mailto:ponniammantransport2023@gmail.com" style={{ color: 'inherit' }}>ponniammantransport2023@gmail.com</a></p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.iconBox}><MapPin size={24} /></div>
                                    <div>
                                        <h3>Headquarters</h3>
                                        <p>No 80,</p>
                                        <p>Kamatchipuram 3rd Street,Thiruverkadu</p>
                                        <p>Chennai, Tamil Nadu - 600032</p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.iconBox}><Clock size={24} /></div>
                                    <div>
                                        <h3>Business Hours</h3>
                                        <p>Mon - Sat: 9:00 AM - 8:00 PM</p>
                                        <p>Sun: Closed</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.formColumn}>
                            <Card className={styles.formCard}>
                                <h2>Send Message</h2>
                                <form ref={form} onSubmit={handleSubmit} className={styles.form}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="name">Full Name</label>
                                        <input type="text" id="name" name="name" required placeholder="Karthikeyan S" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="email">Email Address</label>
                                        <input type="email" id="email" name="email" required placeholder="Example@gmail.com" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="mobile">Mobile Number</label>
                                        <input type="tel" id="mobile" name="mobile" required placeholder="+91 9845645454" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="subject">Subject</label>
                                        <select id="subject" name="subject">
                                            <option value="Request a Quote">Request a Quote</option>
                                            <option value="Tracking Issue">Tracking Issue</option>
                                            <option value="General Inquiry">General Inquiry</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="message">Message</label>
                                        <textarea id="message" name="message" rows="4" required placeholder="How can we help you?"></textarea>
                                    </div>
                                    <Button type="submit" size="lg" style={{ width: '100%' }} disabled={loading}>
                                        {loading ? <Loader2 className="spinner" size={18} /> : 'Send Message'}
                                    </Button>

                                    {status && (
                                        <div style={{
                                            marginTop: '1rem',
                                            padding: '1rem',
                                            borderRadius: '6px',
                                            textAlign: 'center',
                                            backgroundColor: status.type === 'success' ? '#10B98120' : '#EF444420',
                                            color: status.type === 'success' ? '#10B981' : '#EF4444',
                                            border: `1px solid ${status.type === 'success' ? '#10B981' : '#EF4444'}`
                                        }}>
                                            {status.message}
                                        </div>
                                    )}
                                </form>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Contact;
