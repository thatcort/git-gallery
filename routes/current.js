const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/current.html', (req, res, next) => {
	return res.render('currentPage', {});
});

module.exports = router;