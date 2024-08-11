const https = require('https');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/graphql';
const DEFAULT_FID = '354795';
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

function httpsPost(url, data, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            }
        }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsedData = JSON.parse(body);
                        resolve(parsedData);
                    } catch (error) {
                        reject(new Error('Failed to parse response from Airstack'));
                    }
                } else {
                    reject(new Error(`HTTP Error ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function getUserDataFromAirstack(username) {
    const query = `
        query GetUserByUsername($username: String!) {
            User(username: $username) {
                id
                username
                displayName
            }
        }
    `;
    const variables = { username };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`
    };

    try {
        const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
        return result;
    } catch (error) {
        console.error('Error fetching data from Airstack:', error);
        // Return mock data if Airstack API call fails
        return {
            data: {
                User: {
                    id: DEFAULT_FID,
                    username: username,
                    displayName: username
                }
            }
        };
    }
}

function generateImageUrl(auctionData, farcasterName) {
    const text = `
Auction for ${farcasterName}

Clearing Price:  ${auctionData.clearingPrice?.padEnd(20)}  Auction Supply:  ${auctionData.auctionSupply}
Auction Start:   ${new Date(parseInt(auctionData.startTime) * 1000).toLocaleString()}
Auction End:     ${new Date(parseInt(auctionData.endTime) * 1000).toLocaleString()}
Status:          ${auctionData.status}
    `.trim();

    return `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=35&weight=bold`;
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

    const baseHtml = (image, buttonText, inputText, message = '') => `
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
            <p>${message}</p>
        </body>
        </html>
    `;

    if (req.method === 'GET' || !req.body?.untrustedData?.inputText) {
        const html = baseHtml(DEFAULT_IMAGE_URL, "View Auction Details", "Enter Farcaster name", "Enter a Farcaster name to view auction details.");
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    }

    if (req.method === 'POST') {
        try {
            const { untrustedData } = req.body;
            const farcasterName = untrustedData.inputText || '';

            if (!farcasterName.trim()) {
                throw new Error('Farcaster name is required');
            }

            const userData = await getUserDataFromAirstack(farcasterName);
            const displayName = userData.data.User.displayName || farcasterName;

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
            const html = baseHtml(imageUrl, "Check Another Auction", "Enter Farcaster name", `Auction details for ${displayName}`);

            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } catch (error) {
            console.error('Error processing request:', error);
            const errorMessage = error.message || 'An unexpected error occurred';
            const html = baseHtml(DEFAULT_IMAGE_URL, "Try Again", "Enter Farcaster name", `Error: ${errorMessage}`);
            return res.status(200).send(html);
        }
    }

    // If the method is not supported
    return res.status(405).send('Method Not Allowed');
};
