import React from 'react';
import { Truck, Package, MapPin, Activity, Globe, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './LogisticsLoader.module.css';

const LogisticsLoader = ({ message = "Initializing Fleet Intelligence..." }) => {
    return (
        <div className={styles.overlay}>
            <div className={styles.visualTreat}>
                {/* Connecting Network Nodes */}
                <div className={styles.network}>
                    {[...Array(6)].map((_, i) => (
                        <motion.div 
                            key={i}
                            className={styles.node}
                            style={{ 
                                top: `${Math.random() * 100}%`, 
                                left: `${Math.random() * 100}%` 
                            }}
                            animate={{ 
                                scale: [1, 1.5, 1],
                                opacity: [0.3, 0.7, 0.3]
                            }}
                            transition={{ duration: 2 + i, repeat: Infinity }}
                        />
                    ))}
                    <svg className={styles.lines}>
                        <motion.line 
                            x1="10%" y1="20%" x2="90%" y2="80%" 
                            stroke="rgba(244, 63, 94, 0.2)" 
                            strokeWidth="1"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.line 
                            x1="80%" y1="10%" x2="20%" y2="90%" 
                            stroke="rgba(244, 63, 94, 0.2)" 
                            strokeWidth="1"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                        />
                    </svg>
                </div>

                {/* The Moving Fleet */}
                <div className={styles.fleetTrack}>
                    {[...Array(3)].map((_, i) => (
                        <motion.div 
                            key={i}
                            className={styles.truckUnit}
                            initial={{ x: '-100%' }}
                            animate={{ x: '110%' }}
                            transition={{ 
                                duration: 3 + i, 
                                repeat: Infinity, 
                                ease: "linear",
                                delay: i * 0.8
                            }}
                        >
                            <Truck size={40 - (i * 5)} className={styles.truckIcon} />
                            <div className={styles.cargo}>
                                <motion.div 
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                >
                                    <Package size={14} />
                                </motion.div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Central Brain/Hub */}
                <div className={styles.hubContainer}>
                    <motion.div 
                        className={styles.hub}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                        <Globe size={80} className={styles.globeIcon} />
                    </motion.div>
                    
                    <motion.div 
                        className={styles.pulse}
                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />

                    <div className={styles.hubContent}>
                        <Zap size={32} color="#fde047" />
                    </div>
                </div>

                <div className={styles.infoBox}>
                    <motion.div 
                        className={styles.activity}
                        animate={{ width: ['0%', '100%', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <Activity size={16} />
                        <span>System Syncing...</span>
                    </motion.div>
                    <h2 className={styles.loaderMessage}>{message}</h2>
                    <p className={styles.subMessage}>Optimizing routes and securing data packets</p>
                </div>

                <div className={styles.footerProgress}>
                    <div className={styles.bar}>
                        <motion.div 
                            className={styles.fill}
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogisticsLoader;
