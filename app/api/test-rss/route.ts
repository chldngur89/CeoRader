import { NextRequest, NextResponse } from 'next/server';
import { rssCrawler } from '@/lib/crawler/rss';

/**
 * RSS 수집 검증용 (GET /api/test-rss?keyword=AI)
 * 검증 후 제거하거나 개발 시에만 사용.
 */
export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('keyword') || 'AI';
  try {
    const articles = await rssCrawler.fetchMultipleKeywords([keyword]);
    const sample = articles.slice(0, 5).map((a) => ({
      title: a.title?.slice(0, 80),
      source: a.source,
      pubDate: a.pubDate,
      hasLink: !!a.link,
    }));
    return NextResponse.json({
      ok: true,
      keyword,
      count: articles.length,
      sample,
      message: articles.length > 0 ? 'RSS 수집 성공' : '수집된 기사 없음 (키워드/네트워크 확인)',
    });
  } catch (error) {
    console.error('RSS test error:', error);
    return NextResponse.json(
      {
        ok: false,
        keyword,
        count: 0,
        error: (error as Error).message,
        message: 'RSS 수집 실패',
      },
      { status: 500 }
    );
  }
}
