var fs = require("fs");
var path = require('path');
var hbs = require('hbs');
const debug = require('debug')('git-gallery');

var repo = require('./repoUtils');

var galleryRoot = path.resolve('./.gitGallery'); // path.join(__dirname, '.gitGallery');

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
console.log('pageDir: ' + commitRef + 'type: ' + typeof(commitRef) + '  base: ' + galleryRoot);
let result = path.join(galleryRoot, commitRef);
console.log('pageDir result: ' + result);
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

function readPageJSON(dir) {
	let f = path.join(dir, 'page.json');
	return readJsonFileSync(f);
}

function readJsonFileSync(filepath, encoding) {
	if (typeof (encoding) == 'undefined') {
		encoding = 'utf8';
	}
	var file = fs.readFileSync(filepath, encoding);
	return JSON.parse(file);
}

function createPage(commitRef, callback) {
	debug('createPage: ' + commitRef);
	if (commitRef === 'HEAD') {
		return repo.getHeadCommit().then(head => createPage(head.sha(), callback));
	} else {
		let dir = pageDir(commitRef);
		debug('About to make dir: ' + dir);
		fs.mkdir(dir, function(error) {
			if (error) {
				debug("Problem creating dir: " + error);
				callback(error);
				return;
			}
			debug("about to create page json");
			// create and add a json file to the directory
			createPageJson(commitRef, (error, data) => {
				if (error) {
					return callback(error);
				} else {
					return writePageJson(commitRef, data, callback);
				}
			});
		});
	}
}

function writePageJson(commitRef, data, callback) {
	if (commitRef === 'HEAD') {
		return repo.getHeadCommit().then(head => writePageJSON(head.sha(), json, callback));
	} else {
		let dir = pageDir(commitRef);
		// if (!directoryExists(dir)) {
		// 	debug('About to make dir: ' + dir);
		// 	try {
		// 		fs.mkdirSync(dir);
		// 	} catch (error) {
		// 		debug("Problem creating dir: " + error);
		// 		return callback(error);
		// 	}
		// }
		let json = JSON.stringify(data, null, '\t');
		debug("About to write page json file: " + json);
		fs.writeFile(path.join(dir, 'page.json'), json, (error) => { 
			debug("Wrote file or failed");
			callback(error);
			return;
		});

	}
}

function createPageJson(commitRef, callback) {
	repo.getCommit(commitRef).then(function(commit) {
		callback(null, {
			"commitId": commitRef,
			"date": commit.date(), //.toJSON(),
			"body": commit.body(),
			"author": commit.author().toString(),
			"committer": commit.committer().toString(),
			"message": commit.message(),
			"parents": commit.parents(),
			"title": "",
			"comment": "",
			"images": []
		});
	}, function(error) {
		callback(error);
	});
}

function registerHandlebarsHelper(name, helper) {
	hbs.handlebars.registerHelper(name, helper);
}

registerHandlebarsHelper('dateTime', (date) => { return date.toLocaleString(); });



exports.galleryRoot = galleryRoot;
exports.pathExists = pathExists;
exports.isDirectory = isDirectory;
exports.directoryExists = directoryExists;
exports.isPageDir = isPageDir;
exports.pageExists = pageExists;
exports.pageDir = pageDir;
exports.readPageJSON = readPageJSON;
exports.createPage = createPage;
exports.createPageJson = createPageJson;
exports.writePageJson = writePageJson;