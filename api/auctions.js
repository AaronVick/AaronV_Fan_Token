module.exports = async (req, res) => {
    console.log('Received request method:', req.method);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request query:', JSON.stringify(req.query, null, 2));

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const baseHtml = (image, buttonText, inputText) => `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Moxie Auction Details</title>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${image}">
            <meta property="fc:frame:post_url" content="${req.headers.host}/api/auctions">
            <meta property="fc:frame:button:1" content="${buttonText}">
            ${inputText ? `<meta property="fc:frame:input:text" content="${inputText}">` : ''}
        </head>
        <body>
            <h1>Moxie Auction Frame</h1>
        </body>
        </html>
    `;

    const defaultImage = 'https://www.aaronvick.com/Moxie/11.JPG';

    try {
        let html;
        if (req.method === 'GET' || !req.body) {
            console.log('Handling as GET request');
            html = baseHtml(defaultImage, "View Auction Details", "Enter Farcaster name");
        } else {
            console.log('Handling as POST request');
            const farcasterName = req.body.untrustedData?.inputText || 'Unknown User';
            html = baseHtml(defaultImage, "Check Another Auction", "Enter Farcaster name");
        }

        console.log('Sending HTML response');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    } catch (error) {
        console.error('Error processing request:', error);
        const errorHtml = baseHtml(defaultImage, "Try Again", "Enter Farcaster name");
        return res.status(200).send(errorHtml);
    }
};
