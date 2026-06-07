'use strict';

// Direct Cloud Function URL, NOT the jackpotkeywords.web.app Hosting rewrite —
// Firebase Hosting kills proxied requests at 60s. (The /jobs initiation is fast,
// but we keep all surfaces on the same base for consistency.)
const BASE_URL =
  process.env.JK_API_BASE ||
  'https://us-central1-even-plate-378520.cloudfunctions.net/api/api/v1';

// Distinct User-Agent so surface attribution can split Zapier traffic later
// (the backend's ApiSource resolver widening is a deferred to-do).
const USER_AGENT = 'jackpotkeywords-zapier/0.1.0';

module.exports = { BASE_URL, USER_AGENT };
