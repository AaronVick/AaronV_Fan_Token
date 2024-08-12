module.exports = (req, res) => {
  console.log('Request received');
  console.log('Request method:', req.method);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));

  const imageUrl = 'https://www.aaronvick.com/Moxie/11.JPG';
  console.log('Image URL:', imageUrl);

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta property="fc:frame" content="vNext">
<meta property="fc:frame:image" content="${imageUrl}">
</head>
<body>
<p>Debug: Image URL = ${imageUrl}</p>
</body>
</html>
  `.trim();

  console.log('Generated HTML:', html);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);

  console.log('Response sent');
};
