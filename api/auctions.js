const { init, fetchQuery } = require('@airstack/node');
const https = require('https');

const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

// Initialize Airstack
init(process.env.AIRSTACK_API_KEY);

async function getAuctionData(fid) {
    // This function remains unchanged
    // ... (keep your existing getAuctionData function here)
}

function generateImageUrl(auctionData, farcasterName) {
    // This function remains unchanged
    // ... (keep your existing generateImageUrl function here)
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

            // For now, let's skip the FID fetching and auction data retrieval
            // and just return a frame with the entered name

            const html = baseHtml(DEFAULT_IMAGE_URL, "Check Another Auction", "Enter Farcaster name");
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } catch (error) {
            console.error('Error:', error);
            const html = baseHtml(DEFAULT_IMAGE_URL, "Try Again", "Enter Farcaster name");
            return res.status(200).send(html);
        }
    }

    // If the method is not supported
    return res.status(405).send('Method Not Allowed');
};
