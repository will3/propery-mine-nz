const geolib = require('geolib');

module.exports = function(app, dbo) {
	app.get('/listings', (req, res) => {
		const bounds = req.query.bounds;
		const numbers = bounds.split(',');
		const swLat = parseFloat(numbers[0]);
		const swLng = parseFloat(numbers[1]);
		const neLat = parseFloat(numbers[2]);
		const neLng = parseFloat(numbers[3]);
		const width = neLng - swLng;
		const height = swLng - swLat;
		const box = [ [ swLng, swLat ], [ neLng, neLat ] ];
		const projection = { 'location.coordinates': 1 };
		
		dbo.collection('listings').find({
			location: {
				$geoWithin: {
					$box: box
				}
			}
		})
		.project(projection)
		.toArray()
		.then((listings) => {
			const clusters = clusterListings(listings);
			const result = clusters.map((cluster) => {
				const c = {
					listingCount: cluster.listings.length,
					center: cluster.center,
					listing: cluster.listings.length === 1 ? cluster.listings[0] : null
				}
				return c;
			});
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
		});;
	});
};

function clusterListings(listings) {
	const gridSize = 600;
	const clusters = [];

	listings.forEach((listing) => {
		let added = false;
		for (var i = 0; i < clusters.length; i++) {
			const cluster = clusters[i];
			if (cluster.distanceTo(listing) < gridSize) {
				cluster.addListing(listing);
				added = true;
				break;
			}
		}

		if (!added) {
			const cluster = new Cluster();
			cluster.addListing(listing);
			clusters.push(cluster);
		}
	});

	return clusters;
};

class Cluster {
	constructor() {
		this.listings = [];
	}

	addListing(listing) {
		this.listings.push(listing);
		this.calcCenter();
	}

	calcCenter() {
		const coordinates = this.listings.map((listing) => {
			return { latitude: listing.location.coordinates[1], longitude: listing.location.coordinates[0] };
		});
		this.center = geolib.getCenter(coordinates);
	}

	distanceTo(listing) {
		const coord = { latitude: listing.location.coordinates[1], longitude: listing.location.coordinates[0] };
		const distance = geolib.getDistanceSimple(coord, this.center);
		return distance;
	}
}