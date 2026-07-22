async function test() {
  const res = await fetch('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
    headers: { 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const subMatch = html.match(/"subscriberCountText":\{[^\}]*"label":"([^"]+)"/);
  const subMatch2 = html.match(/"subscriberCountText":\{[^\}]*"simpleText":"([^"]+)"/);
  console.log("Subs1:", subMatch ? subMatch[1] : null);
  console.log("Subs2:", subMatch2 ? subMatch2[1] : null);
}
test();
