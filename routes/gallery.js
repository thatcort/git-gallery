const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const debug = require('debug')('git-gallery');

const fsUtils = require('../lib/fsUtils');
const galleryRoot = fsUtils.galleryRoot;

const db = require('../lib/pagesDB');

const commits = require('../lib/commitsDB');

router.use(function(req, res, next) {
	console.log('galleryRouter: %s %s %s', req.method, req.url, req.path);
	next();
});

const pageRouter = require('./page');

const thumbnail = require('./thumbnail');
router.use(thumbnail.register(galleryRoot));

router.get('/', getDirectory);
router.get('/index.html', getDirectory);
router.use('/:commitRef', pageRouter.router);

const galleryFile = path.join(galleryRoot, 'gallery.json');
var _galleryJson;


function getDirectory(req, res, next) {
	let galleryData = getGalleryData();
	galleryData.pages = db.getPages();
	commits.getCommits().then(commits => {
		galleryData.commits = commits;
		galleryData.editable = true;
console.log('GALLERY RENDER DATA: ' + JSON.stringify(galleryData, null, 2));
		res.render('gallery.hbs', galleryData);
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
	let galleryData = getGalleryData();
	galleryData[req.body.name] = req.body.value;
	fsUtils.writeJson(galleryData, galleryFile, (error) => {
		if (error) {
			console.log(error);
			return res.sendStatus(500);
		}
		_galleryJson = null;
		res.sendStatus(200);
	});
});

function getGalleryData() {
	// JSON.parse(JSON.stringify(obj))
	if (!_galleryJson) {
		_galleryJson = fs.readFileSync(galleryFile, 'utf8');
	}
	return fsUtils.parseJson(_galleryJson);
}

exports.router = router;
exports.getGalleryData = getGalleryData;