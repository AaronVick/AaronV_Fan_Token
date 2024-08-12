const url = require('url');
const https = require('https');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/graphql';
const DEFAULT_FID = '354795';
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

// ... (keep all existing functions)

function generateImageUrl(auctionData, farcasterName, errorInfo = null) {
    let text;
    if (errorInfo) {
        text = `Error for ${farcasterName}: ${errorInfo.message}`;
    } else if (auctionData) {
        text = `Auction for ${farcasterName}: Supply ${auctionData.auctionSupply}, Value ${auctionData.totalBidValue}`;
    } else {
        text = 'Welcome to Moxie Auction';
    }

    return `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}`;
}

module.exports = async (req, res) => {
    try {
        console.log('Received request method:', req.method);
        console.log('Request headers:', safeStringify(req.headers));
        console.log('Request body:', safeStringify(req.body));

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const baseHtml = (image, buttonText, inputText) => {
            const postUrl = new url.URL('/api/auctions', `https://${req.headers.host || FALLBACK_URL}`);
            console.log('Constructed post_url:', postUrl.toString());

            return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Moxie Auction Details</title>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="${image}">
                    <meta property="fc:frame:post_url" content="${postUrl.toString()}">
                    <meta property="fc:frame:button:1" content="${buttonText}">
                    ${inputText ? `<meta property="fc:frame:input:text" content="${inputText}">` : ''}
                </head>
                <body>
                    <h1>Moxie Auction Frame</h1>
                </body>
                </html>
            `;
        };

        let imageUrl, buttonText, inputText;

        if (req.method === 'GET' || !req.body) {
            console.log('Handling as GET request');
            imageUrl = generateImageUrl();
            buttonText = "View Auction Details";
            inputText = "Enter Farcaster name";
        } else {
            console.log('Handling as POST request');
            const farcasterName = req.body.untrustedData?.inputText || '';
            
            let fid = DEFAULT_FID;
            let displayName = 'Unknown User';
            let errorInfo = null;
            let auctionData = null;

            if (farcasterName.trim() !== '') {
                try {
                    const userData = await getUserDataFromAirstack(farcasterName);
                    console.log('Airstack user data:', safeStringify(userData));
                    
                    if (userData.data?.Socials?.Social?.[0]) {
                        const user = userData.data.Socials.Social[0];
                        fid = user.userId;
                        displayName = user.username || farcasterName;
                        auctionData = await getMoxieAuctionData(fid);
                        console.log('Processed Moxie auction data:', safeStringify(auctionData));
                    } else {
                        errorInfo = {
                            type: 'User Not Found',
                            message: 'User not found in Airstack.',
                            details: `Searched for: ${farcasterName}`
                        };
                    }
                } catch (error) {
                    console.error('Error:', error);
                    errorInfo = {
                        type: 'API Error',
                        message: 'Failed to fetch data.',
                        details: error.message
                    };
                }
            }

            imageUrl = generateImageUrl(auctionData, displayName, errorInfo);
            buttonText = "Check Another Auction";
            inputText = "Enter Farcaster name";
        }

        console.log('Generated image URL:', imageUrl);
        const html = baseHtml(imageUrl, buttonText, inputText);

        console.log('Sending HTML response');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    } catch (error) {
        logError('Error in main handler', error);
        const errorImageUrl = generateImageUrl(null, 'Error', {
            type: 'Unexpected Error',
            message: 'An unexpected error occurred.',
            details: error.message
        });
        const html = baseHtml(errorImageUrl, "Try Again", "Enter Farcaster name");
        return res.status(200).send(html);
    }
};
