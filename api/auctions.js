const { init, fetchQuery } = require('@airstack/node');
const https = require('https');

const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';

// Initialize Airstack
init(process.env.AIRSTACK_API_KEY);

async function getAuctionData(fid) {
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
        const { data, error } = await fetchQuery(query, variables);
        if (error) {
            throw new Error(error.message);
        }

        // Process the data to extract relevant auction information
        // This is a placeholder implementation and should be adjusted based on your specific needs
        const tokenBalances = data.TokenBalances.TokenBalance;
        const totalValue = tokenBalances.reduce((sum, balance) => sum + parseFloat(balance.formattedAmount), 0);

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
        console.error('Error fetching auction data:', error);
        throw error;
    }
}

function generateImageUrl(auctionData, farcasterName) {
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

module.exports = async (req, res) => {
    console.log('Received request method:', req.method);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const baseHtml = (content, image, buttonText) => `
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
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(initialHtml);
    }

    if (req.method === 'POST') {
        try {
            const { untrustedData } = req.body;
            const farcasterName = untrustedData.inputText || '';

            // Fetch FID using the Farcaster name
            const fidResponse = await fetch(`https://api.farcaster.xyz/v2/user-by-username?username=${farcasterName}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${process.env.FARCASTER_API_KEY}`,
                },
            });

            if (!fidResponse.ok) {
                throw new Error('Failed to fetch FID');
            }

            const fidData = await fidResponse.json();
            const fid = fidData.result.user.fid;

            const auctionData = await getAuctionData(fid);

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

            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } catch (error) {
            console.error('Error:', error);
            const errorHtml = baseHtml(
                '<h1>Error</h1><p>Failed to fetch auction data. Please try again.</p>',
                'https://www.aaronvick.com/Moxie/11.JPG',
                'Try Again'
            );
            return res.status(200).send(errorHtml);
        }
    }

    // If the method is not supported
    return res.status(405).send('Method Not Allowed');
};
