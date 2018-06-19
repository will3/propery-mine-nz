const connectDb = require('../db');

connectDb().then((db) => {
  db.collection('listings').createIndex( { 'location' : '2dsphere' } );
  db.collection('listings').createIndex( { 'trademeId' : 1 } );
});
