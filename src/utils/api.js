const API_URL = '/api';

const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const config = {
        ...options,
        headers
    };

    const response = await fetch(url, config);

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('auth_token');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login';
        }
    }

    return response;
};

// Fetch all orders
export const getOrders = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/orders`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.data; // Server returns { data: [...] }
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
};

// Fetch dashboard stats
export const getDashboardStats = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        return await response.json();
    } catch (error) {
        console.error('Error fetching stats:', error);
        return {
            total: 0,
            activeTrucks: 0,
            inTransit: 0
        };
    }
};

// Fetch single order
export const getOrderById = async (id) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/orders/${id}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching order:', error);
        return null;
    }
};

// Create or Update Order (Admin)
export const createOrder = async (orderData) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });
        return await response.json();
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
};

// Upload CSV (Admin)
export const uploadOrders = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetchWithAuth(`${API_URL}/upload`, {
            method: 'POST',
            body: formData, // fetchWithAuth will handle multipart/form-data boundary nicely since header logic won't overwrite Content-Type
        });
        return await response.json();
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

// Upload Excel for financial data
export const uploadFinancialData = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetchWithAuth(`${API_URL}/upload-financial`, {
            method: 'POST',
            body: formData,
        });
        return await response.json();
    } catch (error) {
        console.error('Error uploading financial data:', error);
        throw error;
    }
};

// Fetch annual summary
export const getAnnualSummary = async (paymentStatus = '') => {
    try {
        const url = paymentStatus ? `${API_URL}/analytics/annual-summary?paymentStatus=${paymentStatus}` : `${API_URL}/analytics/annual-summary`;
        const response = await fetchWithAuth(url);
        if (!response.ok) throw new Error('Failed to fetch annual summary');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching annual summary:', error);
        return [];
    }
};

// Fetch truck-based earnings
export const getTruckEarnings = async (year, paymentStatus = '') => {
    try {
        let url = year ? `${API_URL}/analytics/truck-earnings?year=${year}` : `${API_URL}/analytics/truck-earnings`;
        if (paymentStatus) {
            url += url.includes('?') ? `&paymentStatus=${paymentStatus}` : `?paymentStatus=${paymentStatus}`;
        }
        const response = await fetchWithAuth(url);
        if (!response.ok) throw new Error('Failed to fetch truck earnings');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching truck earnings:', error);
        return [];
    }
};

// Fetch monthly earnings
export const getMonthlyEarnings = async (year, paymentStatus = '') => {
    try {
        let url = year ? `${API_URL}/analytics/monthly-earnings?year=${year}` : `${API_URL}/analytics/monthly-earnings`;
        if (paymentStatus) {
            url += url.includes('?') ? `&paymentStatus=${paymentStatus}` : `?paymentStatus=${paymentStatus}`;
        }
        const response = await fetchWithAuth(url);
        if (!response.ok) throw new Error('Failed to fetch monthly earnings');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching monthly earnings:', error);
        return [];
    }
};

// Fetch filtered records
export const getFilteredRecords = async (params) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.truckNo) queryParams.append('truckNo', params.truckNo);
        if (params.invoiceNo) queryParams.append('invoiceNo', params.invoiceNo);
        if (params.dispatchDate) queryParams.append('dispatchDate', params.dispatchDate);
        if (params.deliveryDate) queryParams.append('deliveryDate', params.deliveryDate);
        if (params.loading) queryParams.append('loading', params.loading);
        if (params.unloading) queryParams.append('unloading', params.unloading);
        if (params.freight) queryParams.append('freight', params.freight);
        if (params.year) queryParams.append('year', params.year);
        if (params.paymentStatus && params.paymentStatus !== 'All') queryParams.append('paymentStatus', params.paymentStatus);

        const response = await fetchWithAuth(`${API_URL}/analytics/filtered-records?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch filtered records');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching filtered records:', error);
        return [];
    }
};

export const createDispatchRecord = async (data) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/analytics/record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create record');
        return result;
    } catch (error) {
        console.error('Error creating record:', error);
        throw error;
    }
};

export const updateDispatchRecord = async (id, data) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/analytics/record/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update record');
        return result;
    } catch (error) {
        console.error('Error updating record:', error);
        throw error;
    }
};

export const deleteDispatchRecords = async (ids) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/analytics/filtered-records`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
        });
        return await response.json();
    } catch (error) {
        console.error('Error bulk deleting records:', error);
        throw error;
    }
};

export const deleteAllDispatchRecords = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/analytics/records/all`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete all records');
        return await response.json();
    } catch (error) {
        console.error('Error deleting all records:', error);
        throw error;
    }
};

