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

const doesFilterNeedReplacement = async () => {
    if (DEV_MODE) return { 'filter_needs_replacement': false}
    return request('filter_needs_replacement');
};