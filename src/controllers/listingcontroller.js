module.exports = function(app, dbo) {
	app.get('/listings', (req, res) => {
		const bounds = req.query.bounds;
		const numbers = bounds.split(',');
		const swLat = parseFloat(numbers[0]);
		const swLng = parseFloat(numbers[1]);
		const neLat = parseFloat(numbers[2]);
		const neLng = parseFloat(numbers[3]);
		const box = [ [ swLng, swLat ], [ neLng, neLat ] ];
		const projection = { 'location.coordinates': 1 };
		
		dbo.collection('listings').find({
			location: {
				$geoWithin: {
					$box: box
				}
			}
		}).project(projection).toArray().then((listings) => {
			res.send(listings);
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

function getListings(req, res) {
	const bounds = req.query.bounds;
	const numbers = bounds.split(',');
	const swLat = parseFloat(numbers[0]);
	const swLng = parseFloat(numbers[1]);
	const neLat = parseFloat(numbers[2]);
	const neLng = parseFloat(numbers[3]);
	const box = [ [ swLng, swLat ], [ neLng, neLat ] ];
	const projection = { 'location.coordinates': 1 };
	
	dbo.collection('listings').find({
		location: {
			$geoWithin: {
				$box: box
			}
		}
	}).project(projection).toArray().then((listings) => {
		res.send(listings);
	}).catch((err) => {
		res.send(err);
	});
};

function getListingDetail(req, res) {
	const id = req.params.id;

	dbo.collection('listings').findOne({
		_id: id
	}).then((listing) => {
		res.send(listing);
	}).catch((err) => {
		res.send(err);
	});;
}