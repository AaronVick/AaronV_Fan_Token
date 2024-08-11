import { init, fetchQuery } from '@airstack/node';
import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';

// Initialize Airstack
init(process.env.AIRSTACK_API_KEY);

console.log('Airstack initialized with API key:', process.env.AIRSTACK_API_KEY ? 'Present' : 'Missing');

async function getAuctionData(fid: string) {
    console.log('Fetching auction data for FID:', fid);
    const query = `
    query GetTokenHoldings($identity: Identity!) {
      TokenBalances(
        input: {filter: {owner: {_eq: $identity}}, blockchain: ethereum, limit: 50}
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

    const variables = {
        identity: `fc_fid:${fid}`,
    };

    try {
        console.log('Executing Airstack query');
        const { data, error } = await fetchQuery(query, variables);
        if (error) {
            console.error('Airstack query error:', error);
            throw new Error(error.message);
        }
        console.log('Airstack query successful');

        // Process the data to extract relevant auction information
        const tokenBalances = data.TokenBalances.TokenBalance;
        const totalValue = tokenBalances.reduce((sum: number, balance: any) => sum + parseFloat(balance.formattedAmount), 0);

        console.log('Processed auction data:', { tokenBalances: tokenBalances.length, totalValue });

        return {
            auctionId: fid,
            auctionSupply: tokenBalances.length.toString(),
            clearingPrice: totalValue.toFixed(2),
            status: 'active',
            startTime: Date.now().toString(),
            endTime: (Date.now() + 86400000).toString(), // 24 hours from now
            totalOrders: tokenBalances.length.toString(),
            uniqueBidders: '1', // Placeholder
            totalBidValue: totalValue.toFixed(2),
        };
    } catch (error) {
        console.error('Error in getAuctionData:', error);
        throw error;
    }
}

function generateImageUrl(auctionData: any, farcasterName: string) {
    const text = `
Auction for ${farcasterName}

Clearing Price:  ${auctionData.clearingPrice?.padEnd(20)}  Auction Supply:  ${auctionData.auctionSupply}
Auction Start:   ${new Date(parseInt(auctionData.startTime)).toLocaleString()}
Auction End:     ${new Date(parseInt(auctionData.endTime)).toLocaleString()}
Status:          ${auctionData.status}
    `.trim();

    return `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=35&weight=bold`;
}

function getPostUrl() {
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    } else if (process.env.CUSTOM_URL) {
        return process.env.CUSTOM_URL;
    }
    return FALLBACK_URL;
}

export default async (req: VercelRequest, res: VercelResponse) => {
    console.log('Received request method:', req.method);
    console.log('Request body:', JSON.stringify(req.body));

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const baseHtml = (content: string, image: string, buttonText: string) => `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Moxie Auction Details</title>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${image}">
            <meta property="fc:frame:post_url" content="${getPostUrl()}">
            <meta property="fc:frame:input:text" content="Enter Farcaster name">
            <meta property="fc:frame:button:1" content="${buttonText}">
            <meta property="og:title" content="Moxie Auction Details">
        </head>
        <body>
            ${content}
        </body>
        </html>
    `;

    const initialHtml = baseHtml(
        '<h1>Moxie Auction Frame</h1><p>Enter a Farcaster name to view auction details.</p>',
        'https://www.aaronvick.com/Moxie/11.JPG',
        'View Auction Details'
    );

    if (req.method === 'GET' || !req.body?.untrustedData?.inputText) {
        console.log('Sending initial HTML');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(initialHtml);
    }

    if (req.method === 'POST') {
        try {
            console.log('Processing POST request');
            const { untrustedData } = req.body;
            const farcasterName = untrustedData.inputText || '';
            console.log('Farcaster name:', farcasterName);

            // Fetch FID using the Farcaster name
            console.log('Fetching FID from Farcaster API');
            const fidResponse = await fetch(`https://api.farcaster.xyz/v2/user-by-username?username=${farcasterName}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${process.env.FARCASTER_API_KEY}`,
                },
            });

            if (!fidResponse.ok) {
                console.error('Failed to fetch FID. Status:', fidResponse.status);
                console.error('Response:', await fidResponse.text());
                throw new Error('Failed to fetch FID');
            }

            const fidData = await fidResponse.json();
            console.log('FID data:', fidData);
            const fid = fidData.result.user.fid;
            console.log('Fetched FID:', fid);

            const auctionData = await getAuctionData(fid);
            console.log('Auction data:', auctionData);

            const content = `
                <h1>Auction Details for ${farcasterName}</h1>
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <p>Clearing Price: ${auctionData.clearingPrice || 'N/A'}</p>
                        <p>Auction Supply: ${auctionData.auctionSupply || 'N/A'}</p>
                        <p>Auction Start: ${new Date(parseInt(auctionData.startTime)).toLocaleString()}</p>
                        <p>Auction End: ${new Date(parseInt(auctionData.endTime)).toLocaleString()}</p>
                    </div>
                    <div>
                        <p>Total Orders: ${auctionData.totalOrders || 'N/A'}</p>
                        <p>Unique Bidders: ${auctionData.uniqueBidders || 'N/A'}</p>
                        <p>Status: ${auctionData.status || 'N/A'}</p>
                        <p>Total Bid Value: ${auctionData.totalBidValue || 'N/A'}</p>
                    </div>
                </div>
            `;

            const html = baseHtml(content, generateImageUrl(auctionData, farcasterName), 'Check Another Auction');

            console.log('Sending response HTML');
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } catch (error) {
            console.error('Error in POST handler:', error);
            const errorHtml = baseHtml(
                '<h1>Error</h1><p>Failed to fetch auction data. Please try again.</p>',
                'https://www.aaronvick.com/Moxie/11.JPG',
                'Try Again'
            );
            return res.status(200).send(errorHtml);
        }
    }

    // If the method is not supported
    console.log('Unsupported method:', req.method);
    return res.status(405).send('Method Not Allowed');
};
