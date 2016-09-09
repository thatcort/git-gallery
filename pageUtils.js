const fs = require("fs");
const path = require('path');
const hbs = require('hbs');
const debug = require('debug')('git-gallery');

const repo = require('./repoUtils');

const galleryRoot = path.resolve('./.gitGallery'); // path.join(__dirname, '.gitGallery');

const transientPageProperties = ['isHead', 'isClean', 'prevCommit', 'nextCommit', '_locals']; // page properties not to be written to disk

function dateReviver(key, value) {
	var a;
	if (typeof value === 'string') {
		a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)(Z|([+\-])(\d{2}):(\d{2}))$/.exec(value);
		// a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
		if (a) {
			return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]));
		}
	}
	return value;
}

function pathExists(f) {
	try {
		fs.accessSync(f, fs.constants.R_OK | fs.constants.W_OK);
	} catch (e) {
// console.log('Path does not exist: ' + f);
		return false;
	}
// console.log('Path does exist: ' + f);
	let stats = fs.lstatSync(f);
	if (stats.isSymbolicLink()) {
		return pathExists(fs.readlinkSync(f));
	} else {
		return true;
	}
}

function isDirectory(f) {
// console.log('isDirectory: ' + f + ': ' + fs.statSync(f).isDirectory());
	return fs.statSync(f).isDirectory();
}

function directoryExists(f) {
	return pathExists(f) && isDirectory(f);
}

function pageDir(commitRef) {
	// console.log('pageDir: ' + commitRef + ' type: ' + typeof(commitRef) + '  base: ' + galleryRoot);
	// let result = path.join(galleryRoot, commitRef);
	// console.log('pageDir result: ' + result);
	return path.join(galleryRoot, commitRef);
}

// function isSymbolicLinkDirectory(dir) {
// 	let stats = fs.lstatSync(f);
// 	return stats.isDirectory() && stats.isSymbolicLink();
// }

function isPageDir(dir) {
	let exists = pathExists(dir) && isDirectory(dir);
// console.log("directory exists for " + dir + '? ' + exists);
	if (!exists) {
		return false;
	}
	let pageExists = pathExists(path.join(dir, 'page.json'));
	// let page = readPageJSON(dir);
// console.log('basename ' + path.basename(dir));
	return pageExists; //  && path.basename(dir) === page.commitId;
}

function pageExists(commitRef) {
	let dir = pageDir(commitRef);
	return isPageDir(dir);
}

function ensurePageDir(commitRef, callback) {
	let dir = pageDir(commitRef);
	if (!directoryExists(dir)) {
		return createPageDir(commitRef, callback);
	} else {
		return callback();
	}
}

function createPageDir(commitRef, callback) {
	if (commitRef === 'HEAD') {
		return repo.getHeadCommit().then(head => createPageDir(head.sha(), callback));
	} else {
		let dir = pageDir(commitRef);
		debug('About to make dir: ' + dir);
		fs.mkdir(dir, callback);
	}
}

function readPage(dir, callback) {
	let f = path.join(dir, 'page.json');
	fs.readFile(f, 'utf8', (error, data) => {
		if (error) {
			return callback(error);
		}
		return callback(null, JSON.parse(data, dateReviver));
	});	
}

function readPageSync(dir) {
	let f = path.join(dir, 'page.json');
	let data = fs.readFileSync(f, 'utf8');
	return JSON.parse(data, dateReviver);
}

function writePage(page, callback) {
	let id = page.commitId;
	// ensure the diretory exists
	ensurePageDir(id, (error) => {
		if (error) {
			return console.log('Problem writing page: ' + error);
		}
		// write the page.json file	
		let json = JSON.stringify(page, null, '\t');
		debug("About to write page json file: " + json);
		let dir = pageDir(page.commitId);
		fs.writeFile(path.join(dir, 'page.json'), json, (error) => { 
			debug("Wrote file or failed");
			return callback(error);
		});		
	});	
}


function createPageForId(commitId, callback) {
	repo.getCommit(commitId).then(commit => callback(null, createPageForCommit(commit)), callback);
}
function createPageForCommit(commit) {
	let commitId = commit.sha();
	let page = {
		"commitId": commitId,
		"date": commit.date(), //.toJSON(),
		"body": commit.body(),
		"author": commit.author().toString(),
		"committer": commit.committer().toString(),
		"message": commit.message(),
		"parents": commit.parents(),
		"title": "",
		"comment": "",
		"images": []
	};
	return page;
}

function registerHandlebarsHelper(name, helper) {
	hbs.handlebars.registerHelper(name, helper);
}

registerHandlebarsHelper('dateTime', (date) => { return date.toLocaleString(); });
registerHandlebarsHelper('date', (date) => { return date.toDateString(); });
registerHandlebarsHelper('time', (date) => { return date.toLocaleTimeString(); });



exports.transientPageProperties = transientPageProperties;
exports.galleryRoot = galleryRoot;
exports.pathExists = pathExists;
exports.isDirectory = isDirectory;
exports.directoryExists = directoryExists;
exports.isPageDir = isPageDir;
exports.pageExists = pageExists;
exports.pageDir = pageDir;
exports.readPage = readPage;
exports.readPageSync = readPageSync;
exports.writePage = writePage;
exports.createPageForId = createPageForId;
exports.createPageForCommit = createPageForCommit;
