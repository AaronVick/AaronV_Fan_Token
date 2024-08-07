const https = require('https');

const DEFAULT_FID = '354795'; // Replace with your actual FID

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
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
        console.log('MoxieScout response received');

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

module.exports = async (req, res) => {
    console.log('Received request:', req.method, req.url);
    console.log('Request body:', req.body);

    const imageUrl = 'https://www.aaronvick.com/Moxie/11.JPG';

    if (req.method === 'GET') {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Frame</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${imageUrl}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name (optional)">
    <meta property="fc:frame:button:1" content="View Auction Details">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
</head>
<body>
    <h1>Welcome to Moxie Auction Frame</h1>
    <p>Enter a Farcaster name or click the button to view auction details.</p>
    <img src="${imageUrl}" alt="Moxie Auction Frame" style="max-width: 100%; height: auto;">
</body>
</html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    }

    if (req.method === 'POST') {
        try {
            const { untrustedData } = req.body || {};
            const farcasterName = untrustedData?.inputText || '';

            console.log('Farcaster name:', farcasterName);

            let fid = DEFAULT_FID;
            let displayName = 'Your Account';

            if (farcasterName.trim() !== '') {
                try {
                    const fidData = await httpsGet(`https://api.farcaster.xyz/v2/user-by-username?username=${farcasterName}`);
                    const fidJson = JSON.parse(fidData);
                    fid = fidJson.result.user.fid;
                    displayName = farcasterName;
                } catch (error) {
                    console.error('Error fetching FID:', error.message);
                    displayName = 'Invalid Farcaster name';
                }
            }

            console.log('FID:', fid);

            const auctionData = await getAuctionData(fid);

            console.log('Auction data:', auctionData);

            let content;
            if (auctionData.error) {
                content = `<p>${auctionData.error}</p>`;
            } else {
                content = `
                    <p>Clearing Price: ${auctionData.clearingPrice}</p>
                    <p>Auction Supply: ${auctionData.auctionSupply}</p>
                    <p>Auction Start: ${auctionData.auctionStart}</p>
                    <p>Auction End: ${auctionData.auctionEnd}</p>
                    <p>Total Orders: ${auctionData.totalOrders}</p>
                    <p>Unique Bidders: ${auctionData.uniqueBidders}</p>
                    <p>Status: ${auctionData.status}</p>
                    <p>Total Bid Value: ${auctionData.totalBidValue}</p>
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
                    <meta property="fc:frame:image" content="${imageUrl}">
                    <meta property="fc:frame:input:text" content="Enter Farcaster name">
                    <meta property="fc:frame:button:1" content="View">
                    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
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
            console.error('Error in getAuctionDetails:', error.message);
            const errorHtml = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Error</title>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="${imageUrl}">
                    <meta property="fc:frame:input:text" content="Enter Farcaster name">
                    <meta property="fc:frame:button:1" content="Try Again">
                    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
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

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
};
