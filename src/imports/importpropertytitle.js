var csv = require("fast-csv");
const path = './downloads/kx-nz-property-titles-CSV/nz-property-titles.csv';
const parse = require('parenthesis');
const connectDb = require('../db');
const fs = require('fs');

let count = 0;

connectDb().then((db) => {
	db.createCollection('properties').then(() => {
		return db.collection('properties').deleteMany({});
	}).then(() => {
		readCsv(db);
	});
});

function readCsv(db) {
	const stream = fs.createReadStream(path);
	let buffer = [];
	const bufferSize = 1000;

	const csvStream = csv().on('data', function(line) {
		if (line.length != 11) {
			throw new Error('Error parsing csv file in line: ' + line);
		}

		if (count === 0) {
			// console.log(line);
		} else {
			let index = 0;
			const property = {
				polygon: convertGeoJSON(line[index++]),
				_id: line[index++],
				title_no: line[index++],
				status: line[index++],
				type: line[index++],
				land_district: line[index++],
				issue_date: line[index++],
				guarantee_status: line[index++],
				estate_description: line[index++],
				number_owners: line[index++],
				spatial_extents_shared: line[index++],
			};
			
			buffer.push(property);
			if (buffer.length >= bufferSize) {
				stream.pause();
				console.log('paused');
				db.collection('properties').insertMany(buffer).then(() => {
					console.log('resume');
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

function convertGeoJSON(value) {
	const regex = /MULTIPOLYGON \(\(\((.*)\)\)\)/;
	const match = regex.exec(value);
	if (match == null) {
		throw new Error('Error parsing polygon: ' + value);
	}
	const coords = match[1].split(',').map((coord) => {
		const items = coord.split(' ');
		return [ parseFloat(items[0]), parseFloat(items[1]) ];
	});

	const polygon = {
		type: "MultiPolygon",
		coordinates: [ [ coords ] ]
	}
	
	return polygon;
}
