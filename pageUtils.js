var fs = require("fs");
var path = require('path');
var hbs = require('hbs');

var repo = require('./routes/repo');

var galleryRoot = path.resolve('./.gitGallery'); // path.join(__dirname, '.gitGallery');

function pathExists(f) {
	try {
		fs.accessSync(f, fs.constants.R_OK | fs.constants.W_OK);
	} catch (e) {
// console.log('Path does not exist: ' + f);
		return false;
	}
// console.log('Path does exist: ' + f);
	return true;
}

function isDirectory(f) {
// console.log('isDirectory: ' + f + ': ' + fs.statSync(f).isDirectory());
	return fs.statSync(f).isDirectory();
}

function directoryExists(f) {
	return pathExists(f) && isDirectory(f);
}

function pageDir(commitRef) {
	return path.join(galleryRoot, commitRef);
}

function isPageDir(dir) {
	let exists = pathExists(dir) && isDirectory(dir);
// console.log("directory exists for " + dir + '? ' + exists);
	if (!exists) {
		return false;
	}
	let page = readPageJSON(dir);
// console.log('basename ' + path.basename(dir));
	return path.basename(dir) === page.commitId;
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
	let dir = pageDir(commitRef);
	fs.mkdir(dir, function(error) {
		if (error) {
			callback(error);
			return;
		}
// console.log("about to create page json");
		// create and add a json file to the directory
		createPageJson(commitRef, (error, data) => {
			if (error) {
				callback(error);
				return;
			} else {
				let json = JSON.stringify(data, null, '\t');
				console.log("About to write page json file: " + json);
				fs.writeFile(path.join(dir, 'page.json'), json, (error) => { 
// console.log("Wrote file or failed");
					callback(error);
					return;
				});
			}
		});
	});
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