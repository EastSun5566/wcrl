export interface Link {
  href: string;
  text: string;
  title?: string;
}

export interface MediaItem {
  src: string;
  alt?: string;
  type: 'image' | 'video';
}

export interface CrawlResult {
  url: string;
  title: string;
  html: string;
  cleanedHtml: string;
  markdown: string;
  content: string;
  links: {
    internal: Link[];
    external: Link[];
  };
  media: {
    images: MediaItem[];
    videos: MediaItem[];
  };
  metadata: Record<string, string>;
  timestamp: string;
}

export interface CrawlOptions {
  url: string;
  selector?: string;
  output?: string;
  max?: number;
  match?: string;
  format?: 'json' | 'markdown';
}