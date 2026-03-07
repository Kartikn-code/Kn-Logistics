export const formatDate = (dateString) => {
    if (!dateString) return '-';
    // Check if it's already DD-MM-YY or similar
    if (dateString.includes('-') && dateString.split('-')[0].length === 2) return dateString;

    // Assuming YYYY-MM-DD format from DB
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];

        if (year.length === 4) {
            return `${day}-${month}-${year.slice(2)}`;
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
