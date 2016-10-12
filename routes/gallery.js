const express = require('express');
const router = express.Router();
const path = require('path');

const debug = require('debug')('git-gallery');

const utils = require('../pageUtils');
const galleryRoot = utils.galleryRoot;

const db = require('../pagesDB');

const repoUtils = require('../repoUtils');

router.use(function(req, res, next) {
	console.log('galleryRouter: %s %s %s', req.method, req.url, req.path);
	next();
});

const pageRouter = require('./page');

const thumbnail = require('./thumbnail');
router.use(thumbnail.register(galleryRoot));

router.get('/', getDirectory);
router.get('/index.html', getDirectory);
router.use('/:commitRef', pageRouter);

const galleryFile = path.join(galleryRoot, 'gallery.json');
var galleryData;

function getDirectory(req, res, next) {
	if (!galleryData) {
		galleryData = utils.readJsonSync(galleryFile);
	}
	galleryData.pages = db.getPages();
	repoUtils.getAllCommits().then(commits => {
		processCommits(commits);
		galleryData.commits = commits;
		res.render('gallery.hbs', galleryData);
	});
}

function processCommits(commits) {
	commits.forEach(c => {
		c.date = c.date();
		c.sha = c.sha();
		c.sha7 = c.sha.substring(0,7);
	});
}

/** Create a new page */
router.post('/create', (req, res, next) => {
	db.createPage(req.body.commitRef, (error, data) => {
		if (error) {
			console.log(error);
			res.sendStatus(500);
		} else {
			res.redirect(req.body.commitRef + '/index.html');
		}
	});
});

router.post('/editgallery', (req, res, next) => {
	debug('Edit gallery: name=' + req.body.name + ' => value=' + req.body.value);
	galleryData[req.body.name] = req.body.value;
	delete galleryData.pages;
	utils.writeJson(galleryData, galleryFile, (error) => {
		if (error) {
			console.log(error);
			return res.sendStatus(500);
		}
		res.sendStatus(200);
	});
});

module.exports = router;