var express = require('express');
var router = express.Router({mergeParams: true});

var fs = require("fs");
var path = require('path');
var parseUrl = require('parseurl');

var utils = require('../pageUtils');
var repoUtils = require('../repoUtils');
var galleryRoot = utils.galleryRoot;
var isPageDir = utils.isPageDir;
var pageExists = utils.pageExists;
var pageDir = utils.pageDir;
var readPageJSON = utils.readPageJSON;
var createPage = utils.createPage;
var createPageJson = utils.createPageJson;


router.use(function(req, res, next) {
	console.log('pagesRouter: %s %s %s', req.method, req.url, req.path);
	next();
});

var repo = require('./repo');
router.use('/repo', repo.router);

// router.use('/:commitRef/*', express.static(path.join(__dirname, '..', '.gitGallery')));

/* GET users listing. */
router.get('/', function(req, res, next) {
	//     if directory does not exist
	//       offer to create a new page
	//     else (if directory does exist, but path doesn't)
	//       return 404
	if (pageExists(req.params.commitRef)) {
// console.log("page DOES exist");
		return loadPage(req.params.commitRef, res);	
	} else {
// console.log("page does NOT exist");
		createPageJson(req.params.commitRef, function(error, json) {
			if (error) {
				res.sendStatus(404);
			} else {
				json.title = "Create Page";
				json.isHead = req.params.commitRef === 'HEAD';
				if (json.isHead) {
					
console.log("Checking if working dir clean");
					repoUtils.isWorkingDirClean().then(isClean => {
						json.isClean = isClean;
						console.log("ISCLEAN: " + isClean);
						res.render('createPage.hbs', json);
					});
				} else {
					res.render('createPage.hbs', json);
				}
			}
		});
	}
	
});

/** Create a new page */
router.post('/create', function(req, res, next) {
	createPage(req.body.commitRef, (error, data) => {
		if (error) {
			console.log(error);
			res.sendStatus(500);
		} else {
			res.redirect(req.body.commitRef);
		}
	});
});


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


function loadPage(commitRef, res) {
	let dir = pageDir(commitRef);
	let json = readPageJSON(dir);
	json.commitRef = commitRef;
	res.render('page', json);
}

// function loadPage(commitRef, res) {
// 	let jsonPath = path.join(galleryRoot, commitRef, 'page.json');
// // console.log("looking for: " + jsonPath);
// 	let json = readJsonFileSync(jsonPath);
// 	json.commitRef = commitRef;
// 	res.render('page', json);
// }


// function readJsonFileSync(filepath, encoding) {
// 	if (typeof (encoding) == 'undefined') {
// 		encoding = 'utf8';
// 	}
// 	var file = fs.readFileSync(filepath, encoding);
// 	return JSON.parse(file);
// }


// function pageExists(commitRef) {
// 	let exists = false;
// 	let dir = pageDir(commitRef);
// 	try {
// 		fs.accessSync(dir);
// 		exists = true;
// 	} catch (e) {
// // console.log("accesssync failed");
// 		return false;
// 	}
// 	let isDir = fs.statSync(dir).isDirectory();
// // console.log("isDir? " + isDir);
// 	return exists && isDir;
// }

// function pageDir(commitRef) {
// 	return path.join(galleryRoot, commitRef);
// }

// function createPage(commitRef, callback) {
// 	let dir = pageDir(commitRef);
// 	fs.mkdir(dir, function(error) {
// 		if (error) {
// 			callback(error);
// 			return;
// 		}
// // console.log("about to create page json");
// 		// create and add a json file to the directory
// 		createPageJson(commitRef, (error, data) => {
// 			if (error) {
// 				callback(error);
// 				return;
// 			} else {
// 				let json = JSON.stringify(data, null, '\t');
// 				console.log("About to write page json file: " + json);
// 				fs.writeFile(path.join(dir, 'page.json'), json, (error) => { 
// // console.log("Wrote file or failed");
// 					callback(error);
// 					return;
// 				});
// 			}
// 		});
// 	});
// }

// function createPageJson(commitRef, callback) {
// 	repo.getCommit(commitRef).then(function(commit) {
// 		callback(null, {
// 			"commitId": commitRef,
// 			"date": commit.date().toJSON(),
// 			"body": commit.body(),
// 			"author": commit.author().toString(),
// 			"committer": commit.committer().toString(),
// 			"message": commit.message(),
// 			"parents": commit.parents(),
// 			"title": "",
// 			"comment": "",
// 			"images": []
// 		});
// 	}, function(error) {
// 		callback(error);
// 	});
// }

module.exports = router;
