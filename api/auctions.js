const https = require('https');

const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

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
    console.log('Request headers:', req.headers);
    console.log('Request body:', JSON.stringify(req.body));

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
        </body>
        </html>
    `;

    if (req.method === 'GET') {
        console.log('Sending initial frame HTML');
        const html = baseHtml(DEFAULT_IMAGE_URL, "View Auction Details", "Enter Farcaster name");
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    }

    if (req.method === 'POST') {
        console.log('Processing POST request');
        try {
            const { untrustedData } = req.body || {};
            const farcasterName = untrustedData?.inputText || 'Unknown User';
            console.log('Farcaster name:', farcasterName);

            const html = baseHtml(DEFAULT_IMAGE_URL, "Check Another Auction", "Enter Farcaster name");
            console.log('Sending response HTML');
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } catch (error) {
            console.error('Error processing POST request:', error);
            const html = baseHtml(DEFAULT_IMAGE_URL, "Try Again", "Enter Farcaster name");
            return res.status(200).send(html);
        }
    }

    // If the method is not supported
    console.log('Unsupported method:', req.method);
    return res.status(405).send('Method Not Allowed');
};
