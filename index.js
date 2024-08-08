const https = require('https');
const url = require('url');

// ... (other constants and functions remain the same)

function httpsGet(urlString, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const options = url.parse(urlString);
    options.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);

    req.setTimeout(timeout, () => {
      req.abort();
      reject(new Error(`Request timed out after ${timeout}ms`));
    });
  });
}

async function getAuctionData(fid, retries = 1) {
  try {
    const url = `https://moxiescout.vercel.app/auction/${fid}`;
    console.log(`Fetching auction data from URL: ${url}`);

    const data = await httpsGet(url, 5000); // 5-second timeout

    if (data.includes("animate-pulse") && retries > 0) {
      console.log('Page is still loading, retrying...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return getAuctionData(fid, retries - 1);
    }

    if (data.includes("Failed to load auction details. Please try again later.") || data.includes("404: This page could not be found.")) {
      console.log('No auction data available');
      return { error: "No Auction Data Available" };
    }

    const auctionData = {};
    const dataPoints = [
      'Clearing Price', 'Auction Supply', 'Auction Start', 'Auction End',
      'Total Orders', 'Unique Bidders', 'Status', 'Total Bid Value'
    ];

    dataPoints.forEach(point => {
      const regex = new RegExp(`${point}<\\/div><div[^>]*>([^<]+)`);
      const match = data.match(regex);
      auctionData[point.replace(/\s+/g, '').charAt(0).toLowerCase() + point.replace(/\s+/g, '').slice(1)] = match ? match[1].trim() : 'N/A';
    });

    console.log('Parsed auction data:', auctionData);
    return auctionData;
  } catch (error) {
    console.error('Error fetching auction data:', error.message);
    return { error: "Failed to fetch auction data: " + error.message };
  }
}

// ... (rest of the code remains the same)

module.exports = async (req, res) => {
  // ... (GET handler remains the same)

  if (req.method === 'POST') {
    console.log('Received request:', JSON.stringify(req.body));

    try {
      const { untrustedData } = req.body || {};
      const farcasterName = untrustedData?.inputText || '';

      const { auctionData, displayName } = await fetchAuctionDetails(farcasterName);

      console.log('Auction data:', auctionData);

      const imageUrl = generateImageUrl(auctionData, displayName);

      const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Moxie Auction Details</title>
      <meta property="fc:frame" content="vNext">
      <meta property="fc:frame:image" content="${imageUrl}">
      <meta property="fc:frame:input:text" content="Enter Farcaster name">
      <meta property="fc:frame:button:1" content="View">
      <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
  </head>
  <body>
      <h1>Auction Details for ${displayName}</h1>
      <img src="${imageUrl}" alt="Auction Details" style="max-width: 100%; height: auto;">
  </body>
  </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (error) {
      console.error('Error in index.js:', error.message);
      const errorImageUrl = generateImageUrl({ error: error.message }, 'Error');
      const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error</title>
      <meta property="fc:frame" content="vNext">
      <meta property="fc:frame:image" content="${errorImageUrl}">
      <meta property="fc:frame:input:text" content="Enter Farcaster name">
      <meta property="fc:frame:button:1" content="Try Again">
      <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
  </head>
  <body>
      <h1>Error</h1>
      <p>Failed to fetch auction data. Please try again.</p>
  </body>
  </html>
      `;
      return res.status(200).send(html);
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
};
