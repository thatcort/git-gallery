const express = require('express');
const path = require("path");
const mime = require('mime');

const rUtils = require('../lib/repoUtils');

const router = express.Router({mergeParams: true});


/** GET file from repo */
router.get('/*', function(req, res, next) {

	rUtils.getCommit(req.params.commitRef).then(function(commit) {
		// console.log("loading from repo. commit: " + req.params.commitRef + "  path: " + req.path);
		commit.getEntry(req.path.substr(1)).then(function(treeEntry) {
			// console.log("Got TreeEntry: " + treeEntry + "   isBlob? " + treeEntry.isBlob());
			// console.log("mime type: " + mime.lookup(treeEntry.name()));
			res.type(mime.lookup(req.path));
			if (treeEntry.isBlob()) {
				treeEntry.getBlob().then(function(blob) {
					// console.log("Sending content: " + blob.content());
					res.send(blob.content());
				}, function(error) {
					logError("Problem retrieving tree entry blob from git: " + treeEntry.name(), error);
				});
			}
		}, function (error) {
			logError("Problem retrieving tree entry from git: " + req.path, error);
		});
	}, function(error) {
		logError("Problem retrieving tree entry from git. commit: " + req.params.commitRef + "  path: " + req.path, error);
	});

	// TODO: handle directory listing for '/'

	// res.send('TODO: Return ' + req.path + ' from the Git repo for commit ' + req.params.commitRef);

});


function logError(message, error) {
	console.log(message);
	console.log(error);
}


exports.router = router;

// module.exports = router;
