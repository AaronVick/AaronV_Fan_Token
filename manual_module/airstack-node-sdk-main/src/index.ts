import { init, fetchQuery } from "@airstack/node";
import fetch from 'node-fetch';

const BASE_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';
const ERROR_IMAGE_URL = 'https://via.placeholder.com/500x300/1e3a8a/ffffff?text=No%20Auction%20Data%20Available';

// Initialize Airstack SDK
init(process.env.AIRSTACK_API_KEY || '');

async function fetchFid(farcasterName: string): Promise<string> {
    try {
        const response = await fetch(`https://api.warpcast.com/v2/user-by-username?username=${farcasterName}`);
        const fidJson = await response.json();

        if (fidJson.result && fidJson.result.user && fidJson.result.user.fid) {
            return fidJson.result.user.fid.toString();
        } else {
            throw new Error('FID not found in the response');
        }
    } catch (error) {
        console.error('Error fetching FID:', error);
        throw error;
    }
}

async function getFanTokenDataByFid(fid: string) {
    try {
        const query = `
            query GetAuctionDetailsForFID($fid: String!) {
              FarcasterFanTokenAuctions(
                input: {filter: {entityId: {_eq: $fid}, entityType: {_in: [USER, CHANNEL, NETWORK]}}, blockchain: ALL, limit: 1}
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

        const variables = { fid };

        const response = await fetchQuery(query, variables);
        console.log('Airstack API Response:', JSON.stringify(response, null, 2));

        const auctionData = response.data?.FarcasterFanTokenAuctions?.FarcasterFanTokenAuction?.[0];
        if (!auctionData) {
            return { error: "No Auction Data Available" };
        }
        return auctionData;
    } catch (error) {
        console.error('Error fetching fan token data:', error);
        return { error: "Failed to fetch auction data" };
    }
}

function generateImageUrl(auctionData: any, farcasterName: string): string {
    if (auctionData.error) {
        return ERROR_IMAGE_URL;
    }

    const text = `
Auction for ${farcasterName}

Clearing Price:  ${auctionData.minPriceInMoxie?.padEnd(20)}  Auction Supply:  ${auctionData.auctionSupply}
Auction Start:   ${new Date(parseInt(auctionData.estimatedStartTimestamp) * 1000).toLocaleString()}
Auction End:     ${new Date(parseInt(auctionData.estimatedEndTimestamp) * 1000).toLocaleString()}
Status:          ${auctionData.status}
    `.trim();

    return `https://via.placeholder.com/1000x600/1e3a8a/ffffff?text=${encodeURIComponent(text)}&font=monospace&size=35`;
}

export default async function handler(req: any, res: any) {
    console.log(`Received ${req.method} request:`, JSON.stringify(req.body, null, 2));

    if (req.method === 'GET') {
        return res.status(200).send(generateFrameHtml(DEFAULT_IMAGE_URL));
    }

    try {
        const { untrustedData } = req.body || {};
        const farcasterName = untrustedData?.inputText || '';
        console.log(`Farcaster name input: ${farcasterName}`);

        let fid = await fetchFid(farcasterName);
        console.log(`Using FID: ${fid}`);

        const auctionData = await getFanTokenDataByFid(fid);
        console.log('Auction data:', JSON.stringify(auctionData, null, 2));

        const imageUrl = auctionData.error ? ERROR_IMAGE_URL : generateImageUrl(auctionData, farcasterName);
        console.log(`Generated image URL: ${imageUrl}`);

        return res.status(200).send(generateFrameHtml(imageUrl));
    } catch (error) {
        console.error('Error in handler:', error);
        return res.status(500).send(generateErrorFrameHtml(error.message));
    }
}

function generateFrameHtml(imageUrl: string): string {
    return `
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
    <meta property="fc:frame:post_url" content="${BASE_URL}/api/frame">
</head>
<body>
    <h1>Moxie Auction Details</h1>
    <img src="${imageUrl}" alt="Auction Details" style="max-width: 100%; height: auto;">
</body>
</html>
    `;
}

function generateErrorFrameHtml(errorMessage: string): string {
    return `
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
    <meta property="fc:frame:post_url" content="${BASE_URL}/api/frame">
</head>
<body>
    <h1>Error</h1>
    <p>Failed to fetch auction data. Please try again.</p>
    <p>Error details: ${errorMessage}</p>
</body>
</html>
    `;
}
