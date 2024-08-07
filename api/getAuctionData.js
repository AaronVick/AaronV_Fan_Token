const axios = require('axios');
const cheerio = require('cheerio');

const DEFAULT_FID = '354795'; // Your FID

async function getAuctionData(fid) {
    const { data } = await axios.get(`https://moxiescout.vercel.app/auction/${fid}`);
    const $ = cheerio.load(data);

    return {
        clearingPrice: $('div:contains("Clearing Price") + div').text().trim(),
        auctionSupply: $('div:contains("Auction Supply") + div').text().trim(),
        status: $('div:contains("Status") + div').text().trim(),
        totalBidValue: $('div:contains("Total Bid Value") + div').text().trim(),
    };
}

module.exports = async (req, res) => {
    const { untrustedData } = req.body;
    const farcasterName = untrustedData.inputText;

    try {
        let fid = DEFAULT_FID;
        let displayName = 'Your Account';

        if (farcasterName && farcasterName.trim() !== '') {
            const fidResponse = await axios.get(`https://api.farcaster.xyz/v2/user-by-username?username=${farcasterName}`);
            fid = fidResponse.data.result.user.fid;
            displayName = farcasterName;
        }

        const auctionData = await getAuctionData(fid);

        // Generate the image URL with the auction data
        const imageUrl = `https://your-domain.com/generate-auction-image?name=${encodeURIComponent(displayName)}&price=${encodeURIComponent(auctionData.clearingPrice)}&supply=${encodeURIComponent(auctionData.auctionSupply)}&status=${encodeURIComponent(auctionData.status)}&value=${encodeURIComponent(auctionData.totalBidValue)}`;

        const html = `
            <html>
                <head>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="${imageUrl}">
                    <meta property="fc:frame:input:text" content="Enter Farcaster name">
                    <meta property="fc:frame:button:1" content="View">
                    <meta property="fc:frame:post_url" content="https://your-vercel-domain.com/api/getAuctionDetails">
                </head>
                <body>
                    <h1>Auction Details for ${displayName}</h1>
                    <p>Clearing Price: ${auctionData.clearingPrice}</p>
                    <p>Auction Supply: ${auctionData.auctionSupply}</p>
                    <p>Status: ${auctionData.status}</p>
                    <p>Total Bid Value: ${auctionData.totalBidValue}</p>
                </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch auction data' });
    }
};
