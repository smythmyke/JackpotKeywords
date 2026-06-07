'use strict';

const { BASE_URL } = require('../constants');

// Recommend Keywords runs the full JackpotKeywords pipeline (60-180s), which
// blows past Zapier's 30s action timeout. So we use the async callback pattern:
// perform enqueues a job via POST /v1/jobs with a Zapier-generated callback URL
// and returns immediately; the JK worker POSTs the result to that URL when done,
// resuming the Zap in performResume.

const perform = async (z, bundle) => {
  const callbackUrl = z.generateCallbackUrl();
  const response = await z.request({
    url: `${BASE_URL}/jobs`,
    method: 'POST',
    body: {
      operation: 'recommend',
      input: {
        url: bundle.inputData.url || undefined,
        description: bundle.inputData.description || undefined,
        limit: bundle.inputData.limit || undefined,
        budget: bundle.inputData.budget || undefined,
        location: bundle.inputData.location || undefined,
      },
      callbackUrl,
    },
  });
  // Becomes bundle.outputData in performResume.
  return response.data;
};

const performResume = (z, bundle) => {
  // bundle.cleanedRequest is what the JK worker POSTed to the callback URL:
  // { jobId, status: 'success', recommendations, ... } or { jobId, status: 'error', error }.
  const callback = bundle.cleanedRequest || {};
  if (callback.status === 'error') {
    throw new z.errors.Error(
      callback.error || 'JackpotKeywords recommend job failed.',
      'JobError',
      500,
    );
  }
  return { ...bundle.outputData, ...callback };
};

module.exports = {
  key: 'recommend',
  noun: 'Keyword Recommendation',
  display: {
    label: 'Recommend Keywords',
    description:
      'Run the JackpotKeywords pipeline for a product (URL and/or description) and return ranked keyword recommendations. Costs $0.10. Takes 1-3 minutes — Zapier waits for the result.',
  },
  operation: {
    inputFields: [
      {
        key: 'url',
        label: 'Product URL',
        type: 'string',
        helpText: 'e.g. `https://yourproduct.com`. Provide a URL and/or a Description.',
      },
      {
        key: 'description',
        label: 'Product Description',
        type: 'text',
        helpText: 'Plain-English description. Provide a URL and/or a Description.',
      },
      {
        key: 'limit',
        label: 'Limit',
        type: 'integer',
        default: '50',
        helpText: 'Max recommendations to return (1-200). Cost is flat regardless.',
      },
      {
        key: 'budget',
        label: 'Daily Budget (USD)',
        type: 'number',
        helpText: 'Optional. Influences AI scoring / intent classification.',
      },
      {
        key: 'location',
        label: 'Location',
        type: 'string',
        helpText: 'Optional. Local-intent boosting, e.g. `San Francisco, CA`.',
      },
    ],
    perform,
    performResume,
    sample: {
      jobId: 'abc123',
      status: 'success',
      productName: 'Example Product',
      returned: 2,
      totalCandidates: 120,
      balanceCents: 490,
      recommendations: [
        {
          keyword: 'ai keyword research tool',
          monthlyVolume: 1900,
          lowCpc: 1.2,
          highCpc: 4.5,
          competition: 'MEDIUM',
          jackpotScore: 87,
          intent: 'commercial',
        },
      ],
    },
    outputFields: [
      { key: 'jobId', label: 'Job ID' },
      { key: 'status', label: 'Status' },
      { key: 'productName', label: 'Product Name' },
      { key: 'returned', label: 'Returned', type: 'integer' },
      { key: 'totalCandidates', label: 'Total Candidates', type: 'integer' },
      { key: 'balanceCents', label: 'Balance (cents)', type: 'integer' },
    ],
  },
};
