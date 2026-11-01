const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL
    ?.replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '');
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Configura SUPABASE_URL y SUPABASE_SECRET_KEY en backend/.env.');
}

// Esta clave omite RLS; cada consulta privada debe aplicar filtros de autorización en el backend.
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;