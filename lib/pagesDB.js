const fs = require('fs');
const chokidar = require('chokidar');
const path = require('path');

const debug = console.log; // require('debug')('git-gallery');

const pageUtils = require('./pageUtils');
const fsUtils = require('./fsUtils');
const galleryRoot = fsUtils.galleryRoot;

const isPageDir = pageUtils.isPageDir;

var watcher; // gallery filesystem watcher

const transientPageProperties = ['isHead', 'isClean', 'prevPage', 'nextPage', 'prevCommit', 'nextCommit', '_locals']; // page properties not to be written to disk

var pages;
var commit2Page;
var dirties = {}; // a queue of objects that have been marked dirty and need to be written to disk
var dirtyIgnores = {}; // page properties not to mark dirty on
for (prop of transientPageProperties) {
	dirtyIgnores[prop] = true;
}


var pageJsonReplacer = function(key, value) {
	if (transientPageProperties.indexOf(key) >= 0) {
		return undefined;
	}
	return value;
}

var DirtyHandler = function(root) {
	this.root = root;

	this.set = (obj, prop, value) => {
		if (!dirtyIgnores[prop]) {
			debug('Dirty: ' + prop + ' of ' + obj.commitId);
			markDirty(this.root);
		}
		if (value && typeof value === 'object') {
			value = new Proxy(value, this);
		}
		obj[prop] = value;
		return true;
	};
}


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

	pageUtils.writePage(page, pageJsonReplacer, (error) => {
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
	pageUtils.createRawPageForId(commitId, (error, obj) => {
		if (error) {
			return callback(error);
		}
		let page = addRawPage(obj);
		markDirty(page);
		callback(null, page);
	});
}

function addRawPage(obj) {
	let dh = new DirtyHandler(obj);
	for (let i=0; i < obj.images.length; i++) {
		obj.images[i] = new Proxy(obj.images[i], dh);
	}
	obj.images = new Proxy(obj.images, dh);
	let page = new Proxy(obj, dh);

	// remove old version of page
	let old = commit2Page[page.commitId];
	if (old) {
		pages.splice(pages.indexOf(old), 1);
	}

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
	let obj = pageUtils.readPageSync(dir);
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

	for (let i=0; i < pages.length; i++) {
		let prevInd = i - 1;
		let nextInd = i + 1;
		let p = pages[i];
		p.nextPage = (prevInd >= 0 ? pages[prevInd].commitId : null);
		p.prevPage = (nextInd < pages.length ? pages[nextInd].commitId : null);
	}
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
