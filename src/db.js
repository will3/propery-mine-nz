const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();

module.exports = function connectDb() {
	return MongoClient
	.connect(process.env.MONGO_DB_URL)
	.then((db) => {
		return db.db(process.env.DB_NAME);
	});
};
