// ... (keep the existing imports and functions)

module.exports = async (req, res) => {
    console.log('Received request:', JSON.stringify(req.body));
    console.log('Request headers:', JSON.stringify(req.headers));

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

        const host = req.headers.host || 'aaron-v-fan-token.vercel.app';
        const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Moxie Auction Details</title>
        <meta property="fc:frame" content="vNext">
        <meta property="fc:frame:image" content="https://www.aaronvick.com/Moxie/11.JPG">
        <meta property="fc:frame:input:text" content="Enter Farcaster name (optional)">
        <meta property="fc:frame:button:1" content="View">
        <meta property="fc:frame:post_url" content="https://${host}/api/getAuctionDetails">
    </head>
    <body>
        <h1>Auction Details for ${displayName}</h1>
        ${content}
    </body>
    </html>
    `;

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).send(html);

        console.log('Response sent:', html);
    } catch (error) {
        console.error('Error in getAuctionDetails:', error.message);
        res.status(500).json({ error: 'Failed to fetch auction data', details: error.message });
    }
};
