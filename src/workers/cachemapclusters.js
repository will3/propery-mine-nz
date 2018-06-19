const connectDb = require('../db');

const getClusters = require('../controllers/listingcontroller').getClusters;

let dbo;

connectDb().then((db) => {
	dbo = db;
  return dbo.createCollection('clusters');
})
.then(() => {
	const projection = { 'location.coordinates': 1 };
	dbo.collection('listings').find({}).project(projection).toArray().then((listings) => {
		dbo.collection('clusters').deleteMany({});
		insertClusters(listings, 0.26401519775390625);
		insertClusters(listings, 0.5280303955078125);
		insertClusters(listings, 1.056060791015625);
		insertClusters(listings, 2.11212158203);
		insertClusters(listings, 4.22424316406);
		insertClusters(listings, 8.44848632813);
		insertClusters(listings, 16.8969726563);
		insertClusters(listings, 33.7939453126);
		insertClusters(listings, 67.5878906252);
	});
});

function insertClusters(listings, width) {
	const clusters = getClusters(listings, width);
	clusters.forEach((cluster) => {
		cluster.width = width;
		cluster.location = {
			type: 'Point',
			coordinates: cluster.center
		}
	});
	console.log('insert clusters for : ' + width);
	return dbo.collection('clusters').insertMany(clusters);
}