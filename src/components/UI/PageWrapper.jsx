import { motion } from 'framer-motion';

const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
        scale: 0.98
    },
    in: {
        opacity: 1,
        y: 0,
        scale: 1
    },
    out: {
        opacity: 0,
        y: -20,
        scale: 1.02
    }
};

const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.6
};

const PageWrapper = ({ children }) => {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            style={{ width: '100%', minHeight: '100vh', paddingTop: '70px' }}
        >
            {children}
        </motion.div>
    );
};

export default PageWrapper;
