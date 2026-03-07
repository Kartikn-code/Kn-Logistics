export const formatDate = (dateString) => {
    if (!dateString) return '-';

    // Clean ISO time part if present
    let cleanDate = dateString;
    if (typeof dateString === 'string' && dateString.includes('T')) {
        cleanDate = dateString.split('T')[0];
    } else if (dateString instanceof Date) {
        cleanDate = dateString.toISOString().split('T')[0];
    }

    // Check if it's already DD-MM-YY or similar
    if (typeof cleanDate === 'string' && cleanDate.includes('-') && cleanDate.split('-')[0].length === 2) return cleanDate;

    // Assuming YYYY-MM-DD format from DB
    if (typeof cleanDate === 'string') {
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];

            if (year.length === 4) {
                return `${day}-${month}-${year.slice(2)}`;
            }
        }
    }

    // Fallback if Date object works
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
    } catch {
        return dateString;
    }
};
