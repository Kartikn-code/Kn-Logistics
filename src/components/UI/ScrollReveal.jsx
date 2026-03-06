import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './ScrollReveal.module.css';

const ScrollReveal = ({
    children,
    variant = 'fade-up', // fade-up, fade-in, scale
    delay = 0,
    duration = 0.6,
    className
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [variant, delay, duration]);

    const style = {
        transitionDuration: `${duration}s`,
        transitionDelay: `${delay}s`,
    };

    return (
        <div
            ref={ref}
            className={clsx(
                styles.reveal,
                styles[variant],
                isVisible && styles.visible,
                className
            )}
            style={style}
        >
            {children}
        </div>
    );
};

export default ScrollReveal;
