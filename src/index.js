const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const port = 3001;

const connectDb = require('./db');

connectDb().then((db) => {
	require('./controllers/listingcontroller')(app, db);
});

app.use(express.static('frontend/build'));

app.listen(port, () => console.log(`running on ${port}`));