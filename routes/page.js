const express = require('express');
const router = express.Router({mergeParams: true});

const fs = require("fs");
const path = require('path');
const parseUrl = require('parseurl');
const multer = require('multer');
const mime = require('mime');

const debug = require('debug')('git-gallery');

const gallery = require('./gallery.js');
const commitsDB = require('../lib/commitsDB');
const pagesDB = require('../lib/pagesDB');
const fsUtils = require('../lib/fsUtils');
const repoUtils = require('../lib/repoUtils');
const galleryRoot = fsUtils.galleryRoot;


function multerDestination(req, file) {
	return path.join(galleryRoot, req.body.commitId);
}
function multerFilename(dir, name, ext) {
	let fn = name + ext;
	let p = path.join(dir, fn);
	if (fsUtils.pathExists(p)) {
		// add a number after the name so the name doesn't conflict with an already existing file
		let number = 1;
		do {
			number++;
			fn = name + number + ext;
			p = path.join(dir, fn);
		} while (fsUtils.pathExists(p));
	}
	return fn;
}

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		// console.log('multer request: %s %s %s' + req.method, req.url, req.path);
		let d = multerDestination(req, file);
		// console.log('multer destination: ' + d);
		cb(null, d);
	},
	filename: function (req, file, cb) {
		let ext = '.' + mime.extension(file.mimetype);
		let name = file.originalname;
		if (name.endsWith(ext)) {
			name = name.substring(0, name.length-ext.length);
		}
		let dir = multerDestination(req, file);
		let fn = multerFilename(dir, name, ext);
		cb(null, fn);
	}
});
var upload = multer({ storage: storage });




router.use(function(req, res, next) {
	console.log('pagesRouter: %s %s %s', req.method, req.url, req.path);
	next();
});

var repo = require('./repo');
router.use('/repo', repo.router);

router.get('/thumbnail', thumbnailRequest);

router.get('/', pageRequest);
router.get('/index.html', pageRequest);

router.post('/commitcurrent', commitCurrent);

function pageRequest(req, res, next) {
	let commitId = req.params.commitRef;
	switch (commitId) {
		case 'current':
		case 'CURRENT':
		// case 'current.html':
			return getCurrent(req, res, next);
		case 'HEAD':
			debug('HEAD request');
			return repoUtils.getHeadCommit().then(head => { 
				debug('HEAD = ' + head);
				return handlePageRequest(head.sha(), req, res, next); });
		default:
			return handlePageRequest(commitId, req, res, next);
	}
}


function handlePageRequest(commitId, req, res, next) {
	createPageRenderData(commitId)
		.then(data => {
			data.editable = true;
			res.render('page.hbs', data);
		})
		.catch(error => res.sendStatus(404));
}

router.get('/*', function(req, res, next) {
	let pn = parseUrl(req).pathname;
	let f = path.join(req.params.commitRef, pn);
	let root = '.gitGallery';
// console.log("pathname: " + pn);
// console.log('root resolved: ' + path.resolve(root));
// console.log('req url: ' + req.url);
// console.log('commitRef: ' + req.params.commitRef);
// console.log('Sending file: ' + f);
	res.sendFile(f, {root: root});
});


router.post('/editpage', function(req, res, next) {
	let commitId = req.params.commitRef;
	if (commitId === 'HEAD') {
		return repoUtils.getHeadCommit().then(head => { editPage(head.sha(), req, res); });
	} else {
		return editPage(commitId, req, res);
	}
});

function editPage(commitId, req, res) {
	debug('Edit page: name=' + req.body.name + ' => value=' + req.body.value);
	let page = pagesDB.getPage(commitId);
	if (req.body.name.startsWith('caption/')) {
		let imgSrc = req.body.name.substring(8);
		let caption = null;
		for (img of page.images) {
			if (img.src === imgSrc) {
				img.caption = req.body.value;
				break;
			}
		}
	} else {
		page[req.body.name] = req.body.value;
	}
	res.sendStatus(200);	
}

router.post('/addimage', upload.single('file'), function(req, res, next) {
	if (req.params.commitRef === 'HEAD') {
		return repoUtils.getHeadCommit().then(head => { addImage(head.sha(), req, res); });
	} else {
		return addImage(req.params.commitRef, req, res);
	}
});

function addImage(commitId, req, res) {
	let page = pagesDB.getPage(commitId);
	page.images.push({ 'src': req.file.filename, 'caption': '' });
	res.sendStatus(200);
}


function thumbnailRequest(req, res, next) {
	let page = pagesDB.getPage(req.params.commitRef);
	if (!page) {
		return res.sendStatus(404);
	} else if (!page.images || page.images.length < 1) {
		return res.redirect('/images/1x1.png');
	} else {
		let image = page.images[0];
		let thumb = req.query.thumb || '200x200';
		return res.redirect(image.src + '?thumb=' + thumb);
	}
}

function getCurrent(req, res, next) {
	return repoUtils.repoStatus().then(status => {
		return res.render('current', status);
	});
}

function commitCurrent(req, res, next) {
	let message = req.body.message || '';
	return repoUtils.commitAllChanges(message).then(() => {
		return res.redirect('/current/');
	})
}

/** Data that can be sent to the page template including commit and page info. */
function createPageRenderData(commitId) {
	let page = pagesDB.getPage(commitId);
	return commitsDB.getCommit(commitId).then(commit => {
		let data = {
			"commitId": commitId,
			"galleryData": gallery.getGalleryData(),
			"commit": commit,
			"page": page,
			"isHead": commitId === 'HEAD'
		};
		return data;
	}).then(data => {
		if (data.isHead) {
			return repoUtils.headStatus().then(headStatus => {
				data.isClean = headStatus.isClean;
				data.isDetached = headStatus.isDetached;
				return data;
			});
		}
		return data;
	});
}


exports.router = router;
exports.createPageRenderData = createPageRenderData;
