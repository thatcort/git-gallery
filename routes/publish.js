const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const Promise = require('promise');

const debug = require('debug')('git-gallery');

const fsUtils = require('../lib/fsUtils');
const galleryRoot = fsUtils.galleryRoot;
const exportRoot = fsUtils.exportRoot;

const db = require('../lib/pagesDB');

const repo = require('../lib/repoUtils');

const gallery = require('./gallery');
const pageRouter = require('./page');

const commits = require('../lib/commitsDB');


router.post('/', (req, res, next) => {
	let ids = req.body.ids;
	ids = ids ? ids.split(',') : null;
	if (!ids || ids.length === 0) {
		console.log("Publish: 0 ids given to publish.");
		res.sendStatus(500);
		return;
	}
	writeGallery(req.app, ids, req.body.exportRepo).then(() => res.sendStatus(200));
});



function writeGallery(app, ids, exportRepo) {
	fs.ensureDirSync(exportRoot);

	// render the gallery template
	let galleryPages = [];
	for (id of ids) {
		galleryPages.push(db.getPage(id));
	}
	let galleryData = gallery.getGalleryData();
	galleryData.pages = galleryPages;
	galleryData.editable = false;

	// console.log('EXPORTING: GalleryData=' + JSON.stringify(galleryData, null, 2));

	app.render('gallery.hbs', galleryData, (err, html) => {
		fs.writeFileSync(path.join(exportRoot, 'index.html'), html);
	});

	// write js libraries
	let jsSrc = path.resolve(__dirname, '..', 'public', 'lib');
	let jsDest = path.join(exportRoot, 'lib');
	fs.ensureDirSync(jsDest);
	fs.copySync(path.join(jsSrc, 'bootstrap'), path.join(jsDest, 'bootstrap'));
	fs.copySync(path.join(jsSrc, 'jquery.min.js'), path.join(jsDest, 'jquery.min.js'));

	// write the stylesheets
	let cssSrc = path.resolve(__dirname, '..', 'public', 'stylesheets');
	let cssDest = path.join(exportRoot, 'stylesheets');
	fs.ensureDirSync(cssDest);
	fs.copySync(path.join(cssSrc, 'style.css'), path.join(cssDest, 'style.css'));

	return prepareExportPages(ids).then(pages => {
		for (p of pages) {
			writePage(app, p, exportRepo);
		}
	});
}


/** Creates the render data for each page. */
function prepareExportPages(ids) {
	// console.log("CREATE EXPORT FOR " + ids);
	return Promise.all(ids.map(pageRouter.createPageRenderData)).then(function(results) {
		for (let i=0; i < ids.length; i++) {
			let id = ids[i];

// console.log('EXPORTING id=' + id + " --> " + JSON.stringify(results[i], null, 2));

if (results[i].commitId !== id) {
	console.log("PROBLEM WITH THE ORDER OF PROMISE RESULTS!!!");
	throw "PROBLEM WITH THE ORDER OF GALLERY EXPORT PROMISE RESULTS!!!"
}
			
			let result = results[i];
			result.editable = false;
			
			let old = db.getPage(id);
			result.images = old.images;

			// set the prev & next links
			let prev = i > 0 ? results[i-1] : null;
			let next = i < (results.length-1) ? results[i+1] : null;
			result.page.prevPage = prev;
			result.page.nextPage = next;
		}
		return results;
	});
}


function writePage(app, page, exportRepo) {
	// create a dir
	let pdir = path.join(exportRoot, page.commitId);
	fs.ensureDirSync(pdir);

	// render the page template
	app.render('page.hbs', page, (err, html) => {
		if (err) throw err;
		fs.writeFileSync(path.join(pdir, 'index.html'), html);
	});

	// copy in all the images from the page dir
	for (img of page.images) {
		let isrc = path.join(galleryRoot, page.commitId, img.src);
		let idest = path.join(pdir, img.src);
		fs.copySync(isrc, idest);
	}

	// create page thumbnails
	if (page.images.length > 0) {
		let tsrc = path.join(galleryRoot, '.thumb', page.commitId, page.images[0].src);
		let tdest = path.join(pdir, 'thumb_' + page.images[0].src);
		fs.copySync(tsrc, tdest);
	}

	// add the repo contents
	if (exportRepo) {
		let repoDir = path.join(pdir, 'repo');
		fs.ensureDirSync(repoDir);
		let restoreFilter = path => {
			if (path == '.gitignore' || path == '.DS_Store') {
				return false;
			}
			return true;
		};
		repo.restoreCommit(page.commitId, repoDir, restoreFilter);
	}
}


module.exports = router;