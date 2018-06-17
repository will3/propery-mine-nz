const connectDb = require('../db');

connectDb().then((db) => {
  const collection = db.collection('listings');
  collection.createIndex( { 'location' : '2dsphere' } );
});
