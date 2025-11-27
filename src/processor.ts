import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

import { getBaseDomain, isExternal, normalizeUrl } from './utils.js';
import type { Link, MediaItem } from './types.js';

class ContentProcessor {
  turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '_',
      strongDelimiter: '**',
    });

    this.turndown.addRule('removeComments', {
      filter: (node) => node.nodeType === 8,
      replacement: () => '',
    });
  }

  process(html: string, url: string, selector: string): {
    cleanedHtml: string;
    markdown: string;
    content: string;
    links: { internal: Link[]; external: Link[] };
    media: { images: MediaItem[]; videos: MediaItem[] };
    metadata: Record<string, string>;
  } {
    const $ = cheerio.load(html);
    const baseDomain = getBaseDomain(url);
    const metadata = this.extractMetadata($);

    // Remove unwanted elements
    $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();

    // Extract links, media
    const links = this.extractLinks($, url, baseDomain);
    const media = this.extractMedia($, url);

    // Clean attributes
    const $content = selector ? $(selector) : $('body');
    $content.find('*').each((_, el) => {
      const $el = $(el);
      const keepAttrs = ['href', 'src', 'alt', 'title'];
      const attrs = $el.attr();
      if (attrs) {
        Object.keys(attrs).forEach((attr) => {
          if (!keepAttrs.includes(attr)) {
            $el.removeAttr(attr);
          }
        });
      }
    });

    const cleanedHtml = $content.html() ?? '';
    const content = $content.text().trim();
    const markdown = this.turndown.turndown(cleanedHtml);

    return {
      cleanedHtml,
      markdown,
      content,
      links,
      media,
      metadata,
    };
  }

  extractMetadata($: cheerio.CheerioAPI): Record<string, string> {
    const metadata: Record<string, string> = {};

    metadata['title'] = $('title').text().trim();

    $('meta').each((_, el) => {
      const $el = $(el);
      const name = $el.attr('name') ?? $el.attr('property');
      const content = $el.attr('content');
      if (name && content) {
        metadata[name] = content;
      }
    });

    return metadata;
  }

  extractLinks(
    $: cheerio.CheerioAPI,
    baseUrl: string,
    baseDomain: string,
  ): { internal: Link[]; external: Link[] } {
    const internal: Link[] = [];
    const external: Link[] = [];

    $('a[href]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      if (!href) return;

      const normalizedUrl = normalizeUrl(href, baseUrl);
      const link: Link = {
        href: normalizedUrl,
        text: $el.text().trim(),
        title: $el.attr('title') ?? '',
      };

      if (isExternal(normalizedUrl, baseDomain)) {
        external.push(link);
      } else {
        internal.push(link);
      }
    });

    return { internal, external };
  }

  extractMedia(
    $: cheerio.CheerioAPI,
    baseUrl: string,
  ): { images: MediaItem[]; videos: MediaItem[] } {
    const images: MediaItem[] = [];
    const videos: MediaItem[] = [];

    $('img[src]').each((_, el) => {
      const $el = $(el);
      const src = $el.attr('src');
      if (!src || src.startsWith('data:')) return;

      images.push({
        src: normalizeUrl(src, baseUrl),
        alt: $el.attr('alt') ?? '',
        type: 'image',
      });
    });

    $('video[src], video source[src]').each((_, el) => {
      const $el = $(el);
      const src = $el.attr('src');
      if (src) {
        videos.push({
          src: normalizeUrl(src, baseUrl),
          type: 'video',
        });
      }
    });

    return { images, videos };
  }
}

export function createContentProcessor(): ContentProcessor {
  return new ContentProcessor();
}