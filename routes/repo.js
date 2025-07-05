const express = require('express');
const path = require("path");
const mime = require('mime');

const rUtils = require('../lib/repoUtils');

const router = express.Router({mergeParams: true});


/** GET file from repo */
router.get('/*', function(req, res, next) {
	const filePath = req.path.substr(1); // Remove leading slash
	const commitRef = req.params.commitRef;
	
	// console.log("loading from repo. commit: " + commitRef + "  path: " + filePath);
	
	rUtils.getRepo().then(function(git) {
		// Use git show to get file content: git show commit:path
		const gitPath = commitRef + ':' + filePath;
		
		git.show([gitPath]).then(function(content) {
			// Set the correct MIME type
			res.type(mime.getType(req.path) || 'application/octet-stream');
			res.send(content);
		}).catch(function(error) {
			// File might not exist or might be a directory
			if (filePath === '' || filePath === '/') {
				// Handle root directory listing
				git.raw(['ls-tree', '--name-only', commitRef]).then(function(listing) {
					res.type('text/plain');
					res.send('Directory listing:\n' + listing);
				}).catch(function(listError) {
					logError("Problem listing directory from git: " + filePath, listError);
					res.status(404).send('Directory not found');
				});
			} else {
				// Check if it's a directory by trying to list it
				git.raw(['ls-tree', '--name-only', commitRef, filePath]).then(function(result) {
					if (result.trim()) {
						// It exists, check if it's a directory by trying to list contents
						git.raw(['ls-tree', '--name-only', commitRef + ':' + filePath]).then(function(listing) {
							res.type('text/plain');
							res.send('Directory listing for ' + filePath + ':\n' + listing);
						}).catch(function(listError) {
							// Not a directory, file doesn't exist
							logError("File not found in git: " + filePath, error);
							res.status(404).send('File not found');
						});
					} else {
						// File doesn't exist
						logError("File not found in git: " + filePath, error);
						res.status(404).send('File not found');
					}
				}).catch(function(checkError) {
					logError("Problem checking file/directory in git: " + filePath, checkError);
					res.status(404).send('File not found');
				});
			}
		});
	}).catch(function(error) {
		logError("Problem getting git repository", error);
		res.status(500).send('Repository error');
	});
});


function logError(message, error) {
	console.log(message);
	console.log(error);
}


exports.router = router;

// module.exports = router;
