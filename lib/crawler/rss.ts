import { XMLParser } from 'fast-xml-parser';

export interface NewsArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  content?: string;
}

function getText(node: unknown): string {
  if (typeof node === 'string') return node.trim();
  if (node && typeof node === 'object' && '#text' in node) return String((node as { '#text'?: string })['#text'] ?? '').trim();
  return '';
}

export class RSSCrawler {
  private parseRSSItems(xml: string): NewsArticle[] {
    const parser = new XMLParser({ ignoreDeclaration: true });
    const doc = parser.parse(xml) as { rss?: { channel?: { item?: unknown } } };
    const channel = doc?.rss?.channel;
    if (!channel) return [];

    let items: unknown[] = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
    if (!items.length) return [];

    return items.map((item: unknown) => {
      const o = item as Record<string, unknown>;
      return {
        title: getText(o.title ?? ''),
        link: getText(o.link ?? ''),
        description: getText(o.description ?? ''),
        pubDate: getText(o.pubDate ?? ''),
        source: getText(o.source ?? '') || 'Google News',
      };
    });
  }

  async fetchGoogleNews(keyword: string): Promise<NewsArticle[]> {
    const encodedKeyword = encodeURIComponent(keyword);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=ko&gl=KR&ceid=KR:ko`;

    try {
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`RSS fetch failed: ${response.status}`);
      }

      const xml = await response.text();
      return this.parseRSSItems(xml);
    } catch (error) {
      console.error('Google News RSS error:', error);
      return [];
    }
  }

  async fetchNaverNews(keyword: string): Promise<NewsArticle[]> {
    return this.fetchGoogleNews(`site:news.naver.com ${keyword}`);
  }

  async fetchMultipleKeywords(keywords: string[]): Promise<NewsArticle[]> {
    const batches = await Promise.all(
      keywords.map((keyword) => this.fetchGoogleNews(keyword))
    );
    const allArticles = batches.flat();

    return this.deduplicateAndSort(allArticles);
  }

  private deduplicateAndSort(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    const unique = articles.filter(article => {
      const key = article.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });
  }
}

export const rssCrawler = new RSSCrawler();
