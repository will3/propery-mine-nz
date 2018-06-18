var csv = require("fast-csv");
const path = './downloads/kx-nz-property-titles-CSV/nz-property-titles.csv';
const connectDb = require('../db');
const fs = require('fs');
const parse = require('wellknown');

connectDb().then((db) => {
	db.createCollection('properties').then(() => {
		return db.collection('properties').deleteMany({});
	}).then(() => {
		readCsv(db);
	});
});

const skip = 0;
function readCsv(db) {
	let count = 0;
	const stream = fs.createReadStream(path);
	let buffer = [];
	const bufferSize = 10000;

	const csvStream = csv().on('data', function(line) {
		if (count < skip) {
			count ++;
			if (count % bufferSize === 0) {
				console.log('skipping.. ' + count);
			}
			return;
		}

		if (line.length != 11) {
			throw new Error('Error parsing csv file in line: ' + line);
		}

		if (count === 0) {
			// console.log(line);
		} else {
			let index = 0;
			const geo = parse(line[0]);
			if (geo == null) {
				console.log('Failed to extract geo: ' + line);
			}
			const property = {
				// polygon: convertGeoJSON(line[0]),
				_id: line[1],
				marker: getMarkerPoint(geo)
				// title_no: line[2],
				// status: line[3],
				// type: line[4],
				// land_district: line[5],
				// issue_date: line[6],
				// guarantee_status: line[7],
				// estate_description: line[8],
				// number_owners: line[9],
				// spatial_extents_shared: line[10],
			};
			
			buffer.push(property);
			if (buffer.length >= bufferSize) {
				stream.pause();
				db.collection('properties').insertMany(buffer).then(() => {
					stream.resume();
				}).catch((err) => {
					throw err;
				});
				buffer = [];
				console.log(count);
			}
		}

	  count++;
	});

	stream.pipe(csvStream);

	if (buffer.length > 0) {
		db.collection('properties').insertMany(buffer).catch((err) => {
			throw err;
		});
		buffer = [];
		console.log(count);	
	}
}

function getMarkerPoint(polygon) {
	const center = [ 0, 0 ];
	const coords = polygon.coordinates[0][0];
	coords.forEach((coord) => {
		center[0] += coord[0];
		center[1] += coord[1];

		if (isNaN(center[0]) || isNaN(center[1])) {
			console.log(coord);
			throw new Error('Invalid marker point: ' + JSON.stringify(polygon));
		}
	});

	if (isNaN(center[0]) || isNaN(center[1])) {
		throw new Error('Invalid marker point: ' + JSON.stringify(polygon));
	}
	center[0] /= coords.length;
	center[1] /= coords.length;
	return {
		type: 'Point',
		coordinates: center
	}
}