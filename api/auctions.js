const url = require('url');
const https = require('https');
const moxieResolveData = require('./moxie_resolve.json');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const DEFAULT_FID = '354795';
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

// ... (previous functions remain the same)

function generateImageUrl(auctionData, farcasterName, errorInfo = null) {
    let text;
    if (errorInfo) {
        text = `
Error for ${farcasterName}

Error Type: ${errorInfo.type}
Error Message: ${errorInfo.message}
Details: ${errorInfo.details || 'No additional details'}

API Key Status: ${process.env.AIRSTACK_API_KEY ? 'Present' : 'Missing'}
Query Execution: ${errorInfo.queryExecuted ? 'Attempted' : 'Not Attempted'}
Airstack Access: ${errorInfo.airstackAccessed ? 'Successful' : 'Failed'}
        `.trim();
    } else {
        text = `
Auction for ${farcasterName}

Auction ID:     ${(auctionData?.auctionId || 'N/A').padEnd(20)}
Auction Supply: ${(auctionData?.auctionSupply || 'N/A').padEnd(20)}
Clearing Price: ${(auctionData?.clearingPrice || 'N/A').padEnd(20)}
Status:         ${(auctionData?.status || 'N/A').padEnd(20)}
Total Bid Value:${(auctionData?.totalBidValue || 'N/A').padEnd(20)}
        `.trim();
    }

    const imageUrl = auctionData?.tokenImage || `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=30&weight=bold`;
    console.log('Generated Image URL:', imageUrl);
    return imageUrl;
}

module.exports = async (req, res) => {
    try {
        console.log('Received request method:', req.method);
        console.log('Request headers:', safeStringify(req.headers));
        console.log('Request body:', safeStringify(req.body));
        console.log('Request query:', safeStringify(req.query));

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const baseHtml = (image, buttonText, inputText) => {
            const postUrl = new url.URL('/api/auctions', `https://${req.headers.host || 'aaron-v-fan-token.vercel.app'}`);
            console.log('Constructed post_url:', postUrl.toString());

            // Ensure image is always set, fallback to DEFAULT_IMAGE_URL if not provided
            const imageUrl = image || DEFAULT_IMAGE_URL;
            console.log('Using image URL:', imageUrl);

            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Moxie Auction Details</title>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="${imageUrl}">
                    <meta property="fc:frame:post_url" content="${postUrl.toString()}">
                    <meta property="fc:frame:button:1" content="${buttonText}">
                    ${inputText ? `<meta property="fc:frame:input:text" content="${inputText}">` : ''}
                </head>
                <body>
                    <h1>Moxie Auction Frame</h1>
                </body>
                </html>
            `;
            console.log('Generated HTML:', html);
            return html;
        };

        let html;
        if (req.method === 'GET' || !req.body) {
            console.log('Handling as GET request');
            html = baseHtml(DEFAULT_IMAGE_URL, "View Auction Details", "Enter Farcaster name");
        } else {
            console.log('Handling as POST request');
            const farcasterName = req.body.untrustedData?.inputText || '';
            console.log('Farcaster name:', farcasterName);

            let displayName = 'Unknown User';
            let errorInfo = null;
            let auctionData = null;

            if (farcasterName.trim() !== '') {
                try {
                    const { address } = await getUserWalletAddress(farcasterName);
                    displayName = farcasterName;
                    console.log('Resolved address:', address);

                    auctionData = await getMoxieAuctionData(address);
                    console.log('Processed Moxie auction data:', safeStringify(auctionData));
                } catch (error) {
                    console.error('Error processing user data:', error);
                    errorInfo = {
                        type: 'User Data Error',
                        message: error.message,
                        details: `Error occurred for Farcaster name: ${farcasterName}`,
                        queryExecuted: true,
                        airstackAccessed: true
                    };
                }
            }

            const dynamicImageUrl = generateImageUrl(auctionData, displayName, errorInfo);
            html = baseHtml(dynamicImageUrl, errorInfo ? "Try Again" : "Check Another Auction", "Enter Farcaster name");
        }

        console.log('Sending HTML response');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    } catch (error) {
        logError('Error in main handler', error);
        const errorImageUrl = generateImageUrl(null, 'Error', {
            type: 'Unexpected Error',
            message: 'An unexpected error occurred while processing the request.',
            details: error.message,
            queryExecuted: false,
            airstackAccessed: false
        });
        const errorHtml = baseHtml(errorImageUrl, "Try Again", "Enter Farcaster name");
        return res.status(200).send(errorHtml);
    }
};
