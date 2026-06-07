import { type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { JACKPOTKEYWORDS_API_BASE } from '../../credentials/JackpotKeywordsApi.credentials';

// Pipeline endpoints run 60-180s. n8n lets a node set its own request timeout
// (unlike Zapier's hard 30s cap), so we give the synchronous JackpotKeywords
// endpoints a generous 5-minute ceiling and call them directly.
const REQUEST_TIMEOUT_MS = 300000;

// Distinct User-Agent so surface-attribution can split n8n traffic from raw
// API / MCP traffic once the backend's ApiSource resolver is widened. Buckets
// as 'api' today; the prefix is the forward-compatible hook.
const USER_AGENT = 'jackpotkeywords-n8n/0.1.0';

export class JackpotKeywords implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'JackpotKeywords',
		name: 'jackpotKeywords',
		icon: 'file:jackpotkeywords.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description:
			'AI-powered keyword research, SEO audits, and AI-visibility (AEO) scans backed by real Google Ads Keyword Planner data',
		defaults: {
			name: 'JackpotKeywords',
		},
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'jackpotKeywordsApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: JACKPOTKEYWORDS_API_BASE,
			timeout: REQUEST_TIMEOUT_MS,
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': USER_AGENT,
			},
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'AEO Scan',
						value: 'aeoScan',
						action: 'Run an AI visibility scan',
						description: 'Check whether a URL is cited/mentioned across 10 buyer-intent AI queries ($1.00)',
						routing: { request: { method: 'POST', url: '/aeo-scan' } },
					},
					{
						name: 'Get Balance',
						value: 'balance',
						action: 'Get account credit balance',
						description: 'Return the current credit balance for the authenticated account (free)',
						routing: { request: { method: 'GET', url: '/me' } },
					},
					{
						name: 'Recommend Keywords',
						value: 'recommend',
						action: 'Get ranked keyword recommendations',
						description: 'Run the keyword research pipeline and return ranked keywords ($0.10)',
						routing: { request: { method: 'POST', url: '/recommend' } },
					},
					{
						name: 'Recommend Keywords (Deep)',
						value: 'recommendDeep',
						action: 'Get recommendations plus clusters categories and competitors',
						description:
							'Recommend, plus competitor discovery and cluster/category/competitor aggregates ($0.30)',
						routing: { request: { method: 'POST', url: '/recommend-deep' } },
					},
					{
						name: 'SEO Audit',
						value: 'audit',
						action: 'Run an SEO audit',
						description: 'Page-quality checks, keyword gaps, and recommendations for a URL ($0.50)',
						routing: { request: { method: 'POST', url: '/audit' } },
					},
				],
				default: 'recommend',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'https://yourproduct.com',
				description:
					'Product URL. Required for AEO Scan and SEO Audit. For Recommend, provide a URL and/or a Description.',
				displayOptions: {
					show: { operation: ['recommend', 'recommendDeep', 'aeoScan', 'audit'] },
				},
				routing: { send: { type: 'body', property: 'url' } },
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				placeholder: 'AI keyword research tool for indie makers',
				description: 'Plain-English product description. Provide a URL and/or a Description.',
				displayOptions: {
					show: { operation: ['recommend', 'recommendDeep'] },
				},
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: { operation: ['recommend', 'recommendDeep'] },
				},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 50,
						typeOptions: { minValue: 1 },
						description: 'Max number of results to return',
						routing: { send: { type: 'body', property: 'limit' } },
					},
					{
						displayName: 'Budget (USD/Day)',
						name: 'budget',
						type: 'number',
						default: 0,
						description: 'Optional daily ad budget. Influences AI scoring and intent classification.',
						routing: { send: { type: 'body', property: 'budget' } },
					},
					{
						displayName: 'Location',
						name: 'location',
						type: 'string',
						default: '',
						placeholder: 'San Francisco, CA',
						description: 'Optional location for local-intent boosting',
						routing: { send: { type: 'body', property: 'location' } },
					},
				],
			},
		],
	};
}