export const resetDatabase = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/reset-database`, {
            method: 'DELETE',
        });
        return await response.json();
    } catch (error) {
        console.error('Error resetting database:', error);
        throw error;
    }
};

export const changePassword = async (username, oldPassword, newPassword) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, oldPassword, newPassword }),
        });
        return await response.json();
    } catch (error) {
        console.error('Error changing password:', error);
        throw error;
    }
};

export const deleteOrders = async (ids) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/orders`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
        });
        return await response.json();
    } catch (error) {
        console.error('Error bulk deleting orders:', error);
        throw error;
    }
};

// --- PAYMENTS API ---

export const getBasicStats = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/basic-stats`);
        if (!response.ok) throw new Error('Failed to fetch basic stats');
        return await response.json();
    } catch (error) {
        console.error('Error fetching basic stats:', error);
        return { expected: 0, received: 0, pending: 0 };
    }
};

export const getBasicPayments = async (page = 1, limit = 10) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/basic?page=${page}&limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch basic payments');
        return await response.json();
    } catch (error) {
        console.error("Error fetching basic payments:", error);
        return { data: [], pagination: {} };
    }
};

export const deleteBasicPayments = async (ids) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/basic`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
        });
        if (!response.ok) throw new Error('Failed to delete basic payments');
        return await response.json();
    } catch (error) {
        console.error("Error deleting basic payments:", error);
        throw error;
    }
};

export const deleteAllBasicPayments = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/basic/all`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete all basic payments');
        return await response.json();
    } catch (error) {
        console.error('Error deleting all basic payments:', error);
        throw error;
    }
};

export const uploadBasicPayments = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/upload-basic`, {
            method: 'POST',
            body: formData,
        });
        return await response.json();
    } catch (error) {
        console.error('Error uploading basic payments:', error);
        throw error;
    }
};

export const getInvoiceStats = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/invoice-stats`);
        if (!response.ok) throw new Error('Failed to fetch invoice stats');
        return await response.json();
    } catch (error) {
        console.error('Error fetching invoice stats:', error);
        return { totalBillValue: 0, totalAmountReceived: 0, totalAmountDeducted: 0, yetToReceive: 0, tds: 0, totalReceived: 0, totalBalance: 0, receivedCount: 0, notReceivedCount: 0 };
    }
};

export const uploadInvoicePayments = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/upload-invoice`, {
            method: 'POST',
            body: formData,
        });
        return await response.json();
    } catch (error) {
        console.error('Error uploading invoice payments:', error);
        throw error;
    }
};

export const getInvoices = async (page = 1, limit = 10, search = '') => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/invoices?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        if (!response.ok) throw new Error('Failed to fetch invoices');
        return await response.json();
    } catch (error) {
        console.error('Error fetching invoices:', error);
        throw error;
    }
};

export const updateInvoice = async (id, data) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/invoices/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update invoice');
        return await response.json();
    } catch (error) {
        console.error('Error updating invoice:', error);
        throw error;
    }
};

export const deleteInvoices = async (ids) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/invoices`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
        });
        if (!response.ok) throw new Error('Failed to delete invoices');
        return await response.json();
    } catch (error) {
        console.error('Error deleting invoices:', error);
        throw error;
    }
};

export const deleteAllInvoices = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/invoices/all`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete all invoices');
        return await response.json();
    } catch (error) {
        console.error('Error deleting all invoices:', error);
        throw error;
    }
};

export const getPaymentAnalytics = async (startDate, endDate) => {
    try {
        let qs = '';
        if (startDate && endDate) qs = `?startDate=${startDate}&endDate=${endDate}`;
        else if (startDate) qs = `?startDate=${startDate}`;
        else if (endDate) qs = `?endDate=${endDate}`;

        const response = await fetchWithAuth(`${API_URL}/payments/analytics-insights${qs}`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        return await response.json();
    } catch (error) {
        console.error('Error fetching payment analytics:', error);
        return { totalReceived: 0, transactionCount: 0 };
    }
};

export const getPaymentYearlyBreakdown = async (year) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/yearly-breakdown?year=${year}`);
        if (!response.ok) throw new Error('Failed to fetch yearly breakdown');
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('Error fetching yearly breakdown:', error);
        return [];
    }
};

// --- EXPENSES API ---

export const getExpenses = async (page = 1, limit = 10, filters = {}) => {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append('page', page);
        queryParams.append('limit', limit);
        if (filters.truckNo) queryParams.append('truckNo', filters.truckNo);
        if (filters.type) queryParams.append('type', filters.type);
        if (filters.month) queryParams.append('month', filters.month);
        if (filters.year) queryParams.append('year', filters.year);

        const response = await fetchWithAuth(`${API_URL}/payments/expenses?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch expenses');
        return await response.json();
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return { data: [], pagination: {} };
    }
};

