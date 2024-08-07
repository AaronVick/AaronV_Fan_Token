const https = require('https');

const DEFAULT_FID = '354795'; // Replace with your actual FID

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                resolve(data);
            });
        }).on("error", (err) => {
            reject(err);
        });
    });
}

async function getAuctionData(fid) {
    try {
        console.log(`Fetching auction data for FID: ${fid}`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        const data = await httpsGet(`https://moxiescout.vercel.app/auction/${fid}`);
        console.log('MoxieScout response received');

        // Simple parsing, adjust as needed
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

        if (data.includes("Failed to load auction details. Please try again later.")) {
            return { error: "No Auction Data Available" };
        }

        console.log('Parsed auction data:', auctionData);
        return auctionData;
    } catch (error) {
        console.error('Error fetching auction data:', error.message);
        throw error;
    }
}

module.exports = async (req, res) => {
    console.log('Received request:', JSON.stringify(req.body));

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
                return res.status(400).json({ error: 'Invalid Farcaster name' });
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
        <meta property="fc:frame:image" content="https://www.aaronvick.com/Moxie/11.JPG">
        <meta property="fc:frame:input:text" content="Enter Farcaster name">
        <meta property="fc:frame:button:1" content="View">
        <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
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
        console.error('Error in getAuctionDetails:', error.message);
        res.status(500).json({ error: 'Failed to fetch auction data', details: error.message });
    }
};
