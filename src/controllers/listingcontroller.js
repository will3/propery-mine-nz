const geolib = require('geolib');
const request = require('request-promise');

function getLngDiff(lng) {
	return Math.abs(lng % 360);
}

module.exports = function(app, dbo) {
	app.get('/listings', (req, res) => {
		const bounds = req.query.bounds;
		const numbers = bounds.split(',');
		const swLat = parseFloat(numbers[0]);
		const swLng = parseFloat(numbers[1]);
		const neLat = parseFloat(numbers[2]);
		const neLng = parseFloat(numbers[3]);
		const width = getLngDiff(neLng - swLng);
		const height = swLng - swLat;
		const box = [ [ swLng, swLat ], [ neLng, neLat ] ];

		let page = req.query.page || 1;
		page = parseInt(page);
		const perPage = 24; 
		const skip = (page - 1) * perPage;

		const cursor = dbo.collection('listings').find({
			location: { $geoWithin: { $box: box } }
		});
		let total;
		cursor.count().then((count) => {
			total = count;
			return cursor.skip(skip).limit(perPage).toArray();	
		}).then((listings) => {
			const totalPages = Math.ceil(total / perPage);
			const meta = { total, page, totalPages, perPage };
			res.send({ listings, meta });
		}).catch((err) => {
			res.send(err);
		});
	});

	app.get('/clusters', (req, res) => {
		const bounds = req.query.bounds;
		const numbers = bounds.split(',');
		const swLat = parseFloat(numbers[0]);
		const swLng = parseFloat(numbers[1]);
		const neLat = parseFloat(numbers[2]);
		const neLng = parseFloat(numbers[3]);
		const width = getLngDiff(neLng - swLng);
		const height = swLng - swLat;
		const box = [ [ swLng, swLat ], [ neLng, neLat ] ];

		const intervals = [ 0.26401519775390625, 0.5280303955078125, 1.056060791015625, 2.11212158203, 4.22424316406, 8.44848632813, 16.8969726563 ];
		
		let intervalToUse = null;
		for (var i = intervals.length - 1; i >= 0; i--) {
			const number = intervals[i];
			if (width > number) {
				intervalToUse = number;
				break;
			}
		}

		if (intervalToUse != null) {
			dbo.collection('clusters').find({
				width: intervalToUse,
				center: {
					$geoWithin: {
						$box: box
					}
				}
			}).project({ width: 0 }).toArray().then((clusters) => {
				res.send({ clusters });
			}).catch((err) => {
				res.send(err);
			});
			return;
		}

		dbo.collection('listings').find({
			location: { $geoWithin: { $box: box } }
		})
		.project({ 'location.coordinates': 1 })
		.toArray()
		.then((listings) => {
			const result = getClusters(listings, width);
			res.send({
				clusters: result
			});
		}).catch((err) => {
			res.send(err);
		});
	});

	app.get('/listings/:id*', (req, res) => {
		const id = req.params.id;

		dbo.collection('listings').findOne({
			_id: id
		}).then((listing) => {
			if (listing == null) {
				res.status(404).send('Not found');
			} else {
				res.send(listing);	
			}
		}).catch((err) => {
			res.send(err);
		});
	});

	app.get('/properties', (req, res) => {
		console.log(req.query);
		const lng = req.query.lng;
		const lat = req.query.lat;
		// ?x=174.6720&y=-36.9101
		const url = `https://koordinates.com/services/query/v1/vector.json?key=eaede5c887354322993bb0dd973c49f0&x=${lng}&y=${lat}&layer=50804&geometry=true&with_field_names=true`;
		console.log(url);
		request(url).then((result) => {
			result = JSON.parse(result);
			res.setHeader('Content-Type', 'application/json');
			const property = {
				boundary: result.vectorQuery.layers['50804'].features[0].geometry
			};
			res.send(property);
		}).catch((err) => {
			res.send(err);
		});
	}); 
};

function getClusters(listings, width) {
	let gridSize = width * 0.1;
	if (width < 0.03) {
		gridSize = width * 0.03;
	}

	const listingGroups = {};
	for (var i = 0; i < listings.length; i++) {
		const listing = listings[i];
		if (listing.location == null) {
			continue;
		}
		const key = listing.location.coordinates[0] + ',' + listing.location.coordinates[1];
		if (listingGroups[key] == null) {
			listingGroups[key] = {
				listings: [],
				coords: listing.location.coordinates
			};
		}
		listingGroups[key].listings.push(listing);
	}

	const clusters = clusterListings(listingGroups, gridSize);
	const result = clusters.map((cluster) => {
		const c = {
			listingGroupCount: cluster.listingGroups.length,
			listingCount: cluster.listingCount,
			center: cluster.center,
			listingGroups: (cluster.listingGroups.length === 1 || width < 0.03) ? cluster.listingGroups : []
		}
		return c;
	});

	return result;
}

module.exports.getClusters = getClusters;

function clusterListings(listingGroups, gridSize) {
	const clusters = [];

	let count = 0;
	for (var id in listingGroups) {
		const listingGroup = listingGroups[id];
		let added = false;
		for (var i = 0; i < clusters.length; i++) {
			const cluster = clusters[i];
			if (cluster.distanceToSquared(listingGroup) <= gridSize) {
				cluster.add(listingGroup);
				added = true;
				break;
			}
		}

		if (!added) {
			const cluster = new Cluster();
			cluster.add(listingGroup);
			clusters.push(cluster);
		}

		count++;
	}

	return clusters;
};

class Cluster {
	constructor() {
		this.listingGroups = [];
		this.center = [ 0, 0 ];
		this.listingCount = 0;
	}

	add(listingGroup) {
		this.listingGroups.push(listingGroup);
		this.center[0] += (listingGroup.coords[0] - this.center[0]) / this.listingGroups.length;
		this.center[1] += (listingGroup.coords[1] - this.center[1]) / this.listingGroups.length;
		this.listingCount += listingGroup.listings.length;
	}

	distanceToSquared(listingGroup) {
		const lngDiff = getLngDiff(listingGroup.coords[0] - this.center[0]);
		const latDiff = listingGroup.coords[1] - this.center[1];
		return Math.sqrt(lngDiff * lngDiff + latDiff * latDiff);
	}
}