export const uploadExpenses = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/upload-expenses`, {
            method: 'POST',
            body: formData,
        });
        return await response.json();
    } catch (error) {
        console.error('Error uploading expenses:', error);
        throw error;
    }
};

export const deleteExpenses = async (ids, all = false) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/expenses`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, all }),
        });
        if (!response.ok) throw new Error('Failed to delete expenses');
        return await response.json();
    } catch (error) {
        console.error('Error deleting expenses:', error);
        throw error;
    }
};

export const getExpenseAnalytics = async (filters = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (filters.truckNo) queryParams.append('truckNo', filters.truckNo);
        if (filters.month) queryParams.append('month', filters.month);
        if (filters.year) queryParams.append('year', filters.year);

        const response = await fetchWithAuth(`${API_URL}/payments/expense-analytics?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch expense analytics');
        return await response.json();
    } catch (error) {
        console.error('Error fetching expense analytics:', error);
        return { totalExpense: 0, transactionCount: 0, breakdown: [] };
    }
};

export const getExpenseYearlyBreakdown = async (year, truckNo = '') => {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append('year', year);
        if (truckNo) queryParams.append('truckNo', truckNo);

        const response = await fetchWithAuth(`${API_URL}/payments/expense-yearly-breakdown?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch yearly expense breakdown');
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('Error fetching yearly expense breakdown:', error);
        return [];
    }
};

export const createExpense = async (expenseData) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/payments/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expenseData),
        });
        if (!response.ok) throw new Error('Failed to record expense');
        return await response.json();
    } catch (error) {
        console.error('Error creating expense:', error);
        throw error;
    }
};

// --- BILLING API ---

export const createBill = async (billData) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/bills`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(billData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to save bill');
        return result;
    } catch (error) {
        console.error('Error saving bill:', error);
        throw error;
    }
};

export const getBills = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/bills`);
        if (!response.ok) throw new Error('Failed to fetch bills');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching bills:', error);
        return [];
    }
};

export const getBillByNo = async (billNo) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/bills/${billNo}`);
        if (!response.ok) throw new Error('Bill not found');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching bill details:', error);
        return null;
    }
};

export const deleteBill = async (billNo) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/bills/${billNo}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete bill');
        return await response.json();
    } catch (error) {
        console.error('Error deleting bill:', error);
        throw error;
    }
};

export const createEntry = async (entryData) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to add entry');
        return result;
    } catch (error) {
        console.error('Error adding entry:', error);
        throw error;
    }
};

export const updateEntry = async (id, entryData) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/entries/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update entry');
        return result;
    } catch (error) {
        console.error('Error updating entry:', error);
        throw error;
    }
};

export const deleteEntry = async (id) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/entries/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete entry');
        return await response.json();
    } catch (error) {
        console.error('Error deleting entry:', error);
        throw error;
    }
};

export const recordPayment = async (paymentData) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to record payment');
        return result;
    } catch (error) {
        console.error('Error recording payment:', error);
        throw error;
    }
};

export const getPayments = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/payments`);
        if (!response.ok) throw new Error('Failed to fetch payments');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching payments:', error);
        return [];
    }
};

export const deletePayment = async (id) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/payments/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete payment');
        return await response.json();
    } catch (error) {
        console.error('Error deleting payment:', error);
        throw error;
    }
};

export const getBillingAnalytics = async (year) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/analytics?year=${year}`);
        if (!response.ok) throw new Error('Failed to fetch billing analytics');
        return await response.json();
    } catch (error) {
        console.error('Error fetching billing analytics:', error);
        return null;
    }
};

// --- LOCATIONS API ---

export const getLocations = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/locations`);
        if (!response.ok) throw new Error('Failed to fetch locations');
        return await response.json();
    } catch (error) {
        console.error('Error fetching locations:', error);
        return [];
    }
};

export const createLocation = async (name) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to add location');
        return result;
    } catch (error) {
        console.error('Error adding location:', error);
        throw error;
    }
};

export const deleteLocation = async (id) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/locations/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete location');
        return await response.json();
    } catch (error) {
        console.error('Error deleting location:', error);
        throw error;
    }
};

// --- PARTIES API ---

export const getParties = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/parties`);
        if (!response.ok) throw new Error('Failed to fetch parties');
        return await response.json();
    } catch (error) {
        console.error('Error fetching parties:', error);
        return [];
    }
};

export const createParty = async (partyData) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/parties`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partyData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to add party');
        return result;
    } catch (error) {
        console.error('Error adding party:', error);
        throw error;
    }
};

export const deleteParty = async (id) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/billing/parties/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete party');
        return await response.json();
    } catch (error) {
        console.error('Error deleting party:', error);
        throw error;
    }
};
