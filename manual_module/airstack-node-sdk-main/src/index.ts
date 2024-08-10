import fetch from 'node-fetch';
import { init, fetchQuery } from "@airstack/node";

const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';
const ERROR_IMAGE_URL = 'https://via.placeholder.com/500x300/8E55FF/FFFFFF?text=No%20Auction%20Data%20Available';

// Log to confirm the environment variable is being read
console.log('AIRSTACK_API_KEY is set:', !!process.env.AIRSTACK_API_KEY);

// Initialize Airstack SDK
init(process.env.AIRSTACK_API_KEY || '');

async function fetchFid(farcasterName: string): Promise<string> {
    console.log(`Fetching FID for Farcaster username: ${farcasterName}`);
    try {
        const response = await fetch(`https://api.warpcast.com/v2/user-by-username?username=${farcasterName}`);
        const fidJson = await response.json();

        console.log('Response from Warpcast:', fidJson);

        if (fidJson.result && fidJson.result.user && fidJson.result.user.fid) {
            console.log(`FID found: ${fidJson.result.user.fid}`);
            return fidJson.result.user.fid.toString();
        } else {
            console.error('FID not found in the response');
            throw new Error('FID not found in the response');
        }
    } catch (error) {
        console.error('Error fetching FID:', error);
        throw error;
    }
}

async function getFanTokenDataByFid(fid: string): Promise<any> {
    console.log(`Fetching Fan Token Data for FID: ${fid}`);
    try {
        const query = `
            query GetFanTokenDataByFid($fid: String, $entityTypes: [FarcasterFanTokenAuctionEntityType!], $blockchain: EveryBlockchain!, $limit: Int) {
                FarcasterFanTokenAuctions(
                    input: {filter: {entityId: {_eq: $fid}, entityType: {_in: $entityTypes}}, blockchain: $blockchain, limit: $limit}
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
            }
        `;

        const variables = {
            fid,
            entityTypes: ['MOXIE'],
            blockchain: 'ethereum',
            limit: 1,
        };

        console.log('Querying Airstack with variables:', variables);
        const response = await fetchQuery(query, variables);
        console.log('Response from Airstack API:', JSON.stringify(response, null, 2));

        const auctionData = response.data?.FarcasterFanTokenAuctions?.FarcasterFanTokenAuction?.[0];
        if (!auctionData) {
            console.warn('No Auction Data Available');
            return { error: "No Auction Data Available" };
        }
        console.log('Auction Data:', auctionData);
        return auctionData;
    } catch (error) {
        console.error('Error fetching fan token data:', error);
        return { error: "Failed to fetch auction data" };
    }
}

function generateImageUrl(auctionData: any, farcasterName: string): string {
    console.log('Generating image URL for auction data');

    if (auctionData.error) {
        console.warn('Using error image URL due to error in auction data');
        return ERROR_IMAGE_URL;
    }

    const text = `
Auction for ${farcasterName}

Clearing Price:  ${auctionData.minPriceInMoxie?.padEnd(20)}  Auction Supply:  ${auctionData.auctionSupply}
Auction Start:   ${new Date(parseInt(auctionData.estimatedStartTimestamp) * 1000).toLocaleString()}
Auction End:     ${new Date(parseInt(auctionData.estimatedEndTimestamp) * 1000).toLocaleString()}
Status:          ${auctionData.status}
    `.trim();

    try {
        const imageUrl = `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=35&weight=bold`;
        console.log('Generated image URL:', imageUrl);
        return imageUrl;
    } catch (error) {
        console.error('Error generating image URL:', error);
        throw new Error('Invalid URL generated');
    }
}

export default async function handler(req: any, res: any) {
    console.log('Received request:', JSON.stringify(req.body));

    let imageUrl = DEFAULT_IMAGE_URL;

    try {
        const { untrustedData } = req.body || {};
        const farcasterName = untrustedData?.inputText || '';

        console.log('Farcaster name from request:', farcasterName);

        let fid = '354795'; // Default FID
        if (farcasterName.trim() !== '') {
            fid = await fetchFid(farcasterName);
        }

        const auctionData = await getFanTokenDataByFid(fid);
        console.log('Auction data received:', auctionData);

        imageUrl = auctionData.error ? ERROR_IMAGE_URL : generateImageUrl(auctionData, farcasterName);

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Details</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${imageUrl}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name">
    <meta property="fc:frame:button:1" content="View">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
</head>
<body>
    <h1>Auction Details for ${farcasterName || 'Default Account'}</h1>
    <img src="${imageUrl}" alt="Auction Details" style="max-width: 100%; height: auto;">
    ${auctionData.error ? '<p>Error: ' + auctionData.error + '</p>' : ''}
</body>
</html>
        `;

        console.log('Sending HTML response');
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('Error in handler:', error);
        res.status(500).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${ERROR_IMAGE_URL}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name">
    <meta property="fc:frame:button:1" content="Try Again">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
</head>
<body>
    <h1>Error</h1>
    <p>Failed to fetch auction data. Please try again.</p>
</body>
</html>
        `);
    }
}
