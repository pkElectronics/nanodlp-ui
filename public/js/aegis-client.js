const API_BASE = '/athena-iot/aegis';

const request = async (path, method = 'GET') => {
    const response = await fetch(`${API_BASE}/${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
};

const isAegisAvailable = async () => {
    if (DEV_MODE) return true

    return request('available');
};


const doesFilterNeedReplacement = async () => {
    if (DEV_MODE) return { 'filter_needs_replacement': false}
    return request('filter_needs_replacement');
};

const getFiltrationMode = async () => request('filtration_mode');

const activateAegis = async () => request('activate', 'POST');

const deactivateAegis = async () => request('deactivate', 'POST');

const performFiltering = async() => request('perform_filtering', 'POST');

