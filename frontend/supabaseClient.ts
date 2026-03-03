import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://dstlxhupmtclrumvojzi.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzdGx4aHVwbXRjbHJ1bXZvanppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MzI2MDIsImV4cCI6MjA4ODEwODYwMn0.tpRzPpAVI5R4Vyxdf8PQP8Wb8XOmv2HM3Ndb24_sW6E"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)