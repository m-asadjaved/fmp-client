async function test() {
  const res = await fetch('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const html = await res.text();
  console.log("Avatar:", html.match(/"avatar":{"thumbnails":\[{"url":"([^"]+)"/)?.[1]);
  console.log("Author1:", html.match(/"author":"([^"]+)"/)?.[1]);
  console.log("OwnerChannelName:", html.match(/"ownerChannelName":"([^"]+)"/)?.[1]);
  console.log("ChannelName:", html.match(/"channelName":"([^"]+)"/)?.[1]);
}
test();
