const url = require('url');
const https = require('https');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/graphql';
const DEFAULT_FID = '354795';
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

module.exports = async (req, res) => {
    console.log('Received request method:', req.method);
    console.log('Request headers:', safeStringify(req.headers));
    console.log('Request body:', safeStringify(req.body));

    const host = req.headers.host || FALLBACK_URL;
    let imageUrl = DEFAULT_IMAGE_URL;
    let buttonText = "View Auction Details";
    let inputText = "Enter Farcaster name";

    if (req.method === 'POST' && req.body?.untrustedData?.inputText) {
        try {
            const result = await handlePostRequest(req.body.untrustedData.inputText);
            imageUrl = result.imageUrl;
            buttonText = "Check Another Auction";
        } catch (error) {
            console.error('Error handling POST request:', error);
            imageUrl = generateErrorImageUrl(error);
            buttonText = "Try Again";
        }
    }

    const postUrl = `https://${host}/api/auctions`;
    const html = generateHtml(imageUrl, buttonText, inputText, postUrl);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
};

function generateHtml(imageUrl, buttonText, inputText, postUrl) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Moxie Auction Frame</title>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${imageUrl}">
            <meta property="fc:frame:post_url" content="${postUrl}">
            <meta property="fc:frame:button:1" content="${buttonText}">
            <meta property="fc:frame:input:text" content="${inputText}">
        </head>
        <body>
            <h1>Moxie Auction Frame</h1>
        </body>
        </html>
    `;
}

async function handlePostRequest(farcasterName) {
    let fid = DEFAULT_FID;
    let displayName = 'Unknown User';
    let auctionData = null;

    try {
        const userData = await getUserDataFromAirstack(farcasterName);
        if (userData.data?.Socials?.Social?.[0]) {
            const user = userData.data.Socials.Social[0];
            fid = user.userId;
            displayName = user.username || farcasterName;
            auctionData = await getMoxieAuctionData(fid);
        } else {
            throw new Error('User not found in Airstack');
        }
    } catch (error) {
        console.error('Error in handlePostRequest:', error);
        throw error; // Re-throw to be caught in the main handler
    }

    return {
        imageUrl: generateImageUrl(auctionData, displayName)
    };
}

function generateErrorImageUrl(error) {
    const errorText = `
Error occurred

Type: ${error.name}
Message: ${error.message}
Details: ${error.details || 'No additional details'}
    `.trim();

    return `https://via.placeholder.com/1000x600/FF0000/FFFFFF?text=${encodeURIComponent(errorText)}&font=monospace&size=20&weight=bold`;
}

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

    try {
        return await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
    } catch (error) {
        logError('Error fetching user data from Airstack', error);
        throw error;
    }
}

async function getMoxieAuctionData(fid) {
    const query = `
        query GetMoxieAuctionData($identity: Identity!) {
            TokenBalances(
                input: {filter: {owner: {_eq: $identity}, tokenAddress: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: base, limit: 1}
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
                input: {filter: {owner: {_eq: $identity}, address: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: base, limit: 1}
            ) {
                TokenNft {
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
    const variables = { identity: `fc_fid:${fid}` };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`
    };

    try {
        const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
        console.log('Moxie auction data result:', safeStringify(result));
        
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }
        
        if (!result.data || !result.data.TokenBalances || !result.data.TokenNfts) {
            throw new Error('No Moxie auction data found');
        }
        
        const tokenBalance = result.data.TokenBalances.TokenBalance[0];
        const tokenNft = result.data.TokenNfts.TokenNft[0];
        return {
            auctionId: fid,
            auctionSupply: tokenBalance.amount || 'N/A',
            tokenImage: tokenNft?.contentValue?.image?.original || DEFAULT_IMAGE_URL,
            totalBidValue: tokenBalance.formattedAmount || 'N/A',
        };
    } catch (error) {
        logError('Error in getMoxieAuctionData', error);
        throw error;
    }
}

function generateImageUrl(auctionData, farcasterName) {
    const text = `
Auction for ${farcasterName}

Auction ID:     ${(auctionData.auctionId || 'N/A').padEnd(20)}
Auction Supply: ${(auctionData.auctionSupply || 'N/A').padEnd(20)}
Total Bid Value:${(auctionData.totalBidValue || 'N/A').padEnd(20)}
    `.trim();

    return `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=30&weight=bold`;
}
