const url = require('url');
const https = require('https');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
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
                        reject(new Error(`Failed to parse response: ${error.message}`));
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
                }
            }
        }
    `;
    const variables = { identity: usernameOrFid };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`,
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
        throw error;
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
                }
            }
            TokenNfts(
                input: {filter: {owner: {_eq: $address}, address: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: base, limit: 1}
            ) {
                TokenNft {
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
    };

    try {
        const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
        console.log('Moxie auction data response:', safeStringify(result));

        if (result.errors) {
            throw new Error(`Moxie data query error: ${result.errors[0].message}`);
        }

        const tokenBalance = result.data?.TokenBalances?.TokenBalance?.[0];
        const tokenNft = result.data?.TokenNfts?.TokenNft?.[0];

        return {
            auctionId: address,
            auctionSupply: tokenBalance?.amount || 'N/A',
            totalBidValue: tokenBalance?.formattedAmount || 'N/A',
            tokenImage: tokenNft?.contentValue?.image?.original || null,
        };
    } catch (error) {
        console.error('Error in getMoxieAuctionData:', error);
        throw error;
    }
}

function generateImageUrl(auctionData, farcasterName, errorInfo = null) {
    let text;
    if (errorInfo) {
        text = `Error for ${farcasterName}: ${errorInfo.message}`;
    } else if (auctionData) {
        text = `Auction for ${farcasterName}:
Supply: ${auctionData.auctionSupply}
Value: ${auctionData.totalBidValue}`;
    } else {
        text = `No data for ${farcasterName}`;
    }

    return auctionData?.tokenImage || `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}`;
}

module.exports = async (req, res) => {
    try {
        console.log('Request method:', req.method);
        console.log('Request body:', safeStringify(req.body));

        const baseHtml = (imageUrl, buttonText, inputText) => {
            const postUrl = `https://${req.headers.host}/api/auctions`;
            console.log('Post URL:', postUrl);
            console.log('Image URL:', imageUrl);

            return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Details</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${imageUrl}">
    <meta property="fc:frame:post_url" content="${postUrl}">
    <meta property="fc:frame:button:1" content="${buttonText}">
    ${inputText ? `<meta property="fc:frame:input:text" content="${inputText}">` : ''}
</head>
<body>
    <h1>Moxie Auction Frame</h1>
</body>
</html>`;
        };

        let html;
        if (req.method === 'GET') {
            console.log('Handling GET request');
            html = baseHtml(DEFAULT_IMAGE_URL, "View Auction Details", "Enter Farcaster name");
        } else if (req.method === 'POST') {
            console.log('Handling POST request');
            const farcasterName = req.body?.untrustedData?.inputText || 'Unknown User';
            console.log('Farcaster name:', farcasterName);

            let auctionData = null;
            let errorInfo = null;

            try {
                const { address } = await getUserWalletAddress(farcasterName);
                auctionData = await getMoxieAuctionData(address);
            } catch (error) {
                console.error('Error fetching auction data:', error);
                errorInfo = { message: error.message };
            }

            const dynamicImageUrl = generateImageUrl(auctionData, farcasterName, errorInfo);
            html = baseHtml(dynamicImageUrl, "Check Another Auction", "Enter Farcaster name");
        }

        console.log('Sending HTML response');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    } catch (error) {
        logError('Error in main handler', error);
        const errorImageUrl = generateImageUrl(null, 'Error', { message: 'An unexpected error occurred' });
        const errorHtml = baseHtml(errorImageUrl, "Try Again", "Enter Farcaster name");
        return res.status(200).send(errorHtml);
    }
};
