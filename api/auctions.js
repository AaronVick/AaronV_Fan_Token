const url = require('url');
const fs = require('fs').promises;
const path = require('path');
const { init, fetchQuery } = require('@airstack/node');

const DEFAULT_FID = '354795';
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

// Initialize Airstack SDK
init(process.env.AIRSTACK_API_KEY);

async function readMoxieResolveData() {
    const filePath = path.join(process.cwd(), 'api', 'moxie_resolve.json');
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
}

module.exports = async (req, res) => {
    console.log('Starting auction frame handler');
    console.log('Environment variables:', Object.keys(process.env));
    console.log('AIRSTACK_API_KEY present:', !!process.env.AIRSTACK_API_KEY);

    if (!process.env.AIRSTACK_API_KEY) {
        console.error('AIRSTACK_API_KEY is not set in the environment variables');
        return res.status(500).send(generateHtml(generateErrorImageUrl(new Error('Server configuration error: API key not set'), null), 'Try Again', 'Enter Farcaster name or FID', req.headers.host));
    }

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
            imageUrl = generateErrorImageUrl(error, error.userData);
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
    let userData;

    if (input.trim() === '') {
        // Use default FID
        userData = moxieResolveData.find(item => item.fid === parseInt(DEFAULT_FID));
    } else {
        // Search by profileName or FID
        userData = moxieResolveData.find(item => 
            item.profileName === input || item.fid === parseInt(input)
        );
    }

    if (!userData) {
        return { imageUrl: generateProfileNotFoundImage(input) };
    }

    try {
        const auctionData = await getMoxieAuctionData(userData.fid);
        return { imageUrl: generateAuctionImageUrl(auctionData, userData.profileName || 'Unknown User') };
    } catch (error) {
        console.error('Error fetching Moxie auction data:', error);
        error.userData = userData; // Attach userData to the error for better error reporting
        throw error;
    }
}

function generateProfileNotFoundImage(input) {
    const text = `Profile Not Found: ${input || 'No input provided'}`;
    return `https://via.placeholder.com/1000x600/FF0000/FFFFFF?text=${encodeURIComponent(text)}`;
}

function generateErrorImageUrl(error, userData) {
    const errorText = `
Error: ${error.message}

Moxie Resolve Data:
FID: ${userData?.fid || 'N/A'}
Profile Name: ${userData?.profileName || 'N/A'}
Address: ${userData?.address || 'N/A'}
    `.trim();

    return `https://via.placeholder.com/1000x600/FF0000/FFFFFF?text=${encodeURIComponent(errorText)}&font=monospace&size=18&weight=bold`;
}

function safeStringify(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (error) {
        return `[Error serializing object: ${error.message}]`;
    }
}

async function getMoxieAuctionData(fid) {
    const query = `
    query GetFanTokenDataByFid($fid: String!) {
        FarcasterFanTokenAuctions(
            input: {filter: {entityId: {_eq: $fid}, entityType: {_in: [USER, CHANNEL]}}, blockchain: ALL, limit: 1}
        ) {
            FarcasterFanTokenAuction {
                auctionId
                auctionSupply
                decimals
                entityId
                entityName
                entitySymbol
                estimatedEndTimestamp
                estimatedStartTimestamp
                minBiddingAmount
                minPriceInMoxie
                subjectAddress
                status
            }
        }
        FarcasterMoxieClaimDetails(input: {filter: {}, blockchain: ALL})
    }
    `;
    
    const variables = { fid: `fc_fid:${fid}` };

    try {
        console.log('Attempting to fetch Moxie auction data...');
        const { data, error } = await fetchQuery(query, variables);
        console.log('Moxie auction data result:', safeStringify(data));
        
        if (error) {
            throw new Error(`Airstack API Error: ${error.message}`);
        }
        
        if (!data || !data.FarcasterFanTokenAuctions || data.FarcasterFanTokenAuctions.FarcasterFanTokenAuction.length === 0) {
            throw new Error('No Moxie auction data found');
        }
        
        const auctionData = data.FarcasterFanTokenAuctions.FarcasterFanTokenAuction[0];
        return auctionData;
    } catch (error) {
        console.error('Error in getMoxieAuctionData:', error);
        throw error;
    }
}

function generateAuctionImageUrl(auctionData, profileName) {
    console.log('Generating auction image URL for:', profileName, 'with data:', safeStringify(auctionData));
    const text = `
Auction for ${profileName}

Auction ID: ${(auctionData.auctionId || 'N/A').slice(0, 10)}...
Entity: ${auctionData.entityName || 'N/A'}
Status: ${auctionData.status || 'N/A'}
Supply: ${auctionData.auctionSupply || 'N/A'}
Min Price: ${auctionData.minPriceInMoxie || 'N/A'} MOXIE
End Time: ${new Date(parseInt(auctionData.estimatedEndTimestamp) * 1000).toLocaleString() || 'N/A'}
    `.trim();

    const imageUrl = `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=24&weight=bold`;
    console.log('Generated auction image URL:', imageUrl);
    return imageUrl;
}
