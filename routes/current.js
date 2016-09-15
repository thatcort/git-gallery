const express = require('express');
const router = express.Router();
const path = require('path');

const repoUtils = require('../repoUtils');

router.get('/current.html', (req, res, next) => {
	return repoUtils.repoStatus().then(status => {
		return res.render('currentPage', status);
	});
});

router.post('/commitcurrent', (req, res, next) => {
	let message = req.body.message || '';
	return repoUtils.commitAllChanges(message).then(() => {
		return res.redirect('/current.html');
	})
});

module.exports = router;