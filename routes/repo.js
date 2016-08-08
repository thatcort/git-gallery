var express = require('express');
var Git = require('nodegit');
var path = require("path");
var mime = require('mime');
var Promise = require('promise');

var router = express.Router({mergeParams: true});

var repoPath = path.resolve(process.cwd());

var repo;

/* GET users listing. */
router.get('/*', function(req, res, next) {

	getCommit(req.params.commitRef).then(function(commit) {
		console.log("loading from repo. commit: " + req.params.commitRef + "  path: " + req.path);
		commit.getEntry(req.path.substr(1)).then(function(treeEntry) {
			console.log("Got TreeEntry: " + treeEntry + "   isBlob? " + treeEntry.isBlob());
			console.log("mime type: " + mime.lookup(treeEntry.name()));
			res.type(mime.lookup(req.path));
			if (treeEntry.isBlob()) {
				treeEntry.getBlob().then(function(blob) {
					console.log("Sending content: " + blob.content());
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


function getRepo() {
	return new Promise(function(fulfill, reject) {
		if (repo) {
			fulfill(repo);
		} else {
			Git.Repository.open(repoPath).then(function(repository) {
				repo = repository;
				fulfill(repo);
			}, function(error) {
				logError("Unable to open Git repo: " + repoPath, error);
				reject(error);
			});
		}
	});
}

// function getRepo(callback) {
// 	if (repo) {
// 		return callback(null, repo);
// 	} else {
// 		Git.Repository.open(repoPath).then(function(repository) {
// 			repo = repository;
// 			return callback(null, repo);
// 		}, function(error) {
// 			console.log("Unable to open Git repo: " + repoPath);
// 			console.log(error);
// 			return callback(error);
// 		});
// 	}
// }

function getCommit(ref) {
	return new Promise(function(fulfill, reject) {
		getRepo().then(function(repo) {
			repo.getCommit(ref).then(function(commit) {
				fulfill(commit);
			}, function(error) {
				logError("Unable to get commit: " + ref, error);
				reject(error);
			});
		});
	});
}

// function getCommit(ref, callback) {
// 	getRepo(function(error, repo) {
// 		if (error) {
// 			return;
// 		}
// 		repo.getCommit(ref).then(function(commit) {
// 			return callback(null, commit);
// 		}, function(error) {
// 			return callback(error);
// 		});
// 	});
// }

function logError(message, error) {
	console.log(message);
	console.log(error);
}


module.exports = router;
