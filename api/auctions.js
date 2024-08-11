const url = require('url');
const https = require('https');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/graphql';
const DEFAULT_FID = '354795';
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

function safeStringify(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (error) {
        return `[Error serializing object: ${error.message}]`;
    }
}

function logError(message, error, additionalInfo = {}) {
    console.error(`${message}:`);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    if (error.cause) {
        console.error('Error cause:', error.cause);
    }
    console.error('Additional Info:', safeStringify(additionalInfo));
}

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
        query GetUserByUsername($identity: Identity!) {
            Socials(
                input: {filter: {identity: {_eq: $identity}}, blockchain: ethereum}
            ) {
                Social {
                    userId
                    userAssociatedAddresses
                    userHomeURL
                    dappName
                    dappSlug
                    blockchain
                    username
                }
            }
        }
    `;
    const variables = { identity: username };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`
    };

    return await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
}

async function getMoxieAuctionData(fid) {
    const query = `
        query GetMoxieAuctionData($identity: Identity!) {
            TokenBalances(
                input: {filter: {owner: {_eq: $identity}, tokenAddress: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: ethereum, limit: 1}
            ) {
                TokenBalance {
                    amount
                    formattedAmount
                    token {
                        name
                        symbol
                    }
                }
            }
        }
    `;
    const variables = { identity: `fc_fid:${fid}` };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`
    };

    console.log('Attempting to fetch Moxie auction data for FID:', fid);
    const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
    console.log('Raw Moxie auction data result:', safeStringify(result));

    if (result.errors) {
        throw new Error(result.errors[0].message);
    }
    
    if (!result.data || !result.data.TokenBalances || !result.data.TokenBalances.TokenBalance) {
        throw new Error('No Moxie auction data found');
    }
    
    const tokenBalance = result.data.TokenBalances.TokenBalance[0];
    return {
        auctionId: fid,
        auctionSupply: tokenBalance.amount || 'N/A',
        clearingPrice: 'N/A',
        status: tokenBalance.amount > 0 ? 'Active' : 'Inactive',
        startTime: 'N/A',
        endTime: 'N/A',
        totalOrders: 'N/A',
        uniqueBidders: 'N/A',
        totalBidValue: tokenBalance.formattedAmount || 'N/A'
    };
}

function generateImageUrl(auctionData, displayName, errorInfo = null, debugInfo = '') {
    let text;
    if (errorInfo) {
        text = `
Error for ${displayName}

Error Type: ${errorInfo.type}
Error Message: ${errorInfo.message}
Details: ${errorInfo.details || 'No additional details'}

Debug Info:
${debugInfo}
        `.trim();
    } else {
        text = `
Auction for ${displayName}

Auction ID:     ${(auctionData.auctionId || 'N/A').padEnd(20)}
Auction Supply: ${(auctionData.auctionSupply || 'N/A').padEnd(20)}
Clearing Price: ${(auctionData.clearingPrice || 'N/A').padEnd(20)}
Status:         ${(auctionData.status || 'N/A').padEnd(20)}
Total Bid Value:${(auctionData.totalBidValue || 'N/A').padEnd(20)}
        `.trim();
    }

    return `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=30&weight=bold`;
}

module.exports = async (req, res) => {
    let debugInfo = '';
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

        let html;
        if (req.method === 'GET' || !req.body) {
            console.log('Handling as GET request');
            html = baseHtml(DEFAULT_IMAGE_URL, "View Auction Details", "Enter Farcaster name (optional)");
        } else {
            console.log('Handling as POST request');
            const farcasterName = req.body.untrustedData?.inputText || '';
            
            let fid = DEFAULT_FID;
            let displayName = 'Default User';
            let errorInfo = null;
            let auctionData = null;
            let userData = null;

            debugInfo += '--- Debug Info ---\n';
            debugInfo += `Timestamp: ${new Date().toISOString()}\n`;
            debugInfo += `Request method: ${req.method}\n`;
            debugInfo += `Farcaster name: ${farcasterName || 'Not provided'}\n`;

            if (farcasterName.trim() !== '') {
                try {
                    userData = await getUserDataFromAirstack(farcasterName);
                    console.log('Airstack user data:', safeStringify(userData));
                    
                    if (userData.data && userData.data.Socials && userData.data.Socials.Social && userData.data.Socials.Social.length > 0) {
                        const user = userData.data.Socials.Social[0];
                        fid = user.userId;
                        displayName = user.username || farcasterName;
                    } else {
                        console.log('User not found in Airstack');
                        errorInfo = {
                            type: 'User Not Found',
                            message: 'The specified Farcaster name was not found in Airstack.',
                            details: `Searched for: ${farcasterName}`
                        };
                    }
                } catch (error) {
                    console.error('Error fetching user data from Airstack:', error);
                    errorInfo = {
                        type: 'Airstack API Error',
                        message: 'Failed to fetch user data from Airstack.',
                        details: error.message
                    };
                }
            }

            debugInfo += `FID used: ${fid}\n`;
            debugInfo += `Display name: ${displayName}\n`;

            if (!errorInfo) {
                try {
                    auctionData = await getMoxieAuctionData(fid);
                    console.log('Processed Moxie auction data:', safeStringify(auctionData));
                } catch (error) {
                    console.error('Error fetching Moxie auction data:', error);
                    errorInfo = {
                        type: 'Moxie Data Error',
                        message: 'Failed to fetch or process Moxie auction data.',
                        details: error.message
                    };
                }
            }

            debugInfo += '--- API Responses ---\n';
            debugInfo += `User data: ${safeStringify(userData).substring(0, 200)}...\n`;
            debugInfo += `Auction data: ${safeStringify(auctionData).substring(0, 200)}...\n`;

            const dynamicImageUrl = generateImageUrl(auctionData, displayName, errorInfo, debugInfo);
            console.log('Generated dynamic image URL:', dynamicImageUrl);

            html = baseHtml(dynamicImageUrl, "Check Another Auction", "Enter Farcaster name (optional)");
        }

        console.log('Sending HTML response');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    } catch (error) {
        debugInfo += '--- Unexpected Error ---\n';
        debugInfo += `Error: ${error.message}\n`;
        debugInfo += `Stack: ${error.stack}\n`;

        logError('Error in main handler', error, { debugInfo });
        const errorImageUrl = generateImageUrl(null, 'Error', {
            type: 'Unexpected Error',
            message: 'An unexpected error occurred while processing the request.',
            details: error.message
        }, debugInfo);
        const errorHtml = baseHtml(errorImageUrl, "Try Again", "Enter Farcaster name (optional)");
        return res.status(200).send(errorHtml);
    }
};
