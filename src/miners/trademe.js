const request = require('request-promise');
const cheerio = require('cheerio');
const _ = require('lodash');
const Promise = require('bluebird');
const MongoClient = require('mongodb').MongoClient;
const mongoDbUrl = require('../secrets').mongoDbUrl;
const dbName = require('../secrets').dbName;
const util = require('util');

module.exports = function() {
	let minPage = Infinity;

	const pagesToTry = 10000;

	var i = 1;

	let dbo;

	MongoClient
	.connect(mongoDbUrl)
	.then((db) => {
		dbo = db.db(dbName);
		return dbo.createCollection("listings");
	})
	.then(() => {
		queueNext();
	})
	.catch((err) => {
		throw err;
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

	function getUrls(pageNumber) {
		const url = getUrl(pageNumber);
		console.log(url);
		return request(url).then((body) => {
			if (body == null) {
				throw new Error('failed to extract body');
			}
			const $ = cheerio.load(body);

			const pageNumberInPage = $('#PagingFooter > tbody > tr > td > b').html();
			if (pageNumberInPage != pageNumber) {
				console.log(pageNumberInPage);
				console.log('pages dont match, min page is ' + pageNumber);
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
				listings.forEach((listing) => {
					const operations = [];
					operations.push(
						dbo.collection('listings').update({ _id: listing._id }, listing, { upsert: true })
					);
					return operations;
				});
			});
		});
	};

	function mineUrl(url) {
		return request(url).then((body) => {
			console.log('mining ' + url);
			const $ = cheerio.load(body);
			const listingIdRegx = /Listing #:(.*)/;
			const listingId = listingIdRegx.exec($('#ListingTitle_ListingNumberContainer').html())[1];
			if (listingId == null || listingId.length === 0) {
				console.log('failed to extract listing id');
			}
			const title = $('.property-title > h1').html();
			const price = $('#PriceSummaryDetails_TitlePrice').html();
			const listedStatus = $('#PriceSummaryDetails_ListedStatusText').html();
			const imageElements = $('.carousel > ul > li > img');
			const images = [];
			imageElements.each((index, el) => {
				images.push(el.attribs.src);
			});
			const agentBrandingImage = $('#PropertyContactBox_AgentBrandingImageContainer > img').attr('src');
			const agentName = $('#PropertyContactBox_AgentName').html();
			const agencyName = $('#PropertyContactBox_AgencyName').html();
			const agentWorkPhoneNumber = extractPhoneNumber($('#PropertyContactBox_AgentWorkPhoneNumber').html());
			const agentMobilePhoneNumber = extractPhoneNumber($('#PropertyContactBox_AgentMobilePhoneNumber').html());

			const rows = $('table#ListingAttributes tr');
			
			const attributeTypes = [ 'Location:', 'Property type:', 'Land area:', 'Price:', 'Rooms:', 'Floor area:', 'Parking:', 'Open home times:', 'Rateable value (RV):', 'Property ID#:', 'In the area:', 'Smoke alarm:', 'Viewing instructions:' ];

			const attributes = [];
			rows.each(function(i, row) {
				const title = $('th', row).html().trim();
				if (!_.includes(attributeTypes, title)) {
					console.warn('unknown attribute type: ' + title);
				}
				let value = $('td', row).html().trim();

				if (title === 'Open home times:') {
					value = extractOpenHomeDates(value);
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
			const listing = { _id, listingId, title, price, listedStatus, images, agentBrandingImage, agentName, agencyName, agentWorkPhoneNumber, agentMobilePhoneNumber, description, mapState, expiredAt, attributes, url };
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

	function getUrl(page) {
		const url = `https://www.trademe.co.nz/browse/categoryattributesearchresults.aspx?cid=5748&search=1&rptpath=350-5748-&rsqid=3bfb4ffdba9847debd6364f8fe8d9b00&nofilters=1&originalsidebar=1&key=1627800810&page=${page}&sort_order=expiry_desc`;
		return url;
	}
}