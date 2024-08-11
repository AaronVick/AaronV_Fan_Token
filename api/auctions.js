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

function logError(message, error) {
    console.error(`${message}:`);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    if (error.cause) {
        console.error('Error cause:', error.cause);
    }
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
        query GetUserByUsername($username: String!) {
            Socials(
                input: {filter: {username: {_eq: $username}}, blockchain: ethereum}
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
    const variables = { username };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`
    };

    return await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
}

async function getMoxieAuctionData(fid) {
    const query = `
        query GetMoxieAuctionData($fid: String!) {
            TokenBalances(
                input: {filter: {owner: {_eq: $fid}, tokenAddress: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: ethereum, limit: 1}
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
    const variables = { fid };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`
    };

    try {
        const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
        console.log('Moxie auction data result:', safeStringify(result));
        
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
            clearingPrice: 'N/A', // This information might not be available from this query
            status: tokenBalance.amount > 0 ? 'Active' : 'Inactive',
            startTime: 'N/A', // This information is not available from this query
            endTime: 'N/A', // This information is not available from this query
            totalOrders: 'N/A', // This information is not available from this query
            uniqueBidders: 'N/A', // This information is not available from this query
            totalBidValue: tokenBalance.formattedAmount || 'N/A'
        };
    } catch (error) {
        console.error('Error in getMoxieAuctionData:', error);
        throw error;
    }
}

function generateImageUrl(auctionData, farcasterName, errorInfo = null) {
    let text;
    if (errorInfo) {
        text = `
Error for ${farcasterName}

Error Type: ${errorInfo.type}
Error Message: ${errorInfo.message}
Details: ${errorInfo.details || 'No additional details'}
        `.trim();
    } else {
        text = `
Auction for ${farcasterName}

Clearing Price: ${auctionData.clearingPrice.padEnd(20)} Auction Supply: ${auctionData.auctionSupply.padEnd(10)}
Auction Start:  ${auctionData.startTime.padEnd(25)}
Auction End:    ${auctionData.endTime.padEnd(25)}
Status:         ${auctionData.status.padEnd(20)}
Total Orders:   ${auctionData.totalOrders.padEnd(20)}
Unique Bidders: ${auctionData.uniqueBidders.padEnd(20)}
Total Bid Value:${auctionData.totalBidValue.padEnd(20)}
        `.trim();
    }

    return `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=30&weight=bold`;
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
            html = baseHtml(DEFAULT_IMAGE_URL, "View Auction Details", "Enter Farcaster name");
        } else {
            console.log('Handling as POST request');
            const farcasterName = req.body.untrustedData?.inputText || '';
            
            let fid = DEFAULT_FID;
            let displayName = 'Unknown User';
            let errorInfo = null;

            if (farcasterName.trim() !== '') {
                try {
                    const userData = await getUserDataFromAirstack(farcasterName);
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

            let auctionData;
            if (!errorInfo) {
                try {
                    const moxieData = await getMoxieAuctionData(fid);
                    console.log('Moxie auction data:', safeStringify(moxieData));
                    // Process moxieData to extract relevant auction information
                    // This is a placeholder. Replace with actual data processing based on the Moxie auction data structure
                    auctionData = {
                        auctionId: '1234',
                        auctionSupply: '100',
                        clearingPrice: '50',
                        status: 'active',
                        startTime: new Date(Date.now()).toLocaleString(),
                        endTime: new Date(Date.now() + 86400000).toLocaleString(), // 24 hours from now
                        totalOrders: '20',
                        uniqueBidders: '10',
                        totalBidValue: '500',
                    };
                } catch (error) {
                    console.error('Error fetching Moxie auction data:', error);
                    errorInfo = {
                        type: 'Moxie Data Error',
                        message: 'Failed to fetch or process Moxie auction data.',
                        details: error.message
                    };
                }
            }

            const dynamicImageUrl = generateImageUrl(auctionData, displayName, errorInfo);
            console.log('Generated dynamic image URL:', dynamicImageUrl);

            html = baseHtml(dynamicImageUrl, "Check Another Auction", "Enter Farcaster name");
        }

        console.log('Sending HTML response');
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
