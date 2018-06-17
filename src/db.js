require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;

module.exports = function connectDb() {
	console.log('connecting db...');
	return MongoClient
	.connect(process.env.MONGO_DB_URL)
	.then((db) => {
		if (db == null) {
			throw new Error('failed to connect!');
		}
		console.log('connected!');
		return db.db(process.env.DB_NAME);
	});
};
