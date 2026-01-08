
// Supabase Configuration
// Using the credentials provided by the user.

const SUPABASE_URL = 'https://fgstfoegqsveclqvcpwx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnc3Rmb2VncXN2ZWNscXZjcHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzQ3NjgsImV4cCI6MjA4Mjg1MDc2OH0.hz1HgLiABOgWGilrna8RJNm9wh-FV1yKl3MFTtw0e_4';

// Initialize Client (will be used by storageSystem.js)
// We assume the script is loaded AFTER the CDN script for supabase-js
// Initialize Client (will be used by storageSystem.js)
// We assume the script is loaded AFTER the CDN script for supabase-js
let _sbClient = null;

if (window.supabase && window.supabase.createClient) {
    // If loaded via CDN (v2)
    _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase Client Initialized");
} else {
    console.error("Supabase JS Library not found! Make sure to include the CDN script.");
}

window.supabaseClient = _sbClient;
