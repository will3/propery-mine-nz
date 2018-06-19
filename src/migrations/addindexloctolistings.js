const connectDb = require('../db');

connectDb().then((db) => {
  db.collection('listings').createIndex( { 'location' : '2dsphere' } );
  db.collection('listingsTest').createIndex( { 'trademeId' : 1 } );
  db.collection('listingsTest').createIndex( { 'location' : '2dsphere' } );
});
