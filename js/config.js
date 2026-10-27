/* ====================================================================
   FPS IGNITE XIII - website settings
   Open SETUP.md for the 5-minute guide. You only need to change the two
   lines marked  <-- PASTE.  Keep the quote marks.
   ==================================================================== */
window.IGNITE_CONFIG = {
  // Supabase > Project Settings > API
  SUPABASE_URL: "https://vhxzgreamzngmdmtvhcm.supabase.co",          // <-- PASTE  (looks like https://abcdefgh.supabase.co)
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoeHpncmVhbXpuZ21kbXR2aGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1ODMxMzcsImV4cCI6MjEwODE1OTEzN30.im2OZkC_APd-nvbDvg8Tq2jDMtnHBhx3NJM70fE-mwc",  // <-- PASTE  (the long "anon public" key)

  // ---- Footer contact details (shown at the very bottom of every page) ----
  CONTACT: {
    address: "FPS A LEVEL 42-B, Block-6, P.E.C.H.S. Dr. Mahmood Hussain Road Karachi",
    email: "fpsalevelignite@fps.edu.pk",
    phone: "021 - 34529181"
  },
  // ---- Social links: paste the full link between the quotes, e.g. "https://www.instagram.com/yourpage".
  //      Leave "" to hide that icon. ----
  SOCIAL: {
    instagram: "https://www.instagram.com/fpsignite/",
    facebook: "https://www.facebook.com/fpsalignite/"
  },

  // How often an open screen checks for changes, in milliseconds.
  // 2500 = about every 2.5 seconds. (Lower = faster but uses more of the free quota.)
  POLL_MS: 2500,
  // Same, when the browser tab is in the background.
  POLL_HIDDEN_MS: 15000
};
