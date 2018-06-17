const connectDb = require('../db');

connectDb().then((db) => {
  const collection = db.collection('listings');
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
