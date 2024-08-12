const url = require('url');
const https = require('https');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
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
                        reject(new Error(`Failed to parse response from Airstack: ${error.message}`));
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

async function getUserWalletAddress(usernameOrFid) {
    const query = `
        query GetUserByUsernameOrFid($identity: Identity!) {
            Socials(
                input: {filter: {identity: {_eq: $identity}}, blockchain: farcaster}
            ) {
                Social {
                    userId
                    userAssociatedAddresses
                    profileName
                    profileDisplayName
                    profileImage
                    profileBio
                    profileUrl
                    farcasterProfile {
                        followerCount
                        followingCount
                    }
                }
            }
        }
    `;
    const variables = { identity: usernameOrFid };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`,
        'Content-Type': 'application/json',
    };

    try {
        const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
        console.log('Airstack user data response:', safeStringify(result));

        if (result.errors) {
            throw new Error(`Airstack query error: ${result.errors[0].message}`);
        }

        const user = result.data?.Socials?.Social?.[0];
        if (!user) {
            throw new Error(`User ${usernameOrFid} not found in Airstack.`);
        }

        const address = user.userAssociatedAddresses?.[0]; // Assuming the first associated address is the one you want

        if (!address) {
            throw new Error(`No associated wallet address found for user ${usernameOrFid}`);
        }

        return { address };
    } catch (error) {
        console.error('Error in getUserWalletAddress:', error);
        throw new Error(`User lookup error: ${error.message}`);
    }
}

async function getMoxieAuctionData(address) {
    const query = `
        query GetMoxieAuctionData($address: Identity!) {
            TokenBalances(
                input: {filter: {owner: {_eq: $address}, tokenAddress: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: base, limit: 1}
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
            TokenNfts(
                input: {filter: {owner: {_eq: $address}, address: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: base, limit: 1}
            ) {
                TokenNft {
                    address
                    tokenId
                    contentValue {
                        image {
                            original
                        }
                    }
                }
            }
        }
    `;
    const variables = { address };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`,
        'Content-Type': 'application/json',
    };

    try {
        console.log('Starting API call...');
        const startTime = Date.now();

        const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);

        const endTime = Date.now();
        console.log(`API call took ${endTime - startTime} ms`);

        if (result.errors) {
            console.error('Airstack query error:', result.errors);
            throw new Error(`Airstack query error: ${result.errors[0].message}`);
        }

        if (!result.data || (!result.data.TokenBalances?.TokenBalance && !result.data.TokenNfts?.TokenNft)) {
            console.error('No Moxie auction data found in Airstack response');
            throw new Error('No Moxie auction data found in Airstack response');
        }

        const tokenBalance = result.data.TokenBalances?.TokenBalance?.[0];
        const tokenNft = result.data.TokenNfts?.TokenNft?.[0];

        console.log('Token Balance:', tokenBalance);
        console.log('Token NFT:', tokenNft);

        return {
            auctionId: address,
            auctionSupply: tokenBalance?.amount || 'N/A',
            clearingPrice: 'N/A',
            status: tokenBalance?.amount > 0 ? 'Active' : 'Inactive',
            startTime: 'N/A',
            endTime: 'N/A',
            totalOrders: 'N/A',
            uniqueBidders: 'N/A',
            totalBidValue: tokenBalance?.formattedAmount || 'N/A',
            tokenImage: tokenNft?.contentValue?.image?.original || null,
        };
    } catch (error) {
        console.error('Error in getMoxieAuctionData:', error);
        throw new Error(`Moxie Data Error: ${error.message}`);
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

API Key Status: ${process.env.AIRSTACK_API_KEY ? 'Present' : 'Missing'}
Query Execution: ${errorInfo.queryExecuted ? 'Attempted' : 'Not Attempted'}
Airstack Access: ${errorInfo.airstackAccessed ? 'Successful' : 'Failed'}
        `.trim();
    } else {
        text = `
Auction for ${farcasterName}

Auction ID:     ${(auctionData.auctionId || 'N/A').padEnd(20)}
Auction Supply: ${(auctionData.auctionSupply || 'N/A').padEnd(20)}
Clearing Price: ${(auctionData.clearingPrice || 'N/A').padEnd(20)}
Status:         ${(auctionData.status || 'N/A').padEnd(20)}
Total Bid Value:${(auctionData.totalBidValue || 'N/A').padEnd(20)}
        `.trim();
    }

    return auctionData?.tokenImage || `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=30&weight=bold`;
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
                    <metaHere’s the rest of your `auctions.js` module:

```javascript
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

            let displayName = 'Unknown User';
            let errorInfo = null;
            let auctionData = null;

            if (farcasterName.trim() !== '') {
                try {
                    const { address } = await getUserWalletAddress(farcasterName);
                    displayName = farcasterName;

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

            if (errorInfo) {
                const dynamicImageUrl = generateImageUrl(null, displayName, errorInfo);
                html = baseHtml(dynamicImageUrl, "Try Again", "Enter Farcaster name");
            } else {
                const dynamicImageUrl = generateImageUrl(auctionData, displayName, null);
                html = baseHtml(dynamicImageUrl, "Check Another Auction", "Enter Farcaster name");
            }
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

/* const url = require('url');
const https = require('https');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
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
                        reject(new Error(`Failed to parse response from Airstack: ${error.message}`));
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

async function getUserWalletAddress(usernameOrFid) {
    const query = `
        query GetUserByUsernameOrFid($identity: Identity!) {
            Socials(
                input: {filter: {identity: {_eq: $identity}}, blockchain: farcaster}
            ) {
                Social {
                    userId
                    userAssociatedAddresses
                    profileName
                    profileDisplayName
                    profileImage
                    profileBio
                    profileUrl
                    farcasterProfile {
                        followerCount
                        followingCount
                    }
                }
            }
        }
    `;
    const variables = { identity: usernameOrFid };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`,
        'Content-Type': 'application/json',
    };

    try {
        const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
        console.log('Airstack user data response:', safeStringify(result));

        if (result.errors) {
            throw new Error(`Airstack query error: ${result.errors[0].message}`);
        }

        const user = result.data?.Socials?.Social?.[0];
        if (!user) {
            throw new Error(`User ${usernameOrFid} not found in Airstack.`);
        }

        const address = user.userAssociatedAddresses?.[0];

        if (!address) {
            throw new Error(`No associated wallet address found for user ${usernameOrFid}`);
        }

        return { address };
    } catch (error) {
        console.error('Error in getUserWalletAddress:', error);
        throw new Error(`User lookup error: ${error.message}`);
    }
}

async function getMoxieAuctionData(address) {
    const query = `
        query GetMoxieAuctionData($address: Identity!) {
            TokenBalances(
                input: {filter: {owner: {_eq: $address}, tokenAddress: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: base, limit: 1}
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
            TokenNfts(
                input: {filter: {owner: {_eq: $address}, address: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: base, limit: 1}
            ) {
                TokenNft {
                    address
                    tokenId
                    contentValue {
                        image {
                            original
                        }
                    }
                }
            }
        }
    `;
    const variables = { address };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`,
        'Content-Type': 'application/json',
    };

    try {
        console.log('Starting API call...');
        const startTime = Date.now();

        const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);

        const endTime = Date.now();
        console.log(`API call took ${endTime - startTime} ms`);

        if (result.errors) {
            console.error('Airstack query error:', result.errors);
            throw new Error(`Airstack query error: ${result.errors[0].message}`);
        }

        if (!result.data || (!result.data.TokenBalances?.TokenBalance && !result.data.TokenNfts?.TokenNft)) {
            console.error('No Moxie auction data found in Airstack response');
            throw new Error('No Moxie auction data found in Airstack response');
        }

        const tokenBalance = result.data.TokenBalances?.TokenBalance?.[0];
        const tokenNft = result.data.TokenNfts?.TokenNft?.[0];

        console.log('Token Balance:', tokenBalance);
        console.log('Token NFT:', tokenNft);

        return {
            auctionId: address,
            auctionSupply: tokenBalance?.amount || 'N/A',
            clearingPrice: 'N/A',
            status: tokenBalance?.amount > 0 ? 'Active' : 'Inactive',
            startTime: 'N/A',
            endTime: 'N/A',
            totalOrders: 'N/A',
            uniqueBidders: 'N/A',
            totalBidValue: tokenBalance?.formattedAmount || 'N/A',
            tokenImage: tokenNft?.contentValue?.image?.original || null,
        };
    } catch (error) {
        console.error('Error in getMoxieAuctionData:', error);
        throw new Error(`Moxie Data Error: ${error.message}`);
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

Auction ID:     ${(auctionData.auctionId || 'N/A').padEnd(20)}
Auction Supply: ${(auctionData.auctionSupply || 'N/A').padEnd(20)}
Status:         ${(auctionData.status || 'N/A').padEnd(20)}
Total Bid Value:${(auctionData.totalBidValue || 'N/A').padEnd(20)}
        `.trim();
    }

    // Always return a valid image URL
    return auctionData?.tokenImage || DEFAULT_IMAGE_URL;
}

const baseHtml = (image, buttonText, inputText) => {
    // Ensure image is always set to a valid URL
    const imageUrl = image || DEFAULT_IMAGE_URL;
    const postUrl = new url.URL('/api/auctions', FALLBACK_URL);
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
};

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

        let imageUrl = DEFAULT_IMAGE_URL;
        let html;

        if (req.method === 'GET' || !req.body) {
            html = baseHtml(imageUrl, "View Auction Details", "Enter Farcaster name");
        } else {
            const farcasterName = req.body.untrustedData?.inputText || '';

            if (farcasterName.trim() !== '') {
                try {
                    const { address } = await getUserWalletAddress(farcasterName);
                    const auctionData = await getMoxieAuctionData(address);
                    imageUrl = generateImageUrl(auctionData, farcasterName);
                } catch (error) {
                    imageUrl = generateImageUrl(null, farcasterName, {
                        type: 'User Data Error',
                        message: error.message,
                        details: `Error occurred for Farcaster name: ${farcasterName}`,
                    });
                }
            }
            html = baseHtml(imageUrl, "Check Another Auction", "Enter Farcaster name");
        }

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    } catch (error) {
        logError('Error in main handler', error);
        const errorImageUrl = generateImageUrl(null, 'Error', {
            type: 'Unexpected Error',
            message: 'An unexpected error occurred while processing the request.',
            details: error.message,
        });
        const errorHtml = baseHtml(errorImageUrl, "Try Again", "Enter Farcaster name");
        return res.status(200).send(errorHtml);
    }
};

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

        // Use DEFAULT_IMAGE_URL directly for initial GET request
        let imageUrl = DEFAULT_IMAGE_URL;

        if (req.method === 'GET' || !req.body) {
            html = baseHtml(imageUrl, "View Auction Details", "Enter Farcaster name");
        } else {
            const farcasterName = req.body.untrustedData?.inputText || '';

            if (farcasterName.trim() !== '') {
                try {
                    const { address } = await getUserWalletAddress(farcasterName);
                    const auctionData = await getMoxieAuctionData(address);
                    imageUrl = generateImageUrl(auctionData, farcasterName);
                } catch (error) {
                    imageUrl = generateImageUrl(null, farcasterName, {
                        type: 'User Data Error',
                        message: error.message,
                        details: `Error occurred for Farcaster name: ${farcasterName}`,
                    });
                }
            }
            html = baseHtml(imageUrl, "Check Another Auction", "Enter Farcaster name");
        }

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    } catch (error) {
        logError('Error in main handler', error);
        const errorImageUrl = generateImageUrl(null, 'Error', {
            type: 'Unexpected Error',
            message: 'An unexpected error occurred while processing the request.',
            details: error.message,
        });
        const errorHtml = baseHtml(errorImageUrl, "Try Again", "Enter Farcaster name");
        return res.status(200).send(errorHtml);
    }
};


