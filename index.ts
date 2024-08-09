const { init } = require('./manual_modules/airstack-node-sdk-main/src/init');
const { fetchQuery } = require('./manual_modules/airstack-node-sdk-main/src/apis/fetchQuery');
const fetch = require('node-fetch');

const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';
const ERROR_IMAGE_URL = 'https://via.placeholder.com/500x300/1e3a8a/ffffff?text=No%20Auction%20Data%20Available';

// Initialize Airstack SDK
init(process.env.AIRSTACK_API_KEY || '');

async function fetchFid(farcasterName: string): Promise<string> {
    // ... (your existing fetchFid function)
}

async function getFanTokenDataByFid(fid: string) {
    // ... (your existing getFanTokenDataByFid function)
}

function generateImageUrl(auctionData: any, farcasterName: string): string {
    // ... (your existing generateImageUrl function)
}

async function handleRequest(req: any, res: any) {
    console.log('Received request:', JSON.stringify(req.body));

    let imageUrl = DEFAULT_IMAGE_URL;

    try {
        const { untrustedData } = req.body || {};
        const farcasterName = untrustedData?.inputText || '';

        let fid = '354795'; // Default FID
        if (farcasterName.trim() !== '') {
            fid = await fetchFid(farcasterName);
        }

        const auctionData = await getFanTokenDataByFid(fid);
        console.log('Auction data:', auctionData);

        imageUrl = auctionData.error ? ERROR_IMAGE_URL : generateImageUrl(auctionData, farcasterName);

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
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
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
        console.error('Error in index.ts:', error);
        res.status(500).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${imageUrl}">
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
}

// Export the handleRequest function for Vercel
module.exports = handleRequest;
