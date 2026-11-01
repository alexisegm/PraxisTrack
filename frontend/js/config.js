window.PRAXISTRACK_CONFIG = {
    // URL base de tu backend local en Node.js
    apiBaseUrl: 'http://localhost:3000/api',

    // Credenciales públicas de Supabase (las encuentras en tu dashboard de Supabase)
    supabaseUrl: 'https://wqhgyiuqsholvavpvyiu.supabase.co',
    supabasePublishableKey: 'sb_publishable_M8gM8fEOlTByXX-NhYPA4Q_FJtj45gu',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxaGd5aXVxc2hvbHZhdnB2eWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NTg4MzQsImV4cCI6MjEwODAzNDgzNH0.9tLjDyFv55NA9o2QQqcp3hTP-ViM18O68fLYJqExPF0',

    getAccessToken: async function() {
        const { data, error } = await this.supabaseClient.auth.getSession();
        if (error) throw error;
        return data.session?.access_token || null;
    },

    refreshAccessToken: async function() {
        const { data, error } = await this.supabaseClient.auth.refreshSession();
        if (error) throw error;
        return data.session?.access_token || null;
    },

    signOut: async function() {
        const { error } = await this.supabaseClient.auth.signOut();
        if (error) throw error;
        window.location.href = 'auth.html';
    }
};

window.PRAXISTRACK_CONFIG.supabaseClient = window.supabase.createClient(
    window.PRAXISTRACK_CONFIG.supabaseUrl,
    window.PRAXISTRACK_CONFIG.supabasePublishableKey || window.PRAXISTRACK_CONFIG.supabaseAnonKey
);