function generateImageUrl(auctionData, farcasterName, errorInfo = null) {
    let text;
    if (errorInfo) {
        text = `
Error for ${farcasterName}

Error Type: ${errorInfo.type}
Error Message: ${errorInfo.message}
Details: ${errorInfo.details || 'No additional details'}
        `.trim();
    } else {
        text = `
Auction for ${farcasterName}

Clearing Price: ${auctionData.clearingPrice.padEnd(20)} Auction Supply: ${auctionData.auctionSupply.padEnd(10)}
Auction Start:  ${auctionData.startTime.padEnd(25)}
Auction End:    ${auctionData.endTime.padEnd(25)}
Status:         ${auctionData.status.padEnd(20)}
Total Orders:   ${auctionData.totalOrders.padEnd(20)}
Unique Bidders: ${auctionData.uniqueBidders.padEnd(20)}
Total Bid Value:${auctionData.totalBidValue.padEnd(20)}
        `.trim();
    }

    return `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}&font=monospace&size=30&weight=bold`;
}

module.exports = async (req, res) => {
    try {
        // ... (previous code remains the same)

        let html;
        if (req.method === 'GET' || !req.body) {
            console.log('Handling as GET request');
            html = baseHtml(DEFAULT_IMAGE_URL, "View Auction Details", "Enter Farcaster name");
        } else {
            console.log('Handling as POST request');
            const farcasterName = req.body.untrustedData?.inputText || '';
            
            let fid = DEFAULT_FID;
            let displayName = 'Unknown User';
            let errorInfo = null;

            if (farcasterName.trim() !== '') {
                try {
                    const userData = await getUserDataFromAirstack(farcasterName);
                    console.log('Airstack user data:', safeStringify(userData));
                    
                    if (userData.data && userData.data.Socials && userData.data.Socials.Social && userData.data.Socials.Social.length > 0) {
                        const user = userData.data.Socials.Social[0];
                        fid = user.userId;
                        displayName = user.username || farcasterName;
                    } else {
                        console.log('User not found in Airstack');
                        errorInfo = {
                            type: 'User Not Found',
                            message: 'The specified Farcaster name was not found in Airstack.',
                            details: `Searched for: ${farcasterName}`
                        };
                    }
                } catch (error) {
                    console.error('Error fetching user data from Airstack:', error);
                    errorInfo = {
                        type: 'Airstack API Error',
                        message: 'Failed to fetch user data from Airstack.',
                        details: error.message
                    };
                }
            }

            let auctionData;
            if (!errorInfo) {
                try {
                    const moxieData = await getMoxieAuctionData(fid);
                    console.log('Moxie auction data:', safeStringify(moxieData));
                    // Process moxieData to extract relevant auction information
                    // This is a placeholder. Replace with actual data processing based on the Moxie auction data structure
                    auctionData = {
                        auctionId: '1234',
                        auctionSupply: '100',
                        clearingPrice: '50',
                        status: 'active',
                        startTime: new Date(Date.now()).toLocaleString(),
                        endTime: new Date(Date.now() + 86400000).toLocaleString(), // 24 hours from now
                        totalOrders: '20',
                        uniqueBidders: '10',
                        totalBidValue: '500',
                    };
                } catch (error) {
                    console.error('Error fetching Moxie auction data:', error);
                    errorInfo = {
                        type: 'Moxie Data Error',
                        message: 'Failed to fetch or process Moxie auction data.',
                        details: error.message
                    };
                }
            }

            const dynamicImageUrl = generateImageUrl(auctionData, displayName, errorInfo);
            console.log('Generated dynamic image URL:', dynamicImageUrl);

            html = baseHtml(dynamicImageUrl, "Check Another Auction", "Enter Farcaster name");
        }

        console.log('Sending HTML response');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    } catch (error) {
        logError('Error in main handler', error);
        const errorImageUrl = generateImageUrl(null, 'Error', {
            type: 'Unexpected Error',
            message: 'An unexpected error occurred while processing the request.',
            details: error.message
        });
        const errorHtml = baseHtml(errorImageUrl, "Try Again", "Enter Farcaster name");
        return res.status(200).send(errorHtml);
    }
};
