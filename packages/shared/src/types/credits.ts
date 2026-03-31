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
    priceInCents: 199,
    priceDisplay: '$1.99',
    perSearchCost: '$1.99',
  },
  {
    id: 'three_pack',
    name: '3-Pack',
    credits: 3,
    priceInCents: 499,
    priceDisplay: '$4.99',
    perSearchCost: '$1.66',
    popular: true,
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'pro',
    name: 'Pro',
    priceInCents: 999,
    priceDisplay: '$9.99/mo',
    interval: 'month',
    stripePriceId: 'price_1TGDy1PHvSenlVgmhLiG0Wfv',
    features: [
      'Unlimited searches',
      'Full keyword data + trends',
      'Ad Score + SEO Score',
      'Category refinement (add keywords per category)',
      'CSV + Google Ads Editor export',
      'Saved searches (permanent)',
      'Keyword detail panels + charts',
    ],
  },
];

export const OPERATION_COSTS: OperationCost[] = [
  { operation: 'keyword_search', name: 'Keyword Search', credits: 1 },
  { operation: 'pdf_report', name: 'PDF Goldmine Report', credits: 1 },
];
