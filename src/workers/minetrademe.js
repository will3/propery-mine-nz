const request = require('request-promise');
const cheerio = require('cheerio');
const _ = require('lodash');
const Promise = require('bluebird');
const MongoClient = require('mongodb').MongoClient;
const util = require('util');
const he = require('he');
const connectDb = require('../db');
const libUrl = require('url');

let minPage = Infinity;
const pagesToTry = 10000;

let db;

module.exports = function(startPaqe) {
	return connectDb().then((_db) => {
		db = _db;
	}).then(() => {
		return minePages(startPaqe);
	});
}

let urlObject;
function minePages(startPage) {
	var i = startPage;
	return db.createCollection("listings").then(() => {
		return getUrlObject();
	}).then((_urlObject) => {
		urlObject = _urlObject;
		queueNext();
	});

	function queueNext() {
		console.log('page ' + i);
		getUrls(i).then(() => {
			i++;
			if (i >= minPage) {
				return;
			}
			if (i >= pagesToTry) {
				return;
			}
			return queueNext();
		}).catch((err) => {
			throw err;
		});		
	};
}

function getUrls(pageNumber) {
	urlObject.query.page = pageNumber;
	const url = libUrl.format(urlObject);

	return request(url).then((body) => {
		if (body == null) {
			throw new Error('failed to extract body');
		}
		const $ = cheerio.load(body);

		const pageNumberInPage = $('#PagingFooter > tbody > tr > td > b').html();
		if (pageNumberInPage != pageNumber) {
			console.log(`pages dont match, expected ${pageNumber}, got ${pageNumberInPage}`);
			minPage = pageNumber;
		}

		const featuredLinks = $('.tmp-search-card-top-tier > a');
		const urls = [];
		featuredLinks.each((i, link) => {
			const url = 'https://www.trademe.co.nz' + link.attribs.href;
			urls.push(url);
		});

		const links = $('.tmp-search-card-list-view__link');
		links.each((i, link) => {
			const url = 'https://www.trademe.co.nz' + link.attribs.href;
			urls.push(url);
		});

		return Promise.all(urls.map((url) => {
			return mineUrl(url);
		})).then((listings) => {
			const operations = [];
			listings.forEach((listing) => {
				if (listing == null) {
					return;
				}
				operations.push(
					db.collection('listings').update({ _id: listing._id }, listing, { upsert: true })
				);
			});
			return operations;
		});
	});
};

function extractPriceStructure(price, $) {
	const askingPriceRegex = /Asking price: (.*)/;
	let result = askingPriceRegex.exec(price);
	if (result != null) {
		return {
			type: 'asking_price',
			price: result[1]
		};
	}

	const enquiresOverRegex = /Enquiries over (.*)/;
	result = enquiresOverRegex.exec(price);
	if (result != null) {
		return {
			type: 'equires_over',
			price: result[1]
		};
	}

	if (price === 'Price by negotiation') {
		return {
			type: 'price_by_negotiation'
		};
	}

	if (price === 'To be auctioned') {
		return {
			type: 'to_be_auctioned'
		};
	}

	if (price === 'Deadline sale') {
		return {
			type: 'deadline_sale'
		};
	}

	if (price === 'For sale by tender') {
		return {
			type: 'for_sale_by_tender'
		};
	}

	throw new Error('failed to extract pricing structure with: ' + price);
}

