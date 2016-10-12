const express = require('express');
const Git = require('nodegit');
const path = require("path");
const Promise = require('promise');

const hbs = require('hbs');

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
	return getRepo().then(repo => {
		return Git.Reference.nameToId(repo, "HEAD").then(getCommit);
	});
}

function getAllCommits() {
	return getRepo()
		.then(repo => {
			return repo.getReferenceNames(Git.Reference.TYPE.LISTALL);//SYMBOLIC)
		}).then(refs => {
console.log("FOUND REFS: " + refs);
			let walk = Git.Revwalk.create(repo);
			refs.forEach(ref => {
				let code = walk.pushRef(ref);
				if (code) logError("Problem adding reference to Git Revwalk: " + ref, null);
			});
			walk.sorting(Git.Revwalk.SORT.TIME);
			return walk.getCommits(100);
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
		let detached = repo.headDetached();
		if (detached < 0 || detached > 1)
			throw "Error determining if HEAD detached.";
		return !!detached;
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

function repoStatus() {
	let repo;
	let status;
	return headStatus().then(_status => {
		status = _status;
		return getRepo();
	})
	.then(_repo => {
		repo = _repo;
		return repo.getCurrentBranch();
	})
	.then(branch => {
		status.branch = branch.toString(); 
		return repo.getStatus();
	})
	.then(statuses => {
		statuses.forEach((file, index) => {
			statuses[index].description = statusToText(file);
		});
		status.status = statuses;
		return status;
	});
}

function statusToText(status) {
	var words = [];
	if (status.isNew()) { words.push("NEW"); }
	if (status.isModified()) { words.push("MODIFIED"); }
	if (status.isTypechange()) { words.push("TYPECHANGE"); }
	if (status.isRenamed()) { words.push("RENAMED"); }
	if (status.isIgnored()) { words.push("IGNORED"); }
	if (status.isDeleted()) { words.push("DELETED"); }
	if (status.isConflicted()) { words.push("CONFLICTED"); }
	return words.join(" ");

}

function commitAllChanges(message) {
	let repo;
	let index;
	let oid;
	return getRepo()
		.then(_repo => {repo = _repo; return repo.refreshIndex(); })
		.then(_index => { index = _index; return index.addAll() })
		.then(() => index.write())
		.then(() => index.writeTree())
		.then(_oid => {
			oid = _oid;
			return Git.Reference.nameToId(repo, 'HEAD');
		})
		.then(parent => {
			let sig = Git.Signature.default(repo);
			return repo.createCommit("HEAD", sig, sig, message, oid, [parent]);
		});
}

function logError(message, error) {
	console.log(message);
	console.log(error);
}


exports.getRepo = getRepo;
exports.getCommit = getCommit;
exports.getHeadCommit = getHeadCommit;
exports.getAllCommits = getAllCommits;
exports.isWorkingDirClean = isWorkingDirClean;
exports.isHeadDetached = isHeadDetached;
exports.headStatus = headStatus;
exports.repoStatus = repoStatus;
exports.commitAllChanges = commitAllChanges;
