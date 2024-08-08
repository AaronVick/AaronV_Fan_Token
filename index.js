const https = require('https');
const url = require('url');

const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

async function fetchAuctionDataFromService(fid) {
  const serviceUrl = 'https://puppeteer-7b95.onrender.com/auction-data';
  const response = await fetch(serviceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fid })
  });
  const data = await response.json();
  return data;
}

module.exports = async (req, res) => {
  console.log('Received request:', JSON.stringify(req.body));

  try {
    const { untrustedData } = req.body || {};
    const farcasterName = untrustedData?.inputText || '';

    let fid = '354795';
    if (farcasterName.trim() !== '') {
      // Fetch the FID for the given Farcaster name
      fid = await fetchFid(farcasterName);
    }

    const auctionData = await fetchAuctionDataFromService(fid);

    console.log('Auction data:', auctionData);
}

function generateImageUrl(auctionData, farcasterName) {
  let text;
  if (auctionData.error) {
    text = `Error: ${auctionData.error}`;
    return `https://via.placeholder.com/1000x600/1e3a8a/ffffff?text=${encodeURIComponent(text)}&font=monospace&size=35`;
  } else {
    text = `
Auction for ${farcasterName}

Clearing Price:  ${auctionData.clearingPrice.padEnd(20)}  Total Orders:    ${auctionData.totalOrders}
Auction Supply:  ${auctionData.auctionSupply.padEnd(20)}  Unique Bidders:  ${auctionData.uniqueBidders}
Auction Start:   ${auctionData.auctionStart.padEnd(20)}  Status:          ${auctionData.status}
Auction End:     ${auctionData.auctionEnd.padEnd(20)}  Total Bid Value: ${auctionData.totalBidValue}
        `.trim();
    return `https://via.placeholder.com/1000x600/1e3a8a/ffffff?text=${encodeURIComponent(text)}&font=monospace&size=35`;
  }
}

module.exports = async (req, res) => {
  console.log('Received request:', JSON.stringify(req.body));

  try {
    const { untrustedData } = req.body || {};
    const farcasterName = untrustedData?.inputText || '';

    const auctionData = await fetchAuctionDataFromService();

    console.log('Auction data:', auctionData);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Details</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${auctionData.error ? DEFAULT_IMAGE_URL : generateImageUrl(auctionData, farcasterName)}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name">
    <meta property="fc:frame:button:1" content="View">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
</head>
<body>
    <h1>Auction Details for ${farcasterName || 'Default Account'}</h1>
    <img src="${auctionData.error ? DEFAULT_IMAGE_URL : generateImageUrl(auctionData, farcasterName)}" alt="Auction Details" style="max-width: 100%; height: auto;">
    ${auctionData.error ? '<p>Error: ' + auctionData.error + '</p>' : ''}
    <script>
        async function fetchAuctionData() {
            const farcasterName = document.querySelector('input[name="farcasterName"]').value.trim();
            const response = await fetch('https://aaron-v-fan-token.vercel.app/api/getAuctionDetails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ untrustedData: { inputText: farcasterName } })
            });
            const result = await response.text();
            document.body.innerHTML = result;
        }
    </script>
</body>
</html>
        `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error in index.js:', error.message);
    res.status(500).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${DEFAULT_IMAGE_URL}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name">
    <meta property="fc:frame:button:1" content="Try Again">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
</head>
<body>
    <h1>Error</h1>
    <p>Failed to fetch auction data. Please try again.</p>
</body>
</html>
        `);
  }
};
