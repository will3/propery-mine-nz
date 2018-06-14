const mongoDbUrl = require('../secrets').mongoDbUrl;
const dbName = require('../secrets').dbName;
const MongoClient = require('mongodb').MongoClient;

MongoClient
.connect(mongoDbUrl)
.then((db) => {
  const dbo = db.db(dbName);
  
  const collection = dbo.collection('listings');
  let count = 0;
  collection.count().then((total) => {
  	collection.find({}).forEach((doc) => {
	    if (doc.mapState == null) {
	    	return;
	    }

	    const location = {
	    	type: 'Point',
				coordinates: [ doc.mapState.lng, doc.mapState.lat ]
	    };
	    collection.updateOne({ _id: doc._id }, { 
	    	$unset: { loc : 1 },
	    	$set : { location } 
	    })
	    .then(() => {
	    	count ++;
	    	console.log(count + ' / ' + total);
	    })
	    .catch((err) => {
	      throw err;
	    });
	  });  
  });
})
