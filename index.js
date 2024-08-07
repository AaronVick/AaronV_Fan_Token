const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Error loading the page');
    }
    
    res.status(200).send(data);
  });
};
