import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// Direct Cloud Function URL, NOT the jackpotkeywords.web.app Hosting rewrite.
// Firebase Hosting kills proxied requests at 60s, but /recommend and /aeo-scan
// routinely take 60-180s. The direct URL has no edge timeout.
export const JACKPOTKEYWORDS_API_BASE =
	'https://us-central1-even-plate-378520.cloudfunctions.net/api/api/v1';

export class JackpotKeywordsApi implements ICredentialType {
	name = 'jackpotKeywordsApi';

	displayName = 'JackpotKeywords API';

	documentationUrl = 'https://jackpotkeywords.web.app/developers';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your jk_live_ API key. Generate one at jackpotkeywords.web.app/developers (ships with $2 starter credit).',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// Validates the key by hitting GET /me, which returns balance + account info.
	test: ICredentialTestRequest = {
		request: {
			baseURL: JACKPOTKEYWORDS_API_BASE,
			url: '/me',
			method: 'GET',
		},
	};
}
