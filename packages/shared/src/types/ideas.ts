export interface IdeaBoardItem {
  id: string;
  type: 'content' | 'video' | 'reddit' | 'twitter' | 'linkedin' | 'seo';
  title: string;
  completed: boolean;
  /** Content items */
  contentType?: string;
  difficulty?: string;
  trafficEstimate?: string;
  targetKeywords?: string;
  /** Video items */
  videoFormat?: string;
  youtubeVolume?: string;
  /** Social items */
  platform?: string;
  draftBody?: string;
  draftMeta?: string[];
  /** SEO items */
  source?: string;
  impact?: string;
}

export interface IdeaBoard {
  id: string;
  searchId: string;
  userId: string;
  productName: string;
  domain: string;
  createdAt: string;
  items: IdeaBoardItem[];
}
