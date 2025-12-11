import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bxlheiduookkxrpwwawk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bGhlaWR1b29ra3hycHd3YXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDI0NDcsImV4cCI6MjA4MDgxODQ0N30.eaWY-z9Gv9AsPUNOVLB0Lx3G9iEte6y2-XP93Ms9Dc4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
