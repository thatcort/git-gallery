const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const repoUtils = require('./repoUtils');
const Promise = require('promise');

let commits;
let id2Commit;


function getCommit(id) {
	ensureUpdated().then(() => id2Commit[id]);
}

function getCommits() {
	ensureUpdated().then(() => commits);
}


function ensureUpdated() {
	if (commits) {
		return new Promise((resolve, reject) => resolve());
	} else {
		return updateDB();
	}
}

function isDBValid() {
	return !!commits;
}

function updateDB() {
	repoUtils.getAllCommits().then(_commits => {
		processCommits(_commits);
		commits = _commits;
		return commits;
	});
}


function processCommits(commits) {
	for (let i=0; i < commits.length; i++) {
		let c = commits[i];
		let next = i > 0 ? commits[i-1] : null;
		let prev = i < (commits.length-1) ? commits[i+1] : null;
		c.date = c.date();
		c.sha = c.sha();
		c.sha7 = c.sha.substring(0,7);
		c.nextCommit = next;
		c.prevCommit = prev;
		id2Commit[c.sha] = c;
		id2Commit[c.sha7] = c;
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
