var express = require('express');
var router = express.Router();
var path = require('path');

var utils = require('../pageUtils');
var galleryRoot = utils.galleryRoot;

var db = require('../pagesDB');

router.use(function(req, res, next) {
	console.log('galleryRouter: %s %s %s', req.method, req.url, req.path);
	next();
});

var pageRouter = require('./page');
var repoRouter = require('./repo');

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

module.exports = router;