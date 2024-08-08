const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const DEFAULT_FID = '354795';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';
const ERROR_IMAGE_URL = 'https://via.placeholder.com/500x300/1e3a8a/ffffff?text=No%20Auction%20Data%20Available';

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

async function getAuctionData(fid) {
  const maxAttempts = 3;
  const delayBetweenAttempts = 3000; // 3 seconds

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const url = `https://moxiescout.vercel.app/auction/${fid}`;
      console.log(`Attempt ${attempt}: Fetching auction data from URL: ${url}`);

      const response = await fetch(url);
      const data = await response.text();

      console.log(`Received HTML content. Length: ${data.length}`);

      if (data.includes("Failed to load auction details. Please try again later.") || data.includes("404: This page could not be found.")) {
        console.log('No auction data available');
        return { error: "No Auction Data Available" };
      }

      const auctionData = {
        clearingPrice: data.match(/Clearing Price<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
        auctionSupply: data.match(/Auction Supply<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
        auctionStart: data.match(/Auction Start<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
        auctionEnd: data.match(/Auction End<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
        totalOrders: data.match(/Total Orders<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
        uniqueBidders: data.match(/Unique Bidders<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
        status: data.match(/Status<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
        totalBidValue: data.match(/Total Bid Value<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
      };

      // Check if all values are 'N/A', which might indicate a parsing issue
      if (Object.values(auctionData).every(value => value === 'N/A')) {
        console.log('Failed to parse auction data. All values are N/A.');
        if (attempt < maxAttempts) {
          console.log(`Waiting ${delayBetweenAttempts}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
          continue;
        } else {
          return { error: "Failed to parse auction data" };
        }
      }

      console.log('Parsed auction data:', auctionData);
      return auctionData;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt < maxAttempts) {
        console.log(`Waiting ${delayBetweenAttempts}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
      } else {
        console.error('All attempts failed');
        return { error: "Failed to fetch auction data" };
      }
    }
  }
}

async function fetchFid(farcasterName) {
  try {
    console.log(`Fetching FID for Farcaster name: ${farcasterName}`);
    const data = await httpsGet(`https://api.warpcast.com/v2/user-by-username?username=${farcasterName}`);
    const fidJson = JSON.parse(data);
    console.log('FID JSON Response:', fidJson);

    if (fidJson.result && fidJson.result.user && fidJson.result.user.fid) {
      return fidJson.result.user.fid;
    } else {
      throw new Error('FID not found in the response');
    }
  } catch (error) {
    console.error('Error fetching FID:', error.message);
    throw error;
  }
}

async function fetchAuctionDetails(farcasterName) {
  let fid = DEFAULT_FID;
  let displayName = 'Default Account';

  if (farcasterName.trim() !== '') {
    try {
      fid = await fetchFid(farcasterName);
      displayName = farcasterName;
      console.log(`Fetched FID: ${fid} for Farcaster name: ${farcasterName}`);
    } catch (error) {
      console.error('Error fetching FID:', error.message);
      displayName = 'Invalid Farcaster name';
    }
  }

  const auctionData = await getAuctionData(fid);
  return { auctionData, displayName };
}

function generateImageUrl(auctionData, displayName) {
  let text;
  if (auctionData.error) {
    text = `Error: ${auctionData.error}`;
  } else {
    text = `
Auction for ${displayName}

Clearing Price:  ${(auctionData.clearingPrice || 'N/A').padEnd(20)}  Total Orders:    ${auctionData.totalOrders || 'N/A'}
Auction Supply:  ${(auctionData.auctionSupply || 'N/A').padEnd(20)}  Unique Bidders:  ${auctionData.uniqueBidders || 'N/A'}
Auction Start:   ${(auctionData.auctionStart || 'N/A').padEnd(20)}  Status:          ${auctionData.status || 'N/A'}
Auction End:     ${(auctionData.auctionEnd || 'N/A').padEnd(20)}  Total Bid Value: ${auctionData.totalBidValue || 'N/A'}
    `.trim();
  }

  const encodedText = encodeURIComponent(text);
  console.log('Encoded text for image URL:', encodedText);
  return `https://via.placeholder.com/1000x600/1e3a8a/ffffff?text=${encodedText}&font=monospace&size=35`;
}

module.exports = async (req, res) => {
  if (req.url === '/favicon.ico') {
    res.setHeader('Content-Type', 'image/x-icon');
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Moxie Auction Frame</title>
          <meta property="fc:frame" content="vNext">
          <meta property="fc:frame:image" content="${DEFAULT_IMAGE_URL}">
          <meta property="fc:frame:input:text" content="Enter Farcaster name (optional)">
          <meta property="fc:frame:button:1" content="View Auction Details">
          <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
      </head>
      <body>
          <h1>Welcome to Moxie Auction Frame</h1>
          <p>Enter a Farcaster name or click the button to view auction details.</p>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  if (req.method === 'POST') {
    console.log('Received POST request:', JSON.stringify(req.body));

    try {
      const { untrustedData } = req.body || {};
      const farcasterName = untrustedData?.inputText || '';

      const { auctionData, displayName } = await fetchAuctionDetails(farcasterName);

      console.log('Auction data:', auctionData);

      const imageUrl = generateImageUrl(auctionData, displayName);
      console.log('Generated image URL:', imageUrl);

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
