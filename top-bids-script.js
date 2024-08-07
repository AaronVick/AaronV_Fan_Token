async function fetchTopBids() {
    try {
        const response = await fetch('/api/getTopBids');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Could not fetch top bids:", error);
        return null;
    }
}

function updateTopBids(data) {
    const topBidsDiv = document.getElementById('topBids');
    let bidsHtml = '<h1>Top 5 Bids</h1><ol>';
    data.topBids.forEach(bid => {
        bidsHtml += `<li>${bid} MOXIE</li>`;
    });
    bidsHtml += '</ol>';
    topBidsDiv.innerHTML = bidsHtml;
}

window.onload = async function() {
    const data = await fetchTopBids();
    if (data) {
        updateTopBids(data);
    } else {
        document.getElementById('loading').textContent = 'Failed to load top bids. Please try again later.';
    }
};
