const express = require('express');
const router = express.Router();
const path = require('path');

const debug = require('debug')('git-gallery');

const utils = require('../pageUtils');
const galleryRoot = utils.galleryRoot;

const db = require('../pagesDB');

router.use(function(req, res, next) {
	console.log('galleryRouter: %s %s %s', req.method, req.url, req.path);
	next();
});

const pageRouter = require('./page');

router.get('/', getDirectory);
router.get('/index.html', getDirectory);
router.use('/:commitRef', pageRouter);

function getDirectory(req, res, next) {
	let pages = db.getPages();
	let data = {
		pages: pages
	};
	res.render('gallery.hbs', data);
}

/** Create a new page */
router.post('/create', function(req, res, next) {
	db.createPage(req.body.commitRef, (error, data) => {
		if (error) {
			console.log(error);
			res.sendStatus(500);
		} else {
			res.redirect(req.body.commitRef + '/index.html');
		}
	});
});

module.exports = router;