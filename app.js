const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const hbs = require('hbs');

const routes = require('./routes/index');
const current = require('./routes/current');
const gallery = require('./routes/gallery');
const pages = require('./routes/page');
const head = require('./galleryHEAD');
const utils = require('./pageUtils');
const galleryRoot = utils.galleryRoot;

hbs.registerPartials(path.join(galleryRoot, 'views', 'partials'));

head.watchHead();

var app = express();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
app.set('views', [path.join(galleryRoot, 'views') /* , path.join(__dirname, 'views') */]);
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('node-sass-middleware')({
  src: galleryRoot,
  dest: galleryRoot,
  indentedSyntax: false,
  sourceMap: true
}));
app.use(require('node-sass-middleware')({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: false,
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/current', express.static(path.resolve('.')));
// app.use('/current.html', current);
app.use('/', gallery);

// app.use('/', routes);
// app.use('/users', users);
// app.use('/pages', gallery);

app.use(express.static(galleryRoot));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
