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


function logError(message, error) {
	console.log(message);
	console.log(error);
}


exports.getRepo = getRepo;
exports.getCommit = getCommit;
