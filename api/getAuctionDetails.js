const axios = require('axios');
const cheerio = require('cheerio');

async function getAuctionData(fid) {
    try {
        // Add a 3-second delay
        await new Promise(resolve => setTimeout(resolve, 3000));

        const { data } = await axios.get(`https://moxiescout.vercel.app/auction/${fid}`);
        const $ = cheerio.load(data);

        // Check if the auction data is available
        const errorMessage = $('.text-red-500').text().trim();
        if (errorMessage === "Failed to load auction details. Please try again later.") {
            return { error: "No Auction Data Available" };
        }

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
