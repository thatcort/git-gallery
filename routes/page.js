const express = require('express');
const router = express.Router({mergeParams: true});

const fs = require("fs");
const path = require('path');
const parseUrl = require('parseurl');
const multer = require('multer');

const debug = require('debug')('git-gallery');

const db = require('../pagesDB');
const utils = require('../pageUtils');
const repoUtils = require('../repoUtils');
const galleryRoot = utils.galleryRoot;
const isPageDir = utils.isPageDir;
const pageExists = utils.pageExists;
const pageDir = utils.pageDir;


var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		// console.log('multer request: %s %s %s' + req.method, req.url, req.path);
		d = path.join(galleryRoot, req.body.commitId);
		console.log('multer destination: ' + d);
		cb(null, d);
	},
	filename: function (req, file, cb) {
		cb(null, file.originalname);
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
	//     if page does not exist
	//       offer to create a new page
	//     else (if directory does exist, but path doesn't)
	//       return 404
	let page = db.getPage(commitId);
	if (page) {
		if (req.params.commitRef === 'HEAD') {
			page.isHead = true;
		}
		return res.render('page.hbs', page);
	} else {
		repoUtils.getCommit(commitId).then(commit => {
			let data = utils.createPageForCommit(commit);
			data.title = 'Create Page';
			data.isHead = req.params.commitRef === 'HEAD';
			if (data.isHead) {
				repoUtils.headStatus().then(headStatus => {
					data.isClean = headStatus.isClean;
					data.isDetached = headStatus.isDetached;
					return res.render('createPage.hbs', data);
				})
				// repoUtils.isWorkingDirClean().then(isClean => {
				// 	data.isClean = isClean;
				// 	return res.render('createPage.hbs', data);
				// });
			} else {
				return res.render('createPage.hbs', data);
			}
		}, error => {
			res.sendStatus(404);
		});
	}
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
	let page = db.getPage(commitId);
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

router.post('/addimage', upload.single('imageFile'), function(req, res, next) {
	if (req.params.commitRef === 'HEAD') {
		return repoUtils.getHeadCommit().then(head => { addImage(head.sha(), req, res); });
	} else {
		return addImage(req.params.commitRef, req, res);
	}
});

function addImage(commitId, req, res) {
	let page = db.getPage(commitId);
	page.images.push({ 'src': req.file.originalname, 'caption': '' });
	res.sendStatus(200);
}


function thumbnailRequest(req, res, next) {
	let page = db.getPage(req.params.commitRef);
	if (!page) {
		return res.sendStatus(404);
	} else if (!page.images || page.images.length < 1) {
		return res.redirect('/images/1x1.png');
	} else {
		let image = page.images[0];
		let thumb = req.query.thumb || '100x100';
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
		return res.redirect('/current.html');
	})
}

module.exports = router;
