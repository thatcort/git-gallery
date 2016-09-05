const fs = require('fs');
const chokidar = require('chokidar');
const path = require('path');

const debug = require('debug')('git-gallery');

const utils = require('./pageUtils');
const galleryRoot = utils.galleryRoot;
// const readPage = utils.readPage;
// const writePage = utils.writePage;

const isPageDir = utils.isPageDir;
// const pageExists = utils.pageExists;
// const readPageJSON = utils.readPageJSON;

var watcher; // gallery filesystem watcher

var pages;
var commit2Page;
var dirties = {}; // a queue of objects that have been marked dirty and need to be written to disk
var dirtyIgnores = {}; // page properties not to mark dirty on
for (prop of utils.transientPageProperties) {
	dirtyIgnores[prop] = true;
}


var dirtyHandler = {
	set: function(obj, prop, value) {
		if (!dirtyIgnores[prop]) {
			debug('Dirty: ' + prop + ' of ' + obj.commitId);
			markDirty(obj);
		}
		obj[prop] = value;
		return true;
	}
};

function markDirty(page) {
	let id = page.commitId;
	if (!id) {
		return;
	}
	dirties[id] = page;
	setTimeout(clean, 10);
}

function clean() {
	let keys = Object.keys(dirties);
	if (!keys.length)
		return;
	let id = keys[0];
	let page = dirties[id];
	debug('cleaning: ' + JSON.stringify(page));
	delete dirties[id];

	utils.writePage(page, (error) => {
		if (error) {
			console.log("Problem saving page " + id + ": " + error);
		}
		clean(); // process the next item
	});
}


/** Returns the list of pages ordered by time */
function getPages() {
	return pages;
}

/** Returns the page.json for the given commit */
function getPage(commitId) {
	return commit2Page[commitId];
}

function createPage(commitId, callback) {
	utils.createPageForId(commitId, (error, obj) => {
		if (error) {
			return callback(error);
		}
		let page = addRawPage(obj);
		markDirty(page);
		callback(null, page);
	});
}

function addRawPage(obj) {
	let page = new Proxy(obj, dirtyHandler);
	pages.push(page);
	commit2Page[page.commitId] = page;
	sortPages();
	return page;
}




function buildDB() {
	pages = [];
	commit2Page = {};
	// find all gallery directories with page.json files and create an in memory index of them
	var files = fs.readdirSync(galleryRoot);
	for (let f of files) {
		debug("Processing file: " + f);
		let p = path.join(galleryRoot, f);
		// skip the HEAD symlink dir and any directory that is not a valid page
		if (f === 'HEAD' || !isPageDir(p)) {
		debug("...skipping");
			continue;
		}
		// add the page to the db
		processPageDir(p);
	}

	sortPages();
	console.log("PageDB: " + JSON.stringify(pages, null, 2));
}


function processPageDir(dir) {
	let obj = utils.readPageSync(dir);
	addRawPage(obj);
}

function removePage(commitId) {
	delete dirties[commitId];
	let index = pages.findIndex(item => { return item.commitId === commitId; });
	if (index >= 0) {
		pages.splice(index, 1);
	}
	delete commit2Page[commitId];
}

function sortPages() {
	// sort all the entries by time
	pages.sort((a, b) => { return b.date - a.date; });
}



//---------------------------------------------------------------------


function watchGallery() {
	watcher = chokidar.watch(galleryRoot, { ignoreInitial: true });
	// watcher.on('all', (event, path) => { console.log(event, path); });
	watcher.on('addDir', onDirAdded) // directory added
		.on('unlinkDir', onDirRemoved) // directory removed
		.on('add', onFileAdded) // file added
		.on('change', onFileChanged) // file changed
		.on('unlink', onFileRemoved) // file removed
		.on('error', error => console.log(`Watcher error: ${error}`));
}

function onDirAdded(dir) {
	console.log("Watcher.onDirAdded: " + dir);
	if (path.basename(dir) === 'HEAD') {
		console.log('ignoring')
		return;
	}
	if (isPageDir(dir)) {
		processPageDir(dir);
	}
}

function onDirRemoved(dir) {
	console.log("Watcher.onDirRemoved: " + dir);
	if (path.basename(dir) === 'HEAD') {
		return;
	}
	buildDB();	
}

function onFileAdded(f) {
	console.log("Watcher.onFileAdded: " + f);
	if (path.basename(f) === 'page.json') {
		let dir = path.dirname(f);
		if (isPageDir(dir)) {
			processPageDir(dir);
		}
	}
}

function onFileChanged(f) {
	if (path.basename(f) === 'page.json') {
		let dir = path.dirname(f);
		let commitId = path.basename(dir);
		removePage(commitId);
		processPageDir(dir);
		sortPages();
	}
}

function onFileRemoved(f) {
	if (path.basename(f) == 'page.json') {
		let dir = path.dirname(f);
		let commitId = path.basename(dir);
		removePage(commitId);		
	}
}

buildDB(); // build the db
watchGallery(); // Start the watcher

exports.getPages = getPages;
exports.getPage = getPage;
exports.createPage = createPage;
