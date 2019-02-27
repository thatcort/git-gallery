const fs = require("fs");
const path = require('path');
const hbs = require('hbs');
const debug = require('debug')('git-gallery');

const repo = require('./repoUtils');

const fsUtils = require('./fsUtils');
const galleryRoot = fsUtils.galleryRoot;
const pathExists = fsUtils.pathExists;
const isDirectory = fsUtils.isDirectory;
const directoryExists = fsUtils.directoryExists;
const readJson = fsUtils.readJson;
const readJsonSync = fsUtils.readJsonSync;
const parseJson = fsUtils.parseJson;
const writeJson = fsUtils.writeJson;



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
	readJson(f);
}


function readPageSync(dir) {
	let f = path.join(dir, 'page.json');
	return readJsonSync(f);
}

function writePage(page, jsonReplacer, callback) {
	let id = page.commitId;
	// ensure the diretory exists
	ensurePageDir(id, (error) => {
		if (error) {
			return console.log('Problem writing page: ' + error);
		}
		// write the page.json file	
		let dir = pageDir(page.commitId);
		let file = path.join(dir, 'page.json');
		return writeJson(page, file, {'jsonReplacer': jsonReplacer}, callback);
	});	
}




/** Data for the pagesDB */
function createRawPageForId(commitId, callback) {
	repo.getCommit(commitId).then(commit => callback(null, createRawPageForCommit(commit)), callback);
}
function createRawPageForCommit(commit) {
// console.log('createRawPageForCommit: ' + commit);
	let commitId = commit.sha();
	let page = {
		"commitId": commitId,
		"date": commit.date(),
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



exports.isPageDir = isPageDir;
exports.pageExists = pageExists;
exports.pageDir = pageDir;

exports.readPage = readPage;
exports.readPageSync = readPageSync;
exports.writePage = writePage;

exports.createRawPageForId = createRawPageForId;
exports.createRawPageForCommit = createRawPageForCommit;
