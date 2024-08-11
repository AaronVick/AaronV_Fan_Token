const https = require('https');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/graphql';
const DEFAULT_FID = '354795';
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

// Keep your existing httpsPost and getUserDataFromAirstack functions

function generateImageUrl(auctionData, farcasterName) {
    // Keep your existing implementation
}

function getPostUrl() {
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}/api/auctions`;
    } else if (process.env.CUSTOM_URL) {
        return `${process.env.CUSTOM_URL}/api/auctions`;
    }
    return `${FALLBACK_URL}/api/auctions`;
}

module.exports = async (req, res) => {
    console.log('Received request method:', req.method);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const baseHtml = (image, buttonText, inputText) => `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Moxie Auction Details</title>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${image}">
            <meta property="fc:frame:post_url" content="${getPostUrl()}">
            <meta property="fc:frame:button:1" content="${buttonText}">
            ${inputText ? `<meta property="fc:frame:input:text" content="${inputText}">` : ''}
        </head>
        <body>
            <h1>Moxie Auction Frame</h1>
            <p>Enter a Farcaster name to view auction details.</p>
        </body>
        </html>
    `;

    if (req.method === 'GET' || !req.body?.untrustedData?.inputText) {
        const html = baseHtml(DEFAULT_IMAGE_URL, "View Auction Details", "Enter Farcaster name");
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    }

    if (req.method === 'POST') {
        try {
            const { untrustedData } = req.body;
            const farcasterName = untrustedData.inputText || '';

            let displayName = 'Default Account';

            if (farcasterName.trim() !== '') {
                try {
                    const userData = await getUserDataFromAirstack(farcasterName);
                    if (userData.data && userData.data.user) {
                        displayName = userData.data.user.displayName || farcasterName;
                    } else {
                        throw new Error('User not found in Airstack response');
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error.message);
                    displayName = 'Invalid Farcaster name';
                }
            }

            // Generate auction data (mocked for this example)
            const auctionData = {
                auctionId: '1234',
                auctionSupply: '100',
                clearingPrice: '50',
                status: 'active',
                startTime: '1691607000',
                endTime: '1691617000',
                totalOrders: '20',
                uniqueBidders: '10',
                totalBidValue: '500',
            };

            const imageUrl = generateImageUrl(auctionData, displayName);
            const html = baseHtml(imageUrl, "Check Another Auction", "Enter Farcaster name");

            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } catch (error) {
            console.error('Error processing request:', error);
            const html = baseHtml(DEFAULT_IMAGE_URL, "Try Again", "Enter Farcaster name");
            return res.status(200).send(html);
        }
    }

    // If the method is not supported
    return res.status(405).send('Method Not Allowed');
};
