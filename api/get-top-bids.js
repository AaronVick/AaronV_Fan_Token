const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    try {
        const { data } = await axios.get('https://moxiescout.vercel.app/auction/354795');
        const $ = cheerio.load(data);

        const topBids = [];
        $('.top-bids-list li').each((index, element) => {
            if (index < 5) {  // Get only top 5 bids
                topBids.push($(element).text().trim());
            }
        });

        res.status(200).json({ topBids });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch top bids' });
    }
};
