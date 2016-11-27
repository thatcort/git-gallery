const fs = require('fs');
const path = require('path');
const debug = require('debug')('galleryHEAD');
const canSymlink = require('can-symlink');

const repo = require('./repoUtils');
const fsUtils = require('./fsUtils');
const galleryRoot = fsUtils.galleryRoot;

const headPath = path.join(galleryRoot, 'HEAD');
// var headTarget; // current target of the head dir

const GIT_POLL_INTERVAL = 2000;

var gitTimeout;

if (!canSymlink()) {
	console.error("Unable to create symlinks. Make sure your shell is running with appropriate permissions. On Windows run as Administrator.");
}


function updateHeadDir() {
	repo.getHeadCommit().then(function(commit) {
		getHeadDirTarget(function(error, currentTarget) {
			if (currentTarget) {
				currentTarget = path.basename(currentTarget);
			}
			// console.log('HEAD=' + commit.sha() + '. Dir links to: ' + currentTarget);
			let head = commit.sha();
			// console.log('HEAD and link are the same? ' + (head === currentTarget));
			if (error || head !== currentTarget) {
				try {
					// if HEAD dir exists, delete it
					fs.lstatSync(headPath);
					console.log("deleting current HEAD dir");
					fs.unlinkSync(headPath);
				} catch (e) {
					console.log("Can't delete HEAD directory.");
				}

				let target = path.join(galleryRoot, head);
				fs.symlink(target, headPath, 'dir', (error) => {
					if (error) {
						return console.log("Unable to create gallery HEAD directory: " + error);
					}
					console.log('Created new HEAD dir link');
				});
			}
		});
	}, function(error) {
		console.log("updateHeadDir Error: " + error);
	});
}


function getHeadDirTarget(cb) {
	fs.lstat(headPath, (err, stat) => {
		if (err) {
			debug("HEAD dir doesn't exist");
			return cb(err);
		}
		if (!stat.isSymbolicLink()) {
			console.log("HEAD dir exists but is not a symbolic link");
			return cb("HEAD dir exists but is not a symbolic link");
		}
		fs.readlink(headPath, cb);
	});
}

function watchHead() {
	gitTimeout = setInterval(updateHeadDir, GIT_POLL_INTERVAL);
	console.log("Watching Git repo for changes to HEAD.");
}

function unwatchHead() {
	if (gitTimeout) {
		clearInterval(gitTimeout);
		gitTimeout = null;
		console.log("Stopped watching Git repo for changes to HEAD.");
	}	
}

exports.watchHead = watchHead;
exports.unwatchHead = unwatchHead;

