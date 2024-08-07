const axios = require('axios');
const cheerio = require('cheerio');

const DEFAULT_FID = '354795'; // Your FID - replace with your actual FID

async function getAuctionData(fid) {
    try {
        const { data } = await axios.get(`https://moxiescout.vercel.app/auction/${fid}`);
        const $ = cheerio.load(data);

        return {
            clearingPrice: $('div:contains("Clearing Price") + div').text().trim(),
            auctionSupply: $('div:contains("Auction Supply") + div').text().trim(),
            auctionStart: $('div:contains("Auction Start") + div').text().trim(),
            auctionEnd: $('div:contains("Auction End") + div').text().trim(),
            totalOrders: $('div:contains("Total Orders") + div').text().trim(),
            uniqueBidders: $('div:contains("Unique Bidders") + div').text().trim(),
            status: $('div:contains("Status") + div').text().trim(),
            totalBidValue: $('div:contains("Total Bid Value") + div').text().trim(),
        };
    } catch (error) {
        console.error('Error fetching auction data:', error);
        throw error;
    }
}

module.exports = async (req, res) => {
    const { untrustedData } = req.body;
    const farcasterName = untrustedData?.inputText;

    try {
        let fid = DEFAULT_FID;
        let displayName = 'Your Account';

        if (farcasterName && farcasterName.trim() !== '') {
            try {
                const fidResponse = await axios.get(`https://api.farcaster.xyz/v2/user-by-username?username=${farcasterName}`);
                fid = fidResponse.data.result.user.fid;
                displayName = farcasterName;
            } catch (error) {
                console.error('Error fetching FID:', error);
                return res.status(400).json({ error: 'Invalid Farcaster name' });
            }
        }

        const auctionData = await getAuctionData(fid);

        const html = `
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Moxie Auction Details</title>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="https://www.aaronvick.com/Moxie.11.jpg">
                    <meta property="fc:frame:input:text" content="Enter Farcaster name">
                    <meta property="fc:frame:button:1" content="View">
                    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
                </head>
                <body>
                    <h1>Auction Details for ${displayName}</h1>
                    <p>Clearing Price: ${auctionData.clearingPrice}</p>
                    <p>Auction Supply: ${auctionData.auctionSupply}</p>
                    <p>Auction Start: ${auctionData.auctionStart}</p>
                    <p>Auction End: ${auctionData.auctionEnd}</p>
                    <p>Total Orders: ${auctionData.totalOrders}</p>
                    <p>Unique Bidders: ${auctionData.uniqueBidders}</p>
                    <p>Status: ${auctionData.status}</p>
                    <p>Total Bid Value: ${auctionData.totalBidValue}</p>
                </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('Error in getAuctionDetails:', error);
        res.status(500).json({ error: 'Failed to fetch auction data' });
    }
};
