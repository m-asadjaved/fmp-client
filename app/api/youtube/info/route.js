import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  
  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
  }
  
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    
    // Extract view count using regex
    const viewMatch = html.match(/"viewCount":"(\d+)"/);
    const views = viewMatch ? parseInt(viewMatch[1], 10) : null;
    
    // Extract channel thumbnail
    const avatarMatch = html.match(/\{"url":"(https:\/\/yt3\.ggpht\.com\/[^\"]+)"/);
    const avatarUrl = avatarMatch ? avatarMatch[1].replace(/\\u0026/g, '&') : null;
    
    // Extract channel name
    const authorMatch = html.match(/"ownerChannelName":"([^"]+)"/);
    const channelName = authorMatch ? authorMatch[1] : null;
    
    // Extract subscriber count
    const subMatch = html.match(/"subscriberCountText":\{[^\}]*"label":"([^"]+)"/);
    const subscribers = subMatch ? subMatch[1] : null;
    
    // Extract publish date if possible
    const dateMatch = html.match(/"publishDate":"([^"]+)"/);
    const publishDate = dateMatch ? dateMatch[1] : null;
    
    return NextResponse.json({ views, avatarUrl, publishDate, channelName, subscribers });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
