import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jmknwhflcwyagvomgqks.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impta253aGZsY3d5YWd2b21ncWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNzAzNDcsImV4cCI6MjEwNDc0NjM0N30.J55F5hYmVbMFrG1BqZVAOB6eUwZDMDHgYYAvcZ1lmlg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
