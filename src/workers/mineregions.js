const connectDb = require('../db');
const request = require('requestretry');

module.exports = function() {
	let db;
	connectDb().then((_db) => {
		db = _db;
		return db.collection('regions').deleteMany({});
	}).then(() => {
		const url = `https://api.trademe.co.nz/v1/Localities/Regions.json`;
		return request({
			url, json: true
		});
	}).then((response) => {
		const regions = response.body;
		return db.collection('regions').insertMany(regions);
	});
};
 