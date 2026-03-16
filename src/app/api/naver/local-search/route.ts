import { NextRequest, NextResponse } from 'next/server'

const NAVER_LOCAL_SEARCH_URL = 'https://openapi.naver.com/v1/search/local.json'

export async function GET(request: NextRequest) {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Naver local search credentials are not configured.' },
      { status: 503 }
    )
  }

  const query = request.nextUrl.searchParams.get('query')?.trim()

  if (!query) {
    return NextResponse.json({ error: 'Query is required.' }, { status: 400 })
  }

  const upstreamUrl = new URL(NAVER_LOCAL_SEARCH_URL)
  upstreamUrl.searchParams.set('query', query)
  upstreamUrl.searchParams.set('display', '5')
  upstreamUrl.searchParams.set('start', '1')
  upstreamUrl.searchParams.set('sort', 'random')

  const response = await fetch(upstreamUrl.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text()
    return NextResponse.json(
      { error: 'Failed to fetch location results.', detail: errorText },
      { status: response.status }
    )
  }

  const data = await response.json() as {
    items?: Array<{
      title: string
      category: string
      address: string
      roadAddress: string
      telephone: string
      link: string
    }>
  }

  return NextResponse.json({
    items: (data.items ?? []).map(item => ({
      title: item.title.replace(/<[^>]+>/g, ''),
      category: item.category,
      address: item.address,
      roadAddress: item.roadAddress,
      telephone: item.telephone,
      link: item.link,
    })),
  })
}
