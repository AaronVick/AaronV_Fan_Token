const https = require('https');

const DEFAULT_FID = '354795'; // Default FID
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app'; // Replace with your actual fallback URL

// Helper functions
function httpsGet(url, headers) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: headers,
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function getAuctionData(fid) {
    // Simulate fetching auction data based on fid
    return new Promise((resolve) => {
        resolve({
            auctionId: '1234',
            auctionSupply: '100',
            clearingPrice: '50',
            status: 'active',
            startTime: '1691607000',
            endTime: '1691617000',
            totalOrders: '20',
            uniqueBidders: '10',
            totalBidValue: '500',
        });
    });
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

    // Handle different HTTP methods
    if (req.method === 'POST') {
        console.log('Handling POST request');
    } else if (req.method === 'GET') {
        console.log('Handling GET request');
        return res.status(200).send('GET method is allowed temporarily for testing');
    } else {
        console.error('Method Not Allowed:', req.method);
        return res.status(405).send('Method Not Allowed');
    }

    console.log('Received request:', JSON.stringify(req.body));
    console.log('Request headers:', JSON.stringify(req.headers));
    console.log('Environment variables:', {
        VERCEL_URL: process.env.VERCEL_URL,
        CUSTOM_URL: process.env.CUSTOM_URL,
    });

    const postUrl = getPostUrl();
    console.log('Using post URL:', postUrl);

    try {
        const { untrustedData } = req.body || {};
        const farcasterName = untrustedData?.inputText || '';

        console.log('Farcaster name:', farcasterName);

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
                    console.log(`Fetched FID: ${fid} for Farcaster name: ${farcasterName}`);
                } else {
                    throw new Error('FID not found in the response');
                }
            } catch (error) {
                console.error('Error fetching FID:', error.message);
                displayName = 'Invalid Farcaster name';
            }
        }

        console.log('Using FID:', fid);

        const auctionData = await getAuctionData(fid);

        console.log('Auction data:', auctionData);

        let content;
        if (auctionData.error) {
            content = `<p>${auctionData.error}</p>`;
        } else {
            content = `
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
        }

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Moxie Auction Details</title>
                <meta property="fc:frame" content="vNext">
                <meta property="fc:frame:image" content="${generateImageUrl(auctionData, displayName)}">
                <meta property="fc:frame:input:text" content="Enter Farcaster name">
                <meta property="fc:frame:button:1" content="View Auction Details">
                <meta property="fc:frame:post_url" content="${postUrl}/api/auctions">
            </head>
            <body>
                <h1>Auction Details for ${displayName}</h1>
                ${content}
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('Error in auctions:', error.message);
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error</title>
                <meta property="fc:frame" content="vNext">
                <meta property="fc:frame:image" content="https://www.aaronvick.com/Moxie/11.JPG">
                <meta property="fc:frame:input:text" content="Enter Farcaster name">
                <meta property="fc:frame:button:1" content="Try Again">
                <meta property="fc:frame:post_url" content="${postUrl}/api/auctions">
            </head>
            <body>
                <h1>Error</h1>
                <p>Failed to fetch auction data. Please try again.</p>
            </body>
            </html>
        `);
    }
};
