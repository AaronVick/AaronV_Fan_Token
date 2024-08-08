const https = require('https');
const url = require('url');
const { getAuctionData } = require('./getAuctionDetails');

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

function generateImageUrl(auctionData, displayName) {
    let text;
    if (auctionData.error) {
        text = `Error: ${auctionData.error}`;
    } else {
        text = `
Auction for ${displayName}

Clearing Price:  ${auctionData.clearingPrice.padEnd(20)}  Total Orders:    ${auctionData.totalOrders}
Auction Supply:  ${auctionData.auctionSupply.padEnd(20)}  Unique Bidders:  ${auctionData.uniqueBidders}
Auction Start:   ${auctionData.auctionStart.padEnd(20)}  Status:          ${auctionData.status}
Auction End:     ${auctionData.auctionEnd.padEnd(20)}  Total Bid Value: ${auctionData.totalBidValue}
        `.trim();
    }

    const encodedText = encodeURIComponent(text);
    console.log('Encoded text for image URL:', encodedText);
    return `https://via.placeholder.com/1000x600/1e3a8a/ffffff?text=${encodedText}&font=monospace&size=35`;
}

module.exports = async (req, res) => {
    console.log('Received request:', req.method, req.url);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const defaultImageUrl = 'https://www.aaronvick.com/Moxie/11.JPG';

    if (req.method === 'GET') {
        console.log('Serving initial frame');
        console.log('Initial frame image URL:', defaultImageUrl);
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
                    console.log('FarQuest API Key:', process.env.FarQuestAPI ? 'Set' : 'Not set');
                    console.log('Fetching FID for:', farcasterName);
                    const fidUrl = `https://build.far.quest/farcaster/v2/user-by-username?username=${encodeURIComponent(farcasterName)}`;
                    console.log('FarQuest API URL:', fidUrl);
                    const fidData = await httpsGet(fidUrl, headers);
                    console.log('FarQuest raw response:', fidData);
                    const fidJson = JSON.parse(fidData);
                    console.log('FarQuest parsed response:', JSON.stringify(fidJson, null, 2));
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

            console.log('Final auction data:', auctionData);

            let imageUrl = generateImageUrl(auctionData, displayName);
            console.log('Generated image URL:', imageUrl);

            // Verify the image URL is valid
            try {
                new URL(imageUrl);
                console.log('Image URL is valid');
            } catch (error) {
                console.error('Invalid image URL:', error.message);
                imageUrl = defaultImageUrl; // Fallback to default image if URL is invalid
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
                    <meta property="fc:frame:button:1" content="View Auction Details">
                    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
                </head>
                <body>
                    <h1>Auction Details for ${displayName}</h1>
                    <img src="${imageUrl}" alt="Auction Details" style="max-width: 100%; height: auto;">
                </body>
                </html>
            `;

            console.log('Final HTML fc:frame:image content:', imageUrl);
            console.log('Sending final response HTML');
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } catch (error) {
            console.error('Error in getAuctionDetails:', error.message);
            const errorImageUrl = generateImageUrl({ error: error.message }, 'Error');
            return res.status(200).send(`
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
