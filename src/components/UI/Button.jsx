import clsx from 'clsx';
import { forwardRef } from 'react';
import styles from './Button.module.css';

const Button = forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    className,
    type = 'button',
    ...props
}, ref) => {
    return (
        <button
            ref={ref}
            type={type}
            className={clsx(
                styles.button,
                styles[variant],
                styles[size],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
});

Button.displayName = 'Button';

export default Button;
