/**
 * Cliente HTTP centralizado para PraxisTrack
 * Se comunica con el backend asegurando el envío de tokens y manejo de errores.
 */
const ApiClient = {
    async request(endpoint, options = {}) {
        const baseUrl = window.PRAXISTRACK_CONFIG.apiBaseUrl;
        const token = await window.PRAXISTRACK_CONFIG.getAccessToken();

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const url = `${baseUrl}${endpoint}`;
            let response = await fetch(url, config);

            if (response.status === 401 && token) {
                const refreshedToken = await window.PRAXISTRACK_CONFIG.refreshAccessToken();
                if (refreshedToken && refreshedToken !== token) {
                    response = await fetch(url, {
                        ...config,
                        headers: {
                            ...headers,
                            Authorization: `Bearer ${refreshedToken}`
                        }
                    });
                }
            }

            // Si es 204 No Content (ej. eliminar cuenta), retornamos true directamente
            if (response.status === 204) {
                return true;
            }

            const data = await response.json();

            if (!response.ok) {
                // El backend devuelve mensajes de error personalizados
                throw new Error(data.message || data.error || 'Ocurrió un error en la solicitud.');
            }

            return data;
        } catch (error) {
            console.error(`[API Error] ${endpoint}:`, error.message);
            throw error;
        }
    },

    // Métodos auxiliares para abreviar peticiones
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    patch(endpoint, body) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// Exportar globalmente
window.ApiClient = ApiClient;