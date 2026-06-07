'use strict';

const { BASE_URL } = require('../constants');

// AEO Scan (AI-visibility) takes 30-120s — also past Zapier's 30s cap, so it
// uses the same async callback pattern as Recommend.

const perform = async (z, bundle) => {
  const callbackUrl = z.generateCallbackUrl();
  const response = await z.request({
    url: `${BASE_URL}/jobs`,
    method: 'POST',
    body: {
      operation: 'aeo-scan',
      input: {
        url: bundle.inputData.url,
      },
      callbackUrl,
    },
  });
  return response.data;
};

const performResume = (z, bundle) => {
  const callback = bundle.cleanedRequest || {};
  if (callback.status === 'error') {
    throw new z.errors.Error(
      callback.error || 'JackpotKeywords AEO scan job failed.',
      'JobError',
      500,
    );
  }
  return { ...bundle.outputData, ...callback };
};

module.exports = {
  key: 'aeo_scan',
  noun: 'AEO Scan',
  display: {
    label: 'Run AEO Scan',
    description:
      'Run an AI-visibility scan for a URL: across 10 buyer-intent queries, is the page cited or mentioned by AI search? Costs $1.00. Takes ~30-120s — Zapier waits for the result.',
  },
  operation: {
    inputFields: [
      {
        key: 'url',
        label: 'URL',
        type: 'string',
        required: true,
        helpText: 'The product URL to scan, e.g. `https://yourproduct.com`.',
      },
    ],
    perform,
    performResume,
    sample: {
      jobId: 'def456',
      status: 'success',
      url: 'https://example.com',
      productName: 'Example Product',
      visibilityScore: 60,
      queriesChecked: 10,
      queriesCited: 4,
      queriesMentioned: 6,
      balanceCents: 400,
    },
    outputFields: [
      { key: 'jobId', label: 'Job ID' },
      { key: 'status', label: 'Status' },
      { key: 'url', label: 'URL' },
      { key: 'productName', label: 'Product Name' },
      { key: 'visibilityScore', label: 'Visibility Score', type: 'integer' },
      { key: 'queriesChecked', label: 'Queries Checked', type: 'integer' },
      { key: 'queriesCited', label: 'Queries Cited', type: 'integer' },
      { key: 'queriesMentioned', label: 'Queries Mentioned', type: 'integer' },
      { key: 'balanceCents', label: 'Balance (cents)', type: 'integer' },
    ],
  },
};
