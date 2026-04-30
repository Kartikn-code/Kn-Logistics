import { motion } from 'framer-motion';

const pageVariants = {
    initial: {
        opacity: 0,
        y: 10
    },
    in: {
        opacity: 1,
        y: 0
    },
    out: {
        opacity: 0,
        y: -10
    }
};

const pageTransition = {
    type: 'tween',
    ease: 'easeOut',
    duration: 0.3
};

const PageWrapper = ({ children }) => {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}
        >
            {children}
        </motion.div>
    );
};

export default PageWrapper;
