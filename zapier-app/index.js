'use strict';

const authentication = require('./authentication');
const { USER_AGENT } = require('./constants');
const recommend = require('./creates/recommend');
const aeoScan = require('./creates/aeoScan');
const getBalance = require('./creates/getBalance');

// Attach the Bearer key + a distinct User-Agent to every outgoing request.
const addAuthHeader = (request, z, bundle) => {
  request.headers = request.headers || {};
  if (bundle.authData && bundle.authData.apiKey) {
    request.headers.Authorization = `Bearer ${bundle.authData.apiKey}`;
  }
  request.headers['User-Agent'] = USER_AGENT;
  return request;
};

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  authentication,

  beforeRequest: [addAuthHeader],
  afterResponse: [],

  triggers: {},
  searches: {},
  creates: {
    [recommend.key]: recommend,
    [aeoScan.key]: aeoScan,
    [getBalance.key]: getBalance,
  },
};
