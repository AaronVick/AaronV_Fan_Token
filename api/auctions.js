const https = require('https');
const url = require('url');

const DEFAULT_FID = '354795'; // Default FID
const VERCEL_URL = 'https://aaron-v-fan-token.vercel.app';

function httpsGet(urlString, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = url.parse(urlString);
        options.headers = headers;
        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function getAuctionData(fid) {
    try {
        console.log(`Fetching auction data for FID: ${fid}`);
        const data = await httpsGet(`https://moxiescout.vercel.app/auction/${fid}`);
        console.log('MoxieScout response received:', data);

        if (data.includes("Failed to load auction details. Please try again later.")) {
            console.log('No auction data available');
            return { error: "No Auction Data Available" };
        }

        const auctionData = {
            clearingPrice: data.match(/Clearing Price<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            auctionSupply: data.match(/Auction Supply<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            auctionStart: data.match(/Auction Start<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            auctionEnd: data.match(/Auction End<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            totalOrders: data.match(/Total Orders<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            uniqueBidders: data.match(/Unique Bidders<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            status: data.match(/Status<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            totalBidValue: data.match(/Total Bid Value<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
        };

        console.log('Parsed auction data:', auctionData);
        return auctionData;
    } catch (error) {
        console.error('Error fetching auction data:', error.message);
        return { error: "Failed to fetch auction data" };
    }
}

function generateImageUrl(auctionData, displayName) {
    const text = `Auction for ${displayName}%0AClearing Price: ${auctionData.clearingPrice}%0AAuction Supply: ${auctionData.auctionSupply}%0AStatus: ${auctionData.status}%0ATotal Bid Value: ${auctionData.totalBidValue}`;
    return `https://via.placeholder.com/500x300/1e3a8a/ffffff?text=${encodeURIComponent(text)}`;
}

module.exports = async (req, res) => {
    console.log('Received request:', JSON.stringify(req.body));

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
                    'accept': 'application/json'
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
                        <p>Auction Start: ${auctionData.auctionStart || 'N/A'}</p>
                        <p>Auction End: ${auctionData.auctionEnd || 'N/A'}</p>
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
                <meta property="fc:frame:post_url" content="${VERCEL_URL}/api/auctions">
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
                <meta property="fc:frame:post_url" content="${VERCEL_URL}/api/auctions">
            </head>
            <body>
                <h1>Error</h1>
                <p>Failed to fetch auction data. Please try again.</p>
            </body>
            </html>
        `);
    }
};
