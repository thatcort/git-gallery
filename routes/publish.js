const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const Promise = require('promise');

const debug = require('debug')('git-gallery');

const fsUtils = require('../fsUtils');
const galleryRoot = fsUtils.galleryRoot;

const db = require('../pagesDB');

const gallery = require('./gallery');
const pageRouter = require('./page');

const commits = require('../commitsDB');

router.post('/', (req, res, next) => {
	let ids = req.body.ids;
	ids = ids ? ids.split(',') : null;
	if (!ids || ids.length === 0) {
		res.sendStatus(500);
		return;
	}
	createExportPages(ids).then(() => res.sendStatus(200));
});


function createExportPages(ids) {
	// for each id
	//  create a new page
	//   get the existing page
	//    copy in all the images from the existing page
	//    set the prev and next links on the new page

	return Promise.all(ids.map(pageRouter.createPageRenderData)).then(function(results) {
		for (let i=0; i < ids.length; i++) {
			let id = ids[i];

if (results[i].id !== id) {
	console.log("PROBLEM WITH THE ORDER OF PROMISE RESULTS!!!");
	return res.sendStatus(500);
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
		writeExports(results);
	}, function (error) {
		console.log(error);
		return res.status(500).send(error);
	});
}

function writeExports(pages) {
	let dir = path.join(galleryRoot, 'export');
	fs.ensureDirSync(dir);

	// render the gallery template
	let galleryData = gallery.getGalleryData();
	galleryData.pages = pages;
	galleryData.editable = false;
	req.app.render('gallery.hbs', galleryData, (err, html) => {
		fs.writeFileSync(path.join(dir, 'index.html'), html);
	});


	// write all the individual pages:
	for (page of pages) {
		// create a dir
		let pdir = path.join(dir, page.commitId);
		fs.ensureDirSync(pdir);

		// render the page template
		req.app.render('gallery.hbs', galleryData, (err, html) => {
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
			let tsrc = path.join(dir, '.thumb', page.commitId, page.images[0].src);
			let tdest = path.join(pdir, 'thumb_' + page.images[0].src);
			fs.copySync(tsrc, tdest);
		}

		//   TODO: add the repo contents
		
	}
	
}

module.exports = router;