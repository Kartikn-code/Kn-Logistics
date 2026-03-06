const API_URL = 'http://localhost:3001/api';

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
export const getAnnualSummary = async () => {
    try {
        const response = await fetchWithAuth(`${API_URL}/analytics/annual-summary`);
        if (!response.ok) throw new Error('Failed to fetch annual summary');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching annual summary:', error);
        return [];
    }
};

// Fetch truck-based earnings
export const getTruckEarnings = async (year) => {
    try {
        const url = year ? `${API_URL}/analytics/truck-earnings?year=${year}` : `${API_URL}/analytics/truck-earnings`;
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
export const getMonthlyEarnings = async (year) => {
    try {
        const url = year ? `${API_URL}/analytics/monthly-earnings?year=${year}` : `${API_URL}/analytics/monthly-earnings`;
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
        if (params.truckType) queryParams.append('truckType', params.truckType);
        if (params.month) queryParams.append('month', params.month);
        if (params.year) queryParams.append('year', params.year);
        if (params.sourceLocation) queryParams.append('sourceLocation', params.sourceLocation);
        if (params.minRevenue) queryParams.append('minRevenue', params.minRevenue);
        if (params.maxRevenue) queryParams.append('maxRevenue', params.maxRevenue);

        const response = await fetchWithAuth(`${API_URL}/analytics/filtered-records?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch filtered records');
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching filtered records:', error);
        return [];
    }
};

export const updateDispatchRecord = async (id, data) => {
    try {
        const response = await fetchWithAuth(`${API_URL}/analytics/record/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return await response.json();
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
