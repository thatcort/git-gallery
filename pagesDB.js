var fs = require('fs');
var chokidar = require('chokidar');
var path = require('path');

var utils = require('./pageUtils');
var galleryRoot = utils.galleryRoot;
var isPageDir = utils.isPageDir;
var readPageJSON = utils.readPageJSON;

var watcher; // gallery filesystem watcher

var pages;
var commit2Page;

function buildDB() {
	pages = [];
	commit2Page = {};
	// find all gallery directories with page.json files and create an in memory index of them
	var files = fs.readdirSync(galleryRoot);
	for (let f of files) {
// console.log("Processing file: " + f);
		let p = path.join(galleryRoot, f);
		// skip the HEAD symlink dir and any directory that is not a valid page
		if (f === 'HEAD' || !isPageDir(p)) {
// console.log("...skipping");
			continue;
		}
		// add the page to the db
		addPageDir(p);
	}

	sortPages();
console.log("PageDB: " + JSON.stringify(pages, null, 2));
}

function addPageDir(dir) {
	let page = readPageJSON(dir);

	pages.push(page);
	commit2Page[page.commitId] = page;
}

function removePage(commitRef) {
	let index = pages.findIndex(item => { return item.commitId === commitRef; });
	if (index >= 0) {
		pages.splice(index, 1);
	}
	delete commit2Page[commitRef];
}

function sortPages() {
	// sort all the entries by time
	pages.sort((a, b) => { return b.date - a.date; });
}

/** Returns the list of pages ordered by time */
function getPages() {
	return pages;
}

/** Returns the page.json for the given commit */
function getPage(commitRef) {
	return commit2Page[commitRef];
}


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
		addPageDir(dir);
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
			addPageDir(dir);
		}
	}
}

function onFileChaged(f) {
	if (path.basename(f) === 'page.json') {
		let dir = path.dirname(f);
		let commitRef = path.basename(dir);
		removePage(commitRef);
		addPageDir(dir);
		sortPages();
	}
}

function onFileRemoved(f) {
	if (path.basename(f) == 'page.json') {
		let dir = path.dirname(f);
		let commitRef = path.basename(dir);
		removePage(commitRef);		
	}
}

buildDB(); // build the db
watchGallery(); // Start the watcher

exports.getPages = getPages;
exports.getPage = getPage;
