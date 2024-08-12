const { parse } = require('url');
const https = require('https');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
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
        'Content-Type': 'application/json',
    };

    try {
        const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
        const user = result.data?.Socials?.Social?.[0];

        if (!user) {
            throw new Error(`User ${usernameOrFid} not found.`);
        }

        const address = user.userAssociatedAddresses?.[0];

        if (!address) {
            throw new Error(`No associated wallet address found for user ${usernameOrFid}`);
        }

        return { address };
    } catch (error) {
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
        'Content-Type': 'application/json',
    };

    try {
        const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
        const tokenBalance = result.data?.TokenBalances?.TokenBalance?.[0];
        const tokenNft = result.data?.TokenNfts?.TokenNft?.[0];

        return {
            auctionId: address,
            auctionSupply: tokenBalance?.amount || 'N/A',
            tokenImage: tokenNft?.contentValue?.image?.original || DEFAULT_IMAGE_URL,
        };
    } catch (error) {
        throw new Error(`Moxie Data Error: ${error.message}`);
    }
}

function generateHtml(imageUrl, postUrl, buttonText = "View Auction Details", inputText = "Enter Farcaster name") {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta property="fc:frame" content="vNext">
      <meta property="fc:frame:image" content="${imageUrl}">
      <meta property="fc:frame:post_url" content="${postUrl}">
      <meta property="fc:frame:button:1" content="${buttonText}">
    </head>
    <body></body>
    </html>
    `;
}

module.exports = async (req, res) => {
    try {
        const { query } = parse(req.url, true);
        const farcasterName = query.name || DEFAULT_FID;

        let address, auctionData, imageUrl;
        try {
            ({ address } = await getUserWalletAddress(farcasterName));
            auctionData = await getMoxieAuctionData(address);
            imageUrl = auctionData.tokenImage;
        } catch (error) {
            console.error(error.message);
            imageUrl = DEFAULT_IMAGE_URL;
        }

        const postUrl = `${FALLBACK_URL}/api/auctions`;
        const html = generateHtml(imageUrl, postUrl);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.statusCode = 200;
        res.end(html);
    } catch (error) {
        res.statusCode = 500;
        res.end('Internal Server Error');
    }
};
