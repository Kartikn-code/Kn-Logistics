import clsx from 'clsx';
import styles from './Card.module.css';

const Card = ({ children, className, hover = true, ...props }) => {
    return (
        <div
            className={clsx(
                styles.card,
                hover && styles.hover,
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
