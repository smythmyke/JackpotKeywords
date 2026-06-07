'use strict';

const { BASE_URL } = require('./constants');

// API-key authentication. JackpotKeywords issues jk_live_ keys; the key is sent
// as `Authorization: Bearer <key>` (added by the beforeRequest middleware in
// index.js). The test request hits GET /me, which also yields the email used
// for the connection label.
module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'string',
      required: true,
      helpText:
        'Your `jk_live_…` API key. Generate one at [jackpotkeywords.web.app/developers](https://jackpotkeywords.web.app/developers) (new accounts include $2 of starter credit).',
    },
  ],
  test: {
    url: `${BASE_URL}/me`,
    method: 'GET',
  },
  connectionLabel: '{{email}}',
};
