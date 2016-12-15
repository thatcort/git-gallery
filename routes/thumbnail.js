const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

const debug = require('debug')('git-gallery');

const fsUtils = require('../lib/fsUtils');
const galleryRoot = fsUtils.galleryRoot;

const sharp = require('sharp');

/**
 * source can be a file path or an image buffer.
 * Returns a promise
 */
function makeThumbnail(source, outputPath, width, height) {
	return sharp(source)
		.resize(width, height)
		.max()
		.toFile(outputPath);
}

function register(rootDir, options) {
	rootDir = path.normalize(rootDir);

	options = options || {};
	options.cacheDir = options.cacheDir || path.join(rootDir, '.thumb'); // cache folder, default to [root dir]/.thumb
	fs.ensureDirSync(options.cacheDir);

	return function (req, res, next) {
		var filename = decodeURI(req.url.replace(/\?(.*)/, ''));
		var filepath = path.join(rootDir, filename);
		var dimension = req.query.thumb || '';
		var dimensions = dimension.split('x');

		let ext = path.extname(filename);
		let pathObj = {
			dir: path.join(options.cacheDir, path.dirname(filename)),
			name: path.basename(filename, ext), //  + '_' + dimension,
			ext: ext
		}
		var location = path.format(pathObj);
		// console.log("Thumbnail output location: " + location);

		fs.stat(filepath, function (err, sourceStats) {

			// go forward
			if (err || !sourceStats.isFile()) { return next(); }

			// send original file
			if (!dimension) { return res.sendFile(filepath); }

			// send converted file
			fs.stat(location, function(err, outputStats) {

				if (!err && outputStats.isFile()) {
					return res.sendFile(location);
				}

				fs.ensureDir(pathObj.dir, (error) => {
					if (error) {
						return console.log("Problem creating thumbnail directory: " + pathObj.dir);
					}

					// convert and send
					makeThumbnail(filepath, location, +dimensions[0], +dimensions[1])
					.then(data => {
						return res.sendFile(location);
					}, error => {
						console.log("Problem creating thumbnail: " + error);
					});
				});
			});
		});
	};
}
exports.register = register;