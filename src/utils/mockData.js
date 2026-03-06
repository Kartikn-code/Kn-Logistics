export const getTrackingInfo = async (orderId) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Deterministic mock based on ID
            const idLastChar = orderId.slice(-1);
            let status = 'In Transit';
            let location = 'Madurai, TN';
            let progress = 50;

            if (['1', '2', '3'].includes(idLastChar)) {
                status = 'Delivered';
                location = 'Chennai, TN';
                progress = 100;
            } else if (['4', '5'].includes(idLastChar)) {
                status = 'Loading';
                location = 'Coimbatore, TN';
                progress = 10;
            } else if (['8', '9'].includes(idLastChar)) {
                status = 'Near Destination';
                location = 'Trichy, TN';
                progress = 80;
            }

            resolve({
                orderId,
                truckNumber: `TN-${Math.floor(Math.random() * 90) + 10}-AB-${Math.floor(Math.random() * 9000) + 1000}`,
                truckType: Math.random() > 0.5 ? '10-Wheeler' : '12-Wheeler',
                status,
                location,
                lastUpdated: new Date().toLocaleString(),
                progress
            });
        }, 1000); // Simulate network delay
    });
};

export const getDashboardStats = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                activeTrucks: Math.floor(Math.random() * 20) + 10,
                inwardOps: Math.floor(Math.random() * 15) + 5,
                outwardOps: Math.floor(Math.random() * 10) + 8,
                inTransit: Math.floor(Math.random() * 18) + 8,
            });
        }, 500);
    });
};
