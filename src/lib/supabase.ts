import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqomqjheeiyjkprbfgaf.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb21xamhlZWl5amtwcmJmZ2FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk1MjkxOSwiZXhwIjoyMDk3NTI4OTE5fQ.4TDwRvMjK1Fuk7bnjeGwgBGQAU7rxRWtSheszf-w0kU';

export const supabase = createClient(supabaseUrl, supabaseKey);
