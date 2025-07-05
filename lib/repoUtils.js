const simpleGit = require('simple-git');
const path = require("path");
const fs = require('fs-extra');

const hbs = require('hbs');

const repoPath = path.resolve(process.cwd());
var git;

function getRepo() {
	return new Promise(function(fulfill, reject) {
		if (git) {
			fulfill(git);
		} else {
			try {
				git = simpleGit(repoPath);
				fulfill(git);
			} catch (error) {
				logError("Unable to open Git repo: " + repoPath, error);
				reject(error);
			}
		}
	});
}

function getCommit(ref) {
	if (ref === 'HEAD') {
		return getHeadCommit();
	}
	// For simple compatibility, just return the ref if it's a valid commit hash
	// The repo.js route only needs the commit reference, not the full commit object
	return Promise.resolve(ref);
}

function getHeadCommit() {
	return getRepo().then(git => {
		return git.log({ maxCount: 1 }).then(log => {
			const commit = log.latest;
			return {
				sha: commit.hash,
				author: {
					name: commit.author_name,
					email: commit.author_email
				},
				date: new Date(commit.date),
				message: commit.message
			};
		});
	});
}

function getCommits(maxCount) {
	return getRepo()
		.then(git => {
			return git.log({ maxCount: maxCount || 1000 });
		}).then(log => {
			return log.all.map(commit => ({
				sha: commit.hash,
				author: {
					name: commit.author_name,
					email: commit.author_email
				},
				date: new Date(commit.date),
				message: commit.message
			}));
		});	
}

function getAllCommits() {
	return getCommits(1000);
}

function getLatestCommit() {
	return getCommits(1).then(commits => commits[0]);
}


function isWorkingDirClean() {
	return getRepo().then(git => { return git.status() })
		.then(status => { return status.files.length === 0; });
}

function isHeadDetached() {
	return getRepo().then(git => {
		return git.revparse(['--abbrev-ref', 'HEAD']).then(branch => {
			return branch.trim() === 'HEAD';
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

function repoStatus() {
	let git;
	let status;
	return headStatus().then(_status => {
		status = _status;
		return getRepo();
	})
	.then(_git => {
		git = _git;
		return git.revparse(['--abbrev-ref', 'HEAD']);
	})
	.then(branch => {
		status.branch = branch.trim(); 
		return git.status();
	})
	.then(gitStatus => {
		gitStatus.files.forEach((file, index) => {
			gitStatus.files[index].description = statusToText(file);
		});
		status.status = gitStatus.files;
		return status;
	});
}

function statusToText(file) {
	var words = [];
	if (file.index === '?') { words.push("NEW"); }
	if (file.index === 'M' || file.working_dir === 'M') { words.push("MODIFIED"); }
	if (file.index === 'R' || file.working_dir === 'R') { words.push("RENAMED"); }
	if (file.index === 'D' || file.working_dir === 'D') { words.push("DELETED"); }
	if (file.index === 'U' || file.working_dir === 'U') { words.push("CONFLICTED"); }
	return words.join(" ");

}

function commitAllChanges(message) {
	return getRepo()
		.then(git => {
			return git.add('.')
				.then(() => git.commit(message));
		});
}


function restoreCommit(ref, dir, filter) {
	return getRepo()
		.then(git => {
			return git.raw(['ls-tree', '-r', '--name-only', ref])
				.then(output => {
					const files = output.trim().split('\n').filter(f => f);
					const promises = files.map(filePath => {
						if (filter && !filter(filePath))
							return Promise.resolve();
						
						const fullPath = path.join(dir, filePath);
						return git.show([ref + ':' + filePath])
							.then(content => {
								fs.ensureDirSync(path.dirname(fullPath));
								return fs.writeFile(fullPath, content);
							});
					});
					return Promise.all(promises);
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
exports.getCommits = getCommits;
exports.getAllCommits = getAllCommits;
exports.getLatestCommit = getLatestCommit;
exports.isWorkingDirClean = isWorkingDirClean;
exports.isHeadDetached = isHeadDetached;
exports.headStatus = headStatus;
exports.repoStatus = repoStatus;
exports.commitAllChanges = commitAllChanges;
exports.restoreCommit = restoreCommit;
