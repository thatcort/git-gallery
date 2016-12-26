const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('git-gallery');

const galleryRoot = path.resolve('./.gitGallery');


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



function readJson(file, callback) {
	fs.readFile(file, 'utf8', (error, data) => {
		if (error) {
			return callback(error);
		}
		return callback(null, JSON.parse(data, dateReviver));
	});	
}


function parseJson(data) {
	return JSON.parse(data, dateReviver);
}

function readJsonSync(file) {
	let data = fs.readFileSync(file, 'utf8');
	return parseJson(data);
}

function writeJson(data, file, options, callback) {
	if (typeof options === 'function') {
		callback = options;
		options = {};
	}
	let json = JSON.stringify(data, options.jsonReplacer, '\t');
	debug("About to write json file: " + json);
	fs.writeFile(file, json, options, callback);
}

exports.galleryRoot = galleryRoot;
exports.pathExists = pathExists;
exports.isDirectory = isDirectory;
exports.directoryExists = directoryExists;
exports.readJson = readJson;
exports.readJsonSync = readJsonSync;
exports.parseJson = parseJson;
exports.writeJson = writeJson;

