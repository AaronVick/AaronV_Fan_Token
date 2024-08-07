async function fetchAuctionData() {
    try {
        const response = await fetch('/api/getAuctionData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Could not fetch auction data:", error);
        return null;
    }
}

function updateAuctionDetails(data) {
    const detailsDiv = document.getElementById('auctionDetails');
    detailsDiv.innerHTML = `
        <h1>Moxie Auction Details</h1>
        <p>Clearing Price: $${data.clearingPrice}</p>
        <p>Auction Supply: ${data.auctionSupply}</p>
        <p>Auction Start: ${data.auctionStart}</p>
        <p>Auction End: ${data.auctionEnd}</p>
        <p>Total Orders: ${data.totalOrders}</p>
        <p>Unique Bidders: ${data.uniqueBidders}</p>
        <p>Status: ${data.status}</p>
        <p>Total Bid Value: ${data.totalBidValue} MOXIE</p>
    `;
}

window.onload = async function() {
    const data = await fetchAuctionData();
    if (data) {
        updateAuctionDetails(data);
    } else {
        document.getElementById('loading').textContent = 'Failed to load auction data. Please try again later.';
    }
};
