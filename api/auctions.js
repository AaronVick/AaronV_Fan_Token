const url = require('url');
const https = require('https');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/graphql';
const DEFAULT_FID = '354795'; // Default Farcaster ID
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

const INTERMEDIATE_DELAY = 3000; // 3 seconds delay for intermediate steps

function generateIntermediateImageUrl(step, details) {
    const text = `
Intermediate Step: ${step}
Details: ${details}
    `.trim();
    return `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=30&weight=bold`;
}

// ... (keep other existing functions)

module.exports = async (req, res) => {
    try {
        console.log('Received request method:', req.method);
        console.log('Request headers:', safeStringify(req.headers));
        console.log('Request body:', safeStringify(req.body));
        console.log('Request query:', safeStringify(req.query));

        // Set CORS headers (keep this part)

        const baseHtml = (image, buttonText, inputText, intermediateStep = null) => {
            const postUrl = new url.URL('/api/auctions', `https://${req.headers.host || 'aaron-v-fan-token.vercel.app'}`);
            console.log('Constructed post_url:', postUrl.toString());

            let html = `
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
            `;

            if (intermediateStep) {
                html += `
                    <meta property="fc:frame:image" content="${intermediateStep}">
                    <meta http-equiv="refresh" content="${INTERMEDIATE_DELAY / 1000}">
                `;
            }

            html += `
                </head>
                <body>
                    <h1>Moxie Auction Frame</h1>
                </body>
                </html>
            `;

            return html;
        };

        let html;
        if (req.method === 'GET' || !req.body) {
            console.log('Handling as GET request');
            html = baseHtml(DEFAULT_IMAGE_URL, "View Auction Details", "Enter Farcaster name");
        } else {
            console.log('Handling as POST request');
            const farcasterName = req.body.untrustedData?.inputText || '';
            
            let fid = DEFAULT_FID;
            let displayName = 'Unknown User';
            let errorInfo = null;
            let auctionData = null;

            console.log(`Input Farcaster name: "${farcasterName}"`);
            console.log(`Using FID: ${fid}`);

            const intermediateStep1 = generateIntermediateImageUrl("Fetching User Data", `FID: ${fid}`);
            res.write(baseHtml(DEFAULT_IMAGE_URL, "Processing...", null, intermediateStep1));

            if (farcasterName.trim() !== '') {
                try {
                    const userData = await getUserDataFromAirstack(farcasterName);
                    console.log('Airstack user data:', safeStringify(userData));
                    
                    if (userData.data && userData.data.Socials && userData.data.Socials.Social && userData.data.Socials.Social.length > 0) {
                        const user = userData.data.Socials.Social[0];
                        fid = user.userId;
                        displayName = user.username || farcasterName;
                    } else {
                        console.log('User not found in Airstack, using default FID');
                        errorInfo = {
                            type: 'User Not Found',
                            message: 'The specified Farcaster name was not found in Airstack. Using default FID.',
                            details: `Searched for: ${farcasterName}, Using FID: ${fid}`
                        };
                    }
                } catch (error) {
                    console.error('Error fetching user data from Airstack:', error);
                    errorInfo = {
                        type: 'Airstack API Error',
                        message: 'Failed to fetch user data from Airstack. Using default FID.',
                        details: `Error: ${error.message}, Using FID: ${fid}`
                    };
                }
            } else {
                console.log('No Farcaster name provided, using default FID');
                displayName = 'Default User';
            }

            const intermediateStep2 = generateIntermediateImageUrl("Fetching Moxie Data", `FID: ${fid}, User: ${displayName}`);
            res.write(baseHtml(DEFAULT_IMAGE_URL, "Processing...", null, intermediateStep2));

            if (!errorInfo) {
                try {
                    auctionData = await getMoxieAuctionData(fid);
                    console.log('Processed Moxie auction data:', safeStringify(auctionData));
                } catch (error) {
                    console.error('Error fetching Moxie auction data:', error);
                    errorInfo = {
                        type: 'Moxie Data Error',
                        message: 'Failed to fetch or process Moxie auction data.',
                        details: `Error: ${error.message}, FID: ${fid}`
                    };
                }
            }

            const dynamicImageUrl = generateImageUrl(auctionData, displayName, errorInfo);
            console.log('Generated dynamic image URL:', dynamicImageUrl);

            // Add a delay to allow viewing of intermediate steps
            await new Promise(resolve => setTimeout(resolve, INTERMEDIATE_DELAY));

            html = baseHtml(dynamicImageUrl, "Check Another Auction", "Enter Farcaster name");
        }

        console.log('Sending final HTML response');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    } catch (error) {
        logError('Error in main handler', error);
        const errorImageUrl = generateImageUrl(null, 'Error', {
            type: 'Unexpected Error',
            message: 'An unexpected error occurred while processing the request.',
            details: error.message
        });
        const errorHtml = baseHtml(errorImageUrl, "Try Again", "Enter Farcaster name");
        return res.status(200).send(errorHtml);
    }
};
