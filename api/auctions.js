const https = require('https');

const DEFAULT_FID = '354795';
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';

function httpsGet(urlString, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: headers,
        };
        https.get(urlString, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function getAuctionData(fid) {
    return {
        auctionId: '1234',
        auctionSupply: '100',
        clearingPrice: '50',
        status: 'active',
        startTime: '1691607000',
        endTime: '1691617000',
        totalOrders: '20',
        uniqueBidders: '10',
        totalBidValue: '500',
    };
}

function generateImageUrl(auctionData, farcasterName) {
    const text = `
Auction for ${farcasterName}

Clearing Price:  ${auctionData.clearingPrice?.padEnd(20)}  Auction Supply:  ${auctionData.auctionSupply}
Auction Start:   ${new Date(parseInt(auctionData.startTime) * 1000).toLocaleString()}
Auction End:     ${new Date(parseInt(auctionData.endTime) * 1000).toLocaleString()}
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

    if (req.method === 'GET') {
        const initialHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Moxie Auction Details</title>
                <meta property="fc:frame" content="vNext">
                <meta property="fc:frame:image" content="https://www.aaronvick.com/Moxie/11.JPG">
                <meta property="fc:frame:post_url" content="${getPostUrl()}/api/auctions">
            </head>
            <body>
                <h1>Moxie Auction Frame</h1>
                <p>Enter a Farcaster name to view auction details.</p>
            </body>
            </html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(initialHtml);
    }

    if (req.method === 'POST') {
        try {
            const { untrustedData } = req.body || {};
            const farcasterName = untrustedData?.inputText || '';

            let fid = DEFAULT_FID;
            let displayName = 'Default Account';

            if (farcasterName.trim() !== '') {
                try {
                    const headers = {
                        'API-KEY': process.env.FarQuestAPI,
                        'accept': 'application/json',
                    };
                    const fidData = await httpsGet(`https://build.far.quest/farcaster/v2/user-by-username?username=${farcasterName}`, headers);
                    const fidJson = JSON.parse(fidData);
                    if (fidJson.result && fidJson.result.user && fidJson.result.user.fid) {
                        fid = fidJson.result.user.fid;
                        displayName = farcasterName;
                    } else {
                        throw new Error('FID not found in the response');
                    }
                } catch (error) {
                    displayName = 'Invalid Farcaster name';
                }
            }

            const auctionData = await getAuctionData(fid);

            const content = `
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <p>Clearing Price: ${auctionData.clearingPrice || 'N/A'}</p>
                        <p>Auction Supply: ${auctionData.auctionSupply || 'N/A'}</p>
                        <p>Auction Start: ${auctionData.startTime || 'N/A'}</p>
                        <p>Auction End: ${auctionData.endTime || 'N/A'}</p>
                    </div>
                    <div>
                        <p>Total Orders: ${auctionData.totalOrders || 'N/A'}</p>
                        <p>Unique Bidders: ${auctionData.uniqueBidders || 'N/A'}</p>
                        <p>Status: ${auctionData.status || 'N/A'}</p>
                        <p>Total Bid Value: ${auctionData.totalBidValue || 'N/A'}</p>
                    </div>
                </div>
            `;

            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Moxie Auction Details</title>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="${generateImageUrl(auctionData, displayName)}">
                    <meta property="fc:frame:post_url" content="${getPostUrl()}/api/auctions">
                </head>
                <body>
                    <h1>Auction Details for ${displayName}</h1>
                    ${content}
                </body>
                </html>
            `;

            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } catch (error) {
            const errorHtml = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Error</title>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="https://www.aaronvick.com/Moxie/11.JPG">
                    <meta property="fc:frame:post_url" content="${getPostUrl()}/api/auctions">
                </head>
                <body>
                    <h1>Error</h1>
                    <p>Failed to fetch auction data. Please try again.</p>
                </body>
                </html>
            `;
            return res.status(500).send(errorHtml);
        }
    }

    // If the method is not supported
    return res.status(405).send('Method Not Allowed');
};
