var express = require('express');
var router = express.Router();

var fs = require("fs");
var path = require('path');

router.use(function(req, res, next) {
	console.log('pagesRouter: %s %s %s', req.method, req.url, req.path);
	next();
});

var repoRouter = require('./repo');
router.use('/:commitRef/repo', repoRouter);

// router.use('/:commitRef/*', express.static(path.join(__dirname, '..', '.gitGallery')));

router.get('/:commitRef/*', function(req, res, next) {
	let root = path.join(__dirname, '..', '.gitGallery');
console.log('Sending file: ' + req.path + '   from dir: ' + root);
	res.sendFile(req.path, {root: root})
});

/* GET users listing. */
router.get('/:commitRef', function(req, res, next) {

console.log("router got " + req.path);
	//     if static file exists at the path
	//       return it
	//     if directory does not exist
	//       offer to create a new page
	//     else (if directory does exist, but path doesn't)
	//       return 404
	
	// res.send('path HELLO: ' + req.path);

	return loadPage(req, res, next);
});


function loadPage(req, res, next) {
console.log("loadPage: " + req.path);
	let jsonPath = path.join(__dirname, '../.gitGallery', req.params.commitRef, 'page.json');
	// console.log("looking for: " + jsonPath);
	let json = readJsonFileSync(jsonPath);
	json.commitRef = req.params.commitRef;
	res.render('page', json);
}


function readJsonFileSync(filepath, encoding){
	if (typeof (encoding) == 'undefined'){
		encoding = 'utf8';
	}
	var file = fs.readFileSync(filepath, encoding);
	return JSON.parse(file);
}

module.exports = router;
