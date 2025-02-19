import { createClient } from '@supabase/supabase-js';

// Create a single instance of the Supabase client
const supabase = createClient(
    'https://bgrbegqeoyolkrxjebho.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncmJlZ3Flb3lvbGtyeGplYmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4MDkxNjIsImV4cCI6MjA0NzM4NTE2Mn0.r2n1T5ABTbQ2YJaJm21_6AgO8CQsILgb6MJ-pPW7Zv0'
);

export default supabase;
