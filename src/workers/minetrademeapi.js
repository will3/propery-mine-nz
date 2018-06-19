const request = require('requestretry');
const timeStamp = new Date().getTime();
const connectDb = require('../db');
const collectionName = 'listingsTest';
const Promise = require('bluebird');

let db;
let done = false;
connectDb().then((_db) => {
	db = _db;
	return db.createCollection(collectionName);
}).then(() => {
	let currentPage = 1;

	return getNext();

	function getNext() {
		return getPage(currentPage).then(() => {
			if (done) {
				return;
			}
			currentPage += 1;
			return getNext();
		});
	};
});

function getPage(page) {
	console.log('page: ' + page);
	return request.get({
		url: `https://api.trademe.co.nz/v1/Search/Property/Residential.json?category=3399&page=${page}&photo_size=FullSize&return_metadata=true&return_variants=true&rows=50&rsqid=3c4a327f663f47539b2ea1619ce23039&sort_order=ExpiryDesc`,
		headers: {
			'Authorization': `OAuth oauth_consumer_key="E83DD89A2F73BBDD15E4C3CD757576DE37", oauth_nonce="1529354718547.969", oauth_signature="d2js93NsMAPGhzJ%2Bt86dY%2FOv2Fc%3D", oauth_signature_method="HMAC-SHA1", oauth_timestamp="1529354718", oauth_version="1.0"`
		}
	}).then((response) => {
		const data = JSON.parse(response.body);

		if (data.Page != page) {
			done = true;
			console.log('Pages dont match, abort');
			return;
		}

		const listings = data.List.map((listing) => {
			const r = makeKeysLowercase(listing);

			r.trademeId = r.listingId;
			delete r['listingId'];

			if (r.geographicLocation != null) {
				r.location = {
					type: 'Point',
					coordinates: [ r.geographicLocation.longitude, r.geographicLocation.latitude ]
				};
			}
			return r;
		});

		const operations = listings.map((listing) => {
			return db.collection(collectionName).update({ trademeId: listing.trademeId }, listing, { upsert: true });
		});

		return Promise.all(operations);
	});	
};

function lowercaseFirstLetter(string) {
    return string.charAt(0).toLowerCase() + string.slice(1);
}

function makeKeysLowercase(obj) {
	if (typeof obj === 'object') {
		const r = {};
		for (var id in obj) {
			r[lowercaseFirstLetter(id)] = makeKeysLowercase(obj[id]);
		}
		return r;	
	} else {
		return obj;
	}
}

// { _id, listingId, title, price, listedStatus, images, agentBrandingImage, agentName,
// 		 agencyName, agentWorkPhoneNumber, agentMobilePhoneNumber, description, mapState, expiredAt, attributes, 
// 		 url, location, agentPhoto, priceStructure, bedrooms, bathrooms, address, importDate }
// 		 
// 		 