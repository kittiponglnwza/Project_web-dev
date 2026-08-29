const https = require('https');

function checkURL(url) {
    https.get(url, (res) => {
        console.log(`URL: ${url} -> Status: ${res.statusCode}`);
    }).on('error', (e) => {
        console.error(e);
    });
}

checkURL("https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=800");
checkURL("https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800");
