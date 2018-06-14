const mongoDbUrl = require('./secrets').mongoDbUrl;
const MongoClient = require('mongodb').MongoClient;
const dbName = require('./secrets').dbName;

module.exports = function connectDb() {
	return MongoClient
	.connect(mongoDbUrl)
	.then((db) => {
		return db.db(dbName);
	});
};
