import { init, fetchQuery } from "@airstack/node";
import fetch from 'node-fetch';

const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';
const ERROR_IMAGE_URL = 'https://via.placeholder.com/500x300/8E55FF/FFFFFF?text=No%20Auction%20Data%20Available';

// Initialize Airstack SDK
init(process.env.AIRSTACK_API_KEY || '');

// URL validation function
function isValidUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

async function fetchFid(farcasterName: string): Promise<string> {
  console.log(`Fetching FID for Farcaster name: ${farcasterName}`);
  // ... (keep existing implementation)
  // Add logging for the result
  console.log(`FID result: ${result}`);
  return result;
}

async function getFanTokenDataByFid(fid: string) {
  console.log(`Fetching fan token data for FID: ${fid}`);
  // ... (keep existing implementation)
  // Add logging for the result
  console.log(`Fan token data result:`, result);
  return result;
}

function generateImageUrl(auctionData: any, farcasterName: string): string {
  console.log(`Generating image URL for ${farcasterName}`);
  // ... (keep existing implementation)
  // Add URL validation
  const generatedUrl = '...'; // Your existing URL generation logic
  console.log(`Generated URL: ${generatedUrl}`);
  return isValidUrl(generatedUrl) ? generatedUrl : ERROR_IMAGE_URL;
}

export default async function handler(req: any, res: any) {
  console.log(`Received ${req.method} request`);

  if (req.method === 'GET') {
    console.log('Handling GET request - returning default frame');
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
          <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/frame">
      </head>
      <body>
          <h1>Moxie Auction Details</h1>
          <img src="${DEFAULT_IMAGE_URL}" alt="Default Image" style="max-width: 100%; height: auto;">
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
    return;
  }

  console.log('Received POST request body:', JSON.stringify(req.body, null, 2));

  let imageUrl = DEFAULT_IMAGE_URL;
  let farcasterName = '';

  try {
    const { untrustedData } = req.body || {};
    farcasterName = untrustedData?.inputText || '';
    console.log(`Farcaster name input: ${farcasterName}`);

    let fid = '354795'; // Default FID
    if (farcasterName.trim() !== '') {
      fid = await fetchFid(farcasterName);
    }
    console.log(`Using FID: ${fid}`);

    const auctionData = await getFanTokenDataByFid(fid);
    console.log('Auction data:', JSON.stringify(auctionData, null, 2));

    imageUrl = auctionData.error ? ERROR_IMAGE_URL : generateImageUrl(auctionData, farcasterName);
    
    // Validate the final image URL
    if (!isValidUrl(imageUrl)) {
      console.warn(`Invalid image URL generated: ${imageUrl}`);
      imageUrl = ERROR_IMAGE_URL;
    }
    console.log(`Final image URL: ${imageUrl}`);

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
          <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/frame">
      </head>
      <body>
          <h1>Auction Details for ${farcasterName || 'Default Account'}</h1>
          <img src="${imageUrl}" alt="Auction Details" style="max-width: 100%; height: auto;">
          ${auctionData.error ? '<p>Error: ' + auctionData.error + '</p>' : ''}
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error in handler:', error);
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
          <meta property="fc:frame" content="vNext">
          <meta property="fc:frame:image" content="${ERROR_IMAGE_URL}">
          <meta property="fc:frame:input:text" content="Enter Farcaster name">
          <meta property="fc:frame:button:1" content="Try Again">
          <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/frame">
      </head>
      <body>
          <h1>Error</h1>
          <p>Failed to fetch auction data. Please try again.</p>
          <p>Error details: ${error.message}</p>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(errorHtml);
  }
}
