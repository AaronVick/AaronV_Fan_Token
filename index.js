const playwright = require('playwright-core');
const fetch = require('node-fetch');
const express = require('express');
const app = express();
app.use(express.json());

const DEFAULT_FID = '354795';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';
const ERROR_IMAGE_URL = 'https://via.placeholder.com/500x300/1e3a8a/ffffff?text=No%20Auction%20Data%20Available';

async function getBrowserInstance() {
  const browser = await playwright.chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: true,
  });
  return browser;
}

async function getAuctionData(fid) {
  try {
    const browser = await getBrowserInstance();
    const page = await browser.newPage();
    const url = `https://moxiescout.vercel.app/auction/${fid}`;
    console.log(`Fetching auction data from URL: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000); // Wait for 3 seconds

    const data = await page.content();
    await browser.close();
    console.log('MoxieScout response received:', data);

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

    console.log('Parsed auction data:', auctionData);
    return auctionData;
  } catch (error) {
    console.error('Error fetching auction data:', error.message);
    return { error: "Failed to fetch auction data" };
  }
}

async function fetchFid(farcasterName) {
  try {
    console.log(`Fetching FID for Farcaster name: ${farcasterName}`);
    const response = await fetch(`https://api.warpcast.com/v2/user-by-username?username=${farcasterName}`);
    const fidJson = await response.json();
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
    return ERROR_IMAGE_URL;
  } else {
    text = `
Auction for ${displayName}

Clearing Price:  ${auctionData.clearingPrice.padEnd(20)}  Total Orders:    ${auctionData.totalOrders}
Auction Supply:  ${auctionData.auctionSupply.padEnd(20)}  Unique Bidders:  ${auctionData.uniqueBidders}
Auction Start:   ${auctionData.auctionStart.padEnd(20)}  Status:          ${auctionData.status}
Auction End:     ${auctionData.auctionEnd.padEnd(20)}  Total Bid Value: ${auctionData.totalBidValue}
        `.trim();
  }

  const encodedText = encodeURIComponent(text);
  console.log('Encoded text for image URL:', encodedText);
  return `https://via.placeholder.com/1000x600/1e3a8a/ffffff?text=${encodedText}&font=monospace&size=35`;
}

app.post('/api/getAuctionDetails', async (req, res) => {
  console.log('Received request:', JSON.stringify(req.body));

  try {
    const { untrustedData } = req.body || {};
    const farcasterName = untrustedData?.inputText || '';

    const { auctionData, displayName } = await fetchAuctionDetails(farcasterName);

    console.log('Auction data:', auctionData);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Details</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${DEFAULT_IMAGE_URL}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name">
    <meta property="fc:frame:button:1" content="View">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
</head>
<body>
    <h1>Auction Details for ${displayName}</h1>
    <img src="${generateImageUrl(auctionData, displayName)}" alt="Auction Details" style="max-width: 100%; height: auto;">
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
    <meta property="fc:frame"Based on our previous findings, it seems we are still facing issues with deploying `chrome-aws-lambda` on Vercel. Let's switch to using Playwright with a more streamlined configuration. We will ensure that the script executes correctly and add the necessary debugging and error logging to diagnose issues.

### Updated `index.js` for Playwright and Vercel

Here’s an updated `index.js` that uses Playwright for browser automation and includes logging for better debugging:

```javascript
const playwright = require('playwright-core');
const fetch = require('node-fetch');
const express = require('express');
const app = express();
app.use(express.json());

const DEFAULT_FID = '354795';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';
const ERROR_IMAGE_URL = 'https://via.placeholder.com/500x300/1e3a8a/ffffff?text=No%20Auction%20Data%20Available';

// Function to get browser instance
async function getBrowserInstance() {
  const browser = await playwright.chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: true,
  });
  return browser;
}

// Function to fetch auction data
async function getAuctionData(fid) {
  try {
    const browser = await getBrowserInstance();
    const page = await browser.newPage();
    const url = `https://moxiescout.vercel.app/auction/${fid}`;
    console.log(`Fetching auction data from URL: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000); // Wait for 3 seconds

    const data = await page.content();
    await browser.close();
    console.log('MoxieScout response received:', data);

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

    console.log('Parsed auction data:', auctionData);
    return auctionData;
  } catch (error) {
    console.error('Error fetching auction data:', error.message);
    return { error: "Failed to fetch auction data" };
  }
}

// Function to fetch FID
async function fetchFid(farcasterName) {
  try {
    console.log(`Fetching FID for Farcaster name: ${farcasterName}`);
    const response = await fetch(`https://api.warpcast.com/v2/user-by-username?username=${farcasterName}`);
    const fidJson = await response.json();
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

// Function to fetch auction details
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

// Function to generate image URL
function generateImageUrl(auctionData, displayName) {
  let text;
  if (auctionData.error) {
    text = `Error: ${auctionData.error}`;
    return ERROR_IMAGE_URL;
  } else {
    text = `
Auction for ${displayName}

Clearing Price:  ${auctionData.clearingPrice.padEnd(20)}  Total Orders:    ${auctionData.totalOrders}
Auction Supply:  ${auctionData.auctionSupply.padEnd(20)}  Unique Bidders:  ${auctionData.uniqueBidders}
Auction Start:   ${auctionData.auctionStart.padEnd(20)}  Status:          ${auctionData.status}
Auction End:     ${auctionData.auctionEnd.padEnd(20)}  Total Bid Value: ${auctionData.totalBidValue}
        `.trim();
  }

  const encodedText = encodeURIComponent(text);
  console.log('Encoded text for image URL:', encodedText);
  return `https://via.placeholder.com/1000x600/1e3a8a/ffffff?text=${encodedText}&font=monospace&size=35`;
}

app.post('/api/getAuctionDetails', async (req, res) => {
  console.log('Received request:', JSON.stringify(req.body));

  try {
    const { untrustedData } = req.body || {};
    const farcasterName = untrustedData?.inputText || '';

    const { auctionData, displayName } = await fetchAuctionDetails(farcasterName);

    console.log('Auction data:', auctionData);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Details</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${DEFAULT_IMAGE_URL}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name">
    <meta property="fc:frame:button:1" content="View">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
</head>
<body>
    <h1>Auction Details for ${displayName}</h1>
    <img src="${generateImageUrl(auctionData, displayName)}" alt="Auction Details" style="max-width: 100%; height: auto;">
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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
