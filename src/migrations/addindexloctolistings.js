const mongoDbUrl = require('../secrets').mongoDbUrl;
const dbName = require('../secrets').dbName;
const MongoClient = require('mongodb').MongoClient;

MongoClient
.connect(mongoDbUrl)
.then((db) => {
  const dbo = db.db(dbName);
  
  const collection = dbo.collection('listings');

  collection.createIndex( { 'location' : '2dsphere' } );
});
