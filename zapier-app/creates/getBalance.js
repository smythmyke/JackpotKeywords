'use strict';

const { BASE_URL } = require('../constants');

// Get Balance is instant, so it's a normal synchronous action — no callback.

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${BASE_URL}/me`,
    method: 'GET',
  });
  return response.data;
};

module.exports = {
  key: 'get_balance',
  noun: 'Balance',
  display: {
    label: 'Get Balance',
    description: 'Return the current JackpotKeywords credit balance for the connected account. Free.',
  },
  operation: {
    perform,
    sample: {
      customerId: 'cust_123',
      email: 'you@example.com',
      balanceCents: 490,
      balanceUsd: '4.90',
      lifetimeDepositedCents: 0,
    },
    outputFields: [
      { key: 'customerId', label: 'Customer ID' },
      { key: 'email', label: 'Email' },
      { key: 'balanceCents', label: 'Balance (cents)', type: 'integer' },
      { key: 'balanceUsd', label: 'Balance (USD)' },
      { key: 'lifetimeDepositedCents', label: 'Lifetime Deposited (cents)', type: 'integer' },
    ],
  },
};
