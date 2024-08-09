import https from 'https';
import { init, fetchQuery } from './manual_module/airstack-node-sdk-main/src';

const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';
const ERROR_IMAGE_URL = 'https://via.placeholder.com/500x300/1e3a8a/ffffff?text=No%20Auction%20Data%20Available';

function fetch(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function fetchFid(farcasterName: string): Promise<string> {
    try {
        const fidJson = await fetch(`https://api.warpcast.com/v2/user-by-username?username=${farcasterName}`);

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
    // Initialize Airstack SDK here, just before using it
    init(process.env.AIRSTACK_API_KEY || '');

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
            fid: fid,
            entityTypes: ['MOXIE'],
            blockchain: 'ethereum',
            limit: 1,
        };

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
    console.log('Received request:', JSON.stringify(req.body));

    let imageUrl = DEFAULT_IMAGE_URL;

    // Only process the request if it's a POST request (button press)
    if (req.method === 'POST') {
        try {
            const { untrustedData } = req.body || {};
            const farcasterName = untrustedData?.inputText || '';

            let fid = '354795'; // Default FID
            if (farcasterName.trim() !== '') {
                fid = await fetchFid(farcasterName);
            }

            const auctionData = await getFanTokenDataByFid(fid);
            console.log('Auction data:', auctionData);

            imageUrl = auctionData.error ? ERROR_IMAGE_URL : generateImageUrl(auctionData, farcasterName);
        } catch (error) {
            console.error('Error in handler:', error);
            imageUrl = ERROR_IMAGE_URL;
        }
    }

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
    <h1>Moxie Auction Details</h1>
    <img src="${imageUrl}" alt="Auction Details" style="max-width: 100%; height: auto;">
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
