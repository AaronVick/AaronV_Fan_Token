const https = require('https');
const url = require('url');

const DEFAULT_FID = '354795'; // Replace with your actual default FID

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
    const text = [
        `Auction for ${displayName}`,
        `Clearing Price: ${auctionData.clearingPrice}`,
        `Auction Supply: ${auctionData.auctionSupply}`,
        `Status: ${auctionData.status}`,
        `Total Bid Value: ${auctionData.totalBidValue}`,
        `Total Orders: ${auctionData.totalOrders}`,
        `Unique Bidders: ${auctionData.uniqueBidders}`
    ].join('|');
    return `https://via.placeholder.com/800x400/1e3a8a/ffffff?text=${encodeURIComponent(text.replace(/\|/g, '%0A'))}`;
}

module.exports = async (req, res) => {
    console.log('Received request:', req.method, req.url);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);

    const defaultImageUrl = 'https://www.aaronvick.com/Moxie/11.JPG';

    if (req.method === 'GET') {
        console.log('Serving initial frame');
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Frame</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${defaultImageUrl}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name (optional)">
    <meta property="fc:frame:button:1" content="View Auction Details">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
</head>
<body>
    <h1>Welcome to Moxie Auction Frame</h1>
    <p>Enter a Farcaster name or click the button to view auction details.</p>
    <img src="${defaultImageUrl}" alt="Moxie Auction Frame" style="max-width: 100%; height: auto;">
</body>
</html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    } else if (req.method === 'POST') {
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
                    fid = null; // Set FID to null to indicate lookup failure
                }
            }

            console.log('Using FID:', fid);

            let auctionData;
            if (fid) {
                auctionData = await getAuctionData(fid);
            } else {
                auctionData = { error: "Invalid Farcaster name. Unable to fetch auction data." };
            }

            console.log('Auction data:', auctionData);

            const imageUrl = generateImageUrl(auctionData, displayName);
            console.log('Generated image URL:', imageUrl);

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
                    <meta property="fc:frame:button:1" content="View Auction Details">
                    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
                </head>
                <body>
                    <h1>Auction Details for ${displayName}</h1>
                    <img src="${imageUrl}" alt="Auction Details" style="max-width: 100%; height: auto;">
                </body>
                </html>
            `;

            console.log('Sending final response HTML');
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(html);
        } catch (error) {
            console.error('Error in getAuctionDetails:', error.message);
            const errorImageUrl = `https://via.placeholder.com/800x400/1e3a8a/ffffff?text=${encodeURIComponent("Error: Failed to fetch auction data. Please try again.")}`;
            res.status(500).send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Error</title>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="${errorImageUrl}">
                    <meta property="fc:frame:input:text" content="Enter Farcaster name">
                    <meta property="fc:frame:button:1" content="Try Again">
                    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
                </head>
                <body>
                    <h1>Error</h1>
                    <p>Failed to fetch auction data. Please try again.</p>
                </body>
                </html>
            `);
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
