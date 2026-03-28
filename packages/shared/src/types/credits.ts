export interface CreditPack {
  id: 'single' | 'three_pack' | 'ten_pack';
  name: string;
  credits: number;
  priceInCents: number;
  priceDisplay: string;
  perSearchCost: string;
  stripePriceId?: string;
  popular?: boolean;
}

export interface SubscriptionPlan {
  id: 'pro' | 'agency';
  name: string;
  priceInCents: number;
  priceDisplay: string;
  interval: 'month';
  features: string[];
  stripePriceId?: string;
}

export type OperationType = 'keyword_search' | 'concept_search' | 'pdf_report';

export interface OperationCost {
  operation: OperationType;
  name: string;
  credits: number;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'single',
    name: 'Single Search',
    credits: 1,
    priceInCents: 99,
    priceDisplay: '$0.99',
    perSearchCost: '$0.99',
  },
  {
    id: 'three_pack',
    name: '3-Pack',
    credits: 3,
    priceInCents: 199,
    priceDisplay: '$1.99',
    perSearchCost: '$0.66',
    popular: true,
  },
  {
    id: 'ten_pack',
    name: '10-Pack',
    credits: 10,
    priceInCents: 499,
    priceDisplay: '$4.99',
    perSearchCost: '$0.50',
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'pro',
    name: 'Pro',
    priceInCents: 599,
    priceDisplay: '$5.99/mo',
    interval: 'month',
    features: [
      'Unlimited searches',
      'Full keyword data + trends',
      'Ad Score + SEO Score',
      'CSV export',
      'Saved searches (permanent)',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    priceInCents: 1999,
    priceDisplay: '$19.99/mo',
    interval: 'month',
    features: [
      'Everything in Pro',
      'Branded PDF Goldmine Reports',
      'Google Ads Editor export',
      'Multi-project workspaces',
      'Keyword monitoring dashboard',
    ],
  },
];

export const OPERATION_COSTS: OperationCost[] = [
  { operation: 'keyword_search', name: 'Keyword Search', credits: 1 },
  { operation: 'concept_search', name: 'Concept Validation', credits: 1 },
  { operation: 'pdf_report', name: 'PDF Goldmine Report', credits: 1 },
];
