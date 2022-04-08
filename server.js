var express = require('express');
var app = express();

app.use('/weather', require('./weather'));

const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log("App is running on port " + port);
});