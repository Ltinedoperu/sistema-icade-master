import { createClient } from '@supabase/supabase-js';

// --- PEGA AQUÍ TUS CREDENCIALES NUEVAS ---
const supabaseUrl = 'https://oxjwqcngtgylvgobdpir.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94andxY25ndGd5bHZnb2JkcGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDAxMzIsImV4cCI6MjA4NDA3NjEzMn0.r2krTP_r1gDFerMtxz-0CJkfoVKErmqgYxvnKoXZuQA';

export const supabase = createClient(supabaseUrl, supabaseKey);