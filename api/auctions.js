const https = require('https');
const url = require('url');

const DEFAULT_FID = '354795';
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';

// Keep all your existing helper functions (httpsGet, getAuctionData, generateImageUrl, getPostUrl)

function generateHtml(displayName, content, imageUrl, postUrl) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Moxie Auction Details</title>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${imageUrl}">
            <meta property="fc:frame:input:text" content="Enter Farcaster name">
            <meta property="fc:frame:button:1" content="View Auction Details">
            <meta property="fc:frame:post_url" content="${postUrl}/api/auctions">
        </head>
        <body>
            <h1>Auction Details for ${displayName}</h1>
            ${content}
        </body>
        </html>
    `;
}

module.exports = async (req, res) => {
    console.log('Received request method:', req.method);
    console.log('Request headers:', JSON.stringify(req.headers));

    const postUrl = getPostUrl();
    console.log('Using post URL:', postUrl);

    if (req.method === 'GET') {
        // Handle GET request (initial frame load)
        const initialHtml = generateHtml(
            'Default',
            '<p>Enter a Farcaster name to view auction details.</p>',
            'https://www.aaronvick.com/Moxie/11.JPG',
            postUrl
        );
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(initialHtml);
    }

    if (req.method !== 'POST') {
        console.error('Method Not Allowed');
        return res.status(405).send('Method Not Allowed');
    }

    // Handle POST request (button click)
    try {
        const { untrustedData } = req.body || {};
        const farcasterName = untrustedData?.inputText || '';

        console.log('Farcaster name:', farcasterName);

        let fid = DEFAULT_FID;
        let displayName = 'Default Account';

        if (farcasterName.trim() !== '') {
            try {
                const headers = {
                    'API-KEY': process.env.FarQuestAPI,
                    'accept': 'application/json',
                };
                const fidData = await httpsGet(`https://build.far.quest/farcaster/v2/user-by-username?username=${farcasterName}`, headers);
                const fidJson = JSON.parse(fidData);
                if (fidJson.result && fidJson.result.user && fidJson.result.user.fid) {
                    fid = fidJson.result.user.fid;
                    displayName = farcasterName;
                    console.log(`Fetched FID: ${fid} for Farcaster name: ${farcasterName}`);
                } else {
                    throw new Error('FID not found in the response');
                }
            } catch (error) {
                console.error('Error fetching FID:', error.message);
                displayName = 'Invalid Farcaster name';
            }
        }

        console.log('Using FID:', fid);

        const auctionData = await getAuctionData(fid);

        console.log('Auction data:', auctionData);

        let content;
        if (auctionData.error) {
            content = `<p>${auctionData.error}</p>`;
        } else {
            content = `
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <p>Clearing Price: ${auctionData.clearingPrice || 'N/A'}</p>
                        <p>Auction Supply: ${auctionData.auctionSupply || 'N/A'}</p>
                        <p>Auction Start: ${auctionData.startTime || 'N/A'}</p>
                        <p>Auction End: ${auctionData.endTime || 'N/A'}</p>
                    </div>
                    <div>
                        <p>Total Orders: ${auctionData.totalOrders || 'N/A'}</p>
                        <p>Unique Bidders: ${auctionData.uniqueBidders || 'N/A'}</p>
                        <p>Status: ${auctionData.status || 'N/A'}</p>
                        <p>Total Bid Value: ${auctionData.totalBidValue || 'N/A'}</p>
                    </div>
                </div>
            `;
        }

        const imageUrl = generateImageUrl(auctionData, displayName);
        const html = generateHtml(displayName, content, imageUrl, postUrl);

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('Error in auctions:', error.message);
        const errorHtml = generateHtml(
            'Error',
            '<p>Failed to fetch auction data. Please try again.</p>',
            'https://www.aaronvick.com/Moxie/11.JPG',
            postUrl
        );
        res.status(500).send(errorHtml);
    }
};
