const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const repoUtils = require('./repoUtils');
const Promise = require('promise');

let commits;
let id2Commit;


function getCommit(id) {
	if (id === "HEAD") {
		return repoUtils.getHeadCommit().then(headId => getCommit(headId));
	}
	return ensureUpdated().then(() => id2Commit[id]);
}

function getCommits() {
	return ensureUpdated().then(() => commits);
}


function ensureUpdated() {
	if (commits) {
// console.log("Commits DB already up to date");
		return Promise.resolve();
	} else {
		return updateDB();
	}
}

function isDBValid() {
	return !!commits;
}

function updateDB() {
console.log("Updating commits DB");
	return repoUtils.getAllCommits().then(_commits => {
console.log('Found ' + _commits.length + ' commits');
		processCommits(_commits);
console.log('Processed commits');
		return commits;
	});
}


function processCommits(_commits) {
	commits = _commits;
	id2Commit = {};
	for (let i=0; i < commits.length; i++) {
		let c = commits[i];
		c.date = c.date();
		c.sha = c.sha();
		c.sha7 = c.sha.substring(0,7);
		id2Commit[c.sha] = c;
		id2Commit[c.sha7] = c;

		c.commitId = c.sha;
		c.body = c.body();
		c.author = c.author().toString();
		c.committer = c.committer().toString(),
		c.message = c.message();
		// c.parents = c.parents();
	}
	for (let i=0; i < commits.length; i++) {
		let c = commits[i];
		let next = i > 0 ? commits[i-1].sha : null;
		let prev = i < (commits.length-1) ? commits[i+1].sha : null;
		c.nextCommit = next;
		c.prevCommit = prev;
	}
}


function watchRepo() {
	let gitPath = path.join(path.resolve(process.cwd()), '.git');
	watcher = chokidar.watch(gitPath, { ignoreInitial: true });
	// watcher.on('all', (event, path) => { console.log(event, path); });
	watcher.on('addDir', repoChanged) // directory added
		.on('unlinkDir', repoChanged) // directory removed
		.on('add', repoChanged) // file added
		.on('change', repoChanged) // file changed
		.on('unlink', repoChanged) // file removed
		.on('error', error => console.log(`Repo watcher error: ${error}`));
}

function repoChanged() {
	commits = null;
	id2Commit = null;	
}


watchRepo();
updateDB();

exports.getCommit = getCommit;
exports.getCommits = getCommits;
