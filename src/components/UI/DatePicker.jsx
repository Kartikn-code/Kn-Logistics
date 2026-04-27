import React from 'react';
import { Calendar } from 'lucide-react';
import styles from './DatePicker.module.css';
import clsx from 'clsx';

const DatePicker = ({ label, error, className, ...props }) => {
    return (
        <div className={clsx(styles.container, className)}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={clsx(styles.inputWrapper, error && styles.error)}>
                <Calendar size={16} className={styles.icon} />
                <input type="date" className={styles.input} {...props} />
            </div>
            {error && <span className={styles.errorMsg}>{error}</span>}
        </div>
    );
};

export default DatePicker;
