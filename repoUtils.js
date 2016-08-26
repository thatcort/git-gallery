const express = require('express');
const Git = require('nodegit');
const path = require("path");
const Promise = require('promise');

const repoPath = path.resolve(process.cwd());
var repo;

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

function getCommit(ref) {
	return new Promise(function(fulfill, reject) {
		getRepo().then(function(repo) {
			// console.log("GOT REPO");
			repo.getCommit(ref).then(function(commit) {
				// console.log("GOT COMMIT: " + ref);
				fulfill(commit);
			}, function(error) {
				logError("Unable to get commit: " + ref, error);
				reject(error);
			});
		});
	});
}

function getHeadCommit() {
	return getRepo().then((repo) => {
		return Git.Reference.nameToId(repo, "HEAD").then((head) => {
			return getCommit(head);
		});
	});
}

// function getHeadCommit() {
// 	return new Promise(function(fulfill, reject) {
// console.log('Getting HEAD...');
// 		getRepo().then(function(repo) {
// 			console.log("GOT REPO");
// 			// console.log('getHeadCommit: ' + repo.getHeadCommit);
// 			// repo.
// 			repoGetHeadCommit().then(function(commit) {
// 				console.log("GOT HEAD: " + ref);
// 				fulfill(commit);
// 			}, function(error) {
// 				logError("Unable to get HEAD commit: " + ref, error);
// 				reject(error);
// 			});
// 		});
// 	});
// }


function repoGetHeadCommit() {
	return Git.Reference.nameToId(repo, "HEAD").then(function (head) {
console.log("nameToId: HEAD=" + head);
		return getCommit(head);
	}, function(e) {
		console.error(e);
	});
}


function logError(message, error) {
	console.log(message);
	console.log(error);
}


exports.getRepo = getRepo;
exports.getCommit = getCommit;
exports.getHeadCommit = getHeadCommit;
