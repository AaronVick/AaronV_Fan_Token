module.exports = (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Moxie Auction Frame</title>
        <meta property="fc:frame" content="vNext">
        <meta property="fc:frame:image" content="https://www.aaronvick.com/Moxie/11.JPG">
        <meta property="fc:frame:button:1" content="View Auction Details">
        <meta property="fc:frame:post_url" content="/api/getAuctionDetails">
    </head>
    <body>
        <h1>Welcome to Moxie Auction Frame</h1>
        <p>Click the button to view auction details.</p>
    </body>
    </html>
  `);
};
