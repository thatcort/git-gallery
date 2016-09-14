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
	if (ref === 'HEAD') {
		return getHeadCommit();
	}
	return getRepo().then(repo => repo.getCommit(ref));
}

function getHeadCommit() {
	return getRepo().then((repo) => {
		return Git.Reference.nameToId(repo, "HEAD").then(getCommit);
	});
}


function isWorkingDirClean() {
	return getRepo().then(repo => { return repo.getStatus() })
		.then(statuses => { return statuses.length === 0; });

// 	repo.getStatus().then(function(statuses) {
//       function statusToText(status) {
//         var words = [];
//         if (status.isNew()) { words.push("NEW"); }
//         if (status.isModified()) { words.push("MODIFIED"); }
//         if (status.isTypechange()) { words.push("TYPECHANGE"); }
//         if (status.isRenamed()) { words.push("RENAMED"); }
//         if (status.isIgnored()) { words.push("IGNORED"); }

//         return words.join(" ");
//       }

//       statuses.forEach(function(file) {
//         console.log(file.path() + " " + statusToText(file));
//       });
// });
}

function isHeadDetached() {
	return getRepo().then(repo => {
		Git.Reference.lookup(repo, 'HEAD').then(ref => {
			return !ref.isSymbolic();
		});
	});
}

function headStatus() {
	return isWorkingDirClean().then(isClean => {
		return isHeadDetached().then(isDetached => {
			return {
				isClean: isClean,
				isDetached: isDetached
			};
		});
	});
}

function logError(message, error) {
	console.log(message);
	console.log(error);
}


exports.getRepo = getRepo;
exports.getCommit = getCommit;
exports.getHeadCommit = getHeadCommit;
exports.isWorkingDirClean = isWorkingDirClean;
exports.isHeadDetached = isHeadDetached;
exports.headStatus = headStatus;
