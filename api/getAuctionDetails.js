const axios = require('axios');
const cheerio = require('cheerio');

const DEFAULT_FID = '354795'; // Replace with your actual FID

async function getAuctionData(fid) {
    try {
        console.log(`Fetching auction data for FID: ${fid}`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        const response = await axios.get(`https://moxiescout.vercel.app/auction/${fid}`);
        console.log(`MoxieScout response status: ${response.status}`);
        const $ = cheerio.load(response.data);

        const errorMessage = $('.text-red-500').text().trim();
        if (errorMessage === "Failed to load auction details. Please try again later.") {
            console.log('No auction data available');
            return { error: "No Auction Data Available" };
        }

        const data = {
            clearingPrice: $('div:contains("Clearing Price") + div').text().trim(),
            auctionSupply: $('div:contains("Auction Supply") + div').text().trim(),
            auctionStart: $('div:contains("Auction Start") + div').text().trim(),
            auctionEnd: $('div:contains("Auction End") + div').text().trim(),
            totalOrders: $('div:contains("Total Orders") + div').text().trim(),
            uniqueBidders: $('div:contains("Unique Bidders") + div').text().trim(),
            status: $('div:contains("Status") + div').text().trim(),
            totalBidValue: $('div:contains("Total Bid Value") + div').text().trim(),
        };
        console.log('Parsed auction data:', data);
        return data;
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
                const fidResponse = await axios.get(`https://api.farcaster.xyz/v2/user-by-username?username=${farcasterName}`);
                fid = fidResponse.data.result.user.fid;
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
                <meta charset="UT