function mineUrl(url) {
	return request(url).then((body) => {
		console.log('mining ' + url);
		const $ = cheerio.load(body);
		if ($('#ExpiredContainer_LoginMessage').length > 0) {
			// expired
			return null;
		}
		const listingIdRegx = /Listing #:(.*)/;
		const listingIdMatch = listingIdRegx.exec($('#ListingTitle_ListingNumberContainer').html());
		const listingId = listingIdMatch[1];
		if (listingId == null || listingId.length === 0) {
			console.log('failed to extract listing id');
		}
		const title = he.decode($('.property-title > h1').html());
		const price = he.decode($('#PriceSummaryDetails_TitlePrice').html());
		const priceStructure = extractPriceStructure(price, $);
		const listedStatus = he.decode($('#PriceSummaryDetails_ListedStatusText').html());
		const imageElements = $('.carousel > ul > li > img');
		const images = [];
		imageElements.each((index, el) => {
			const thumbUrl = el.attribs.src;
			images.push({
				thumb: thumbUrl
			});
		});
		const agentBrandingImage = $('#PropertyContactBox_AgentBrandingImageContainer > img').attr('src');
		const agentName = $('#PropertyContactBox_AgentName').html();
		const agencyName = $('#PropertyContactBox_AgencyName').html();
		const agentWorkPhoneNumber = extractPhoneNumber($('#PropertyContactBox_AgentWorkPhoneNumber').html());
		const agentMobilePhoneNumber = extractPhoneNumber($('#PropertyContactBox_AgentMobilePhoneNumber').html());
		const agentPhoto = $('#PropertyContactBox_AgentPhoto').attr('src');
		const rows = $('table#ListingAttributes tr');
		
		const attributeTypes = [ 'Location:', 'Property type:', 'Land area:', 'Price:', 'Rooms:', 'Floor area:', 'Parking:', 'Open home times:', 'Rateable value (RV):', 'Property ID#:', 'In the area:', 'Smoke alarm:', 'Viewing instructions:' ];

		const attributes = [];

		let bedrooms;
		let bathrooms;

		rows.each(function(i, row) {
			const title = $('th', row).html().trim();
			if (!_.includes(attributeTypes, title)) {
				console.warn('unknown attribute type: ' + title);
			}
			let value = $('td', row).html().trim();

			if (title === 'Open home times:') {
				value = extractOpenHomeDates(value);
			}
			if (title === 'Rooms:') {
				const regex = /(.*) bedroom[s]?, (.*) bathroom[s]?/;
				const matches = regex.exec(value);
				if (matches == null) {
					throw new Error(`Unexpected rooms value: ${value}`);
				}
				bedrooms = matches[1];
				bathrooms = matches[2];
			}
			if (title === 'Location:') {
				// const address = value.split(',');
				// if (address.length !== 4 && address.length !== 3) {
				// 	throw new Error('Unexpected address: ' + address);
				// }
			}
			const attribute = {
				title, value
			};
			attributes.push(attribute);
		});

		const description = $('#ListingDescription_ListingDescription').html();
		const mapState = extractMapState($);
		const expiredAt = $('#ClassifiedActions_Expires').html();
		const _id = 'trademe-' + listingId;

		const location = mapState == null ? null : {
    	type: 'Point',
			coordinates: [ mapState.lng, mapState.lat ]
    };

    const categoryElements = $('#BreadcrumbsContainer ul li a span');
    categoryElements.each((i, categoryElement) => {
    	const category = $(categoryElement).html();
    	if (i === 0) {
    		if (category !== 'Trade Me Property') {
    			throw `Unexpected categories: ${category}`;
    		}

    		return;
    	} 

    	if (i === 1) {
    		if (category !== 'Residential') {
    			throw `Unexpected categories: ${category}`;	
    		}

    		return;
    	}

    	if (i === 2) {
    		if (category !== 'For Sale') {
    			throw `Unexpected categories: ${category}`;	
    		}

    		return;
    	}
    });

		const listing = { _id, listingId, title, price, listedStatus, images, agentBrandingImage, agentName,
		 agencyName, agentWorkPhoneNumber, agentMobilePhoneNumber, description, mapState, expiredAt, attributes, 
		 url, location, agentPhoto, priceStructure, bedrooms, bathrooms };
		return listing;
	});
}

function extractPhoneNumber(content) {
	if (content == null) {
		return null;
	}
	const phoneRegex = /.*&#xA0;(.*)/;
	const matches = phoneRegex.exec(content);
	if (matches == null) {
		console.log('failed to extract phone number');
	}
	return matches[1];
}

function extractOpenHomeDates(content) {
	const $ = cheerio.load(content);
	const dates = [];
	$('.listing-open-home-add-to-calendar__open-home-date').each((index, el) => {
		 dates.push($(el).html());
	});
	return dates;
}

function extractMapState($) {
	const scripts = $('script');
	
	for (var i = 0; i < scripts.length; i ++) {
		let script = $(scripts[i]).html();
		script = `function getMapState(){ \n ${script} \n return mapState; }`;
		try {
			eval(script);
			const mapState = getMapState();
			if (mapState != null) {
				return mapState;
			}
		} catch(err) { }
	}

	return null;
}

function getUrlObject() {
	const firstPage = `https://www.trademe.co.nz/browse/categoryattributesearchresults.aspx?sort_order=expiry_desc&136=&153=&132=PROPERTY&122=0%2C0&49=0%2C0&29=&123=0%2C0&search=1&sidebar=1&cid=5748&rptpath=350-5748-&216=0%2C0&217=0%2C0&rsqid=8c5eabfa132f4eefa6ed5446992a54d0`;
	return request(firstPage).then((body) => {
		if (body == null) {
			throw new Error('failed to extract body');
		}
		const $ = cheerio.load(body);
		const href = $('#PagingFooter a')[0].attribs.href;
		const url = libUrl.parse('https://www.trademe.co.nz' + href, true);
		delete url['search'];
		delete url['path'];
		delete url['href'];
		return url;
	});	
}