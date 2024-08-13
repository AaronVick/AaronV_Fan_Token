const url = require('url');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/graphql';
const DEFAULT_FID = '354795';
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

async function readMoxieResolveData() {
    const filePath = path.join(process.cwd(), 'api', 'moxie_resolve.json');
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
}

module.exports = async (req, res) => {
    console.log('Received request method:', req.method);
    console.log('Request headers:', safeStringify(req.headers));
    console.log('Request body:', safeStringify(req.body));

    const host = req.headers.host || FALLBACK_URL;
    let imageUrl = DEFAULT_IMAGE_URL;
    let buttonText = "View Auction Details";
    let inputText = "Enter Farcaster name or FID";

    if (req.method === 'POST') {
        console.log('Handling POST request');
        try {
            const input = req.body?.untrustedData?.inputText || '';
            const result = await handlePostRequest(input);
            imageUrl = result.imageUrl;
            buttonText = "Check Another Auction";
        } catch (error) {
            console.error('Error handling POST request:', error);
            imageUrl = generateErrorImageUrl(error);
            buttonText = "Try Again";
        }
    }

    const postUrl = `https://${host}/api/auctions`;
    console.log('Final image URL before generating HTML:', imageUrl);
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

async function handlePostRequest(input) {
    console.log('Handling post request with input:', input);
    const moxieResolveData = await readMoxieResolveData();
    let address;

    if (input.trim() === '') {
        // Use default FID
        address = moxieResolveData.find(item => item.fid === parseInt(DEFAULT_FID))?.address;
    } else {
        // Search by profileName or FID
        const searchItem = moxieResolveData.find(item => 
            item.profileName === input || item.fid === parseInt(input)
        );
        address = searchItem?.address;
    }

    if (!address) {
        return { imageUrl: generateProfileNotFoundImage() };
    }

    try {
        const auctionData = await getMoxieAuctionData(address);
        return { imageUrl: generateAuctionImageUrl(auctionData, input || 'Default User') };
    } catch (error) {
        console.error('Error fetching Moxie auction data:', error);
        return { imageUrl: generateErrorImageUrl(error) };
    }
}

function generateProfileNotFoundImage() {
    return `https://via.placeholder.com/1000x600/FF0000/FFFFFF?text=${encodeURIComponent('No Profile Found')}`;
}

function generateErrorImageUrl(error) {
    const errorText = `Error: ${error.message}`;
    return `https://via.placeholder.com/1000x600/FF0000/FFFFFF?text=${encodeURIComponent(errorText)}`;
}

function safeStringify(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (error) {
        return `[Error serializing object: ${error.message}]`;
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

async function getMoxieAuctionData(address) {
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
                input: {filter: {tokenAddress: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: base, limit: 1}
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
    const variables = { identity: address };

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
            auctionId: address,
            auctionSupply: tokenBalance?.amount || 'N/A',
            tokenImage: tokenNft?.contentValue?.image?.original || DEFAULT_IMAGE_URL,
            totalBidValue: tokenBalance?.formattedAmount || 'N/A',
        };
    } catch (error) {
        console.error('Error in getMoxieAuctionData:', error);
        throw error;
    }
}

function generateAuctionImageUrl(auctionData, profileName) {
    console.log('Generating auction image URL for:', profileName, 'with data:', safeStringify(auctionData));
    const text = `
Auction for ${profileName}

Auction ID:     ${(auctionData.auctionId || 'N/A').slice(0, 10)}...
Auction Supply: ${(auctionData.auctionSupply || 'N/A').padEnd(20)}
Total Bid Value:${(auctionData.totalBidValue || 'N/A').padEnd(20)}
    `.trim();

    const imageUrl = `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=30&weight=bold`;
    console.log('Generated auction image URL:', imageUrl);
    return imageUrl;
}
