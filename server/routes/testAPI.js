var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    //res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.send('API is working properly');
});

module.exports = router;