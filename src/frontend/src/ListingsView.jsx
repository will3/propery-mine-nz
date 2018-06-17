import React, { Component } from 'react';
import settings from './settings';
import libUrl from 'url';
import _ from 'lodash';
import './ListingsView.css';

class ListingsView extends Component {
	constructor(props) {
		super(props);
		this.state = {
			listings: []
		};
	};

	componentDidMount() {
		this.getListings(this.props.bounds);
	}

	componentWillUpdate(nextProps, nextState) {
		if (nextProps.bounds !== this.props.bounds) {
			this.getListings(nextProps.bounds);	
		}
	}

	gotoPage(page) {
		this.getListings(this.props.bounds, page);
	}

	getListings(bounds, page) {
		page = page || 1;
		if (bounds == null) {
			return;
		}
		const url = libUrl.parse(settings.host);
    url.pathname = '/listings';
    url.query = {};
    if (bounds != null) {
    	url.query.bounds = bounds;
    }
    url.query.page = page;
    
    const urlString = libUrl.format(url);

    fetch(urlString)
    .then((response) => {
      if (response.ok) {
        response.json().then((result) => {
        	this.setState({
        		listings: result.listings,
        		meta: result.meta
        	});
        });
      }
    });
	}

	render() {
		if (this.state.meta == null) {
			return null;
		}
		const listings = this.state.listings.map((listing, index) => {
			let imageUrl = listing.images[0];
			imageUrl = imageUrl.thumb || imageUrl;
			imageUrl = imageUrl.replace('/thumb/', '/plus/');

			const location = _.find(listing.attributes, (attr) => {
				return attr.title === 'Location:'
			}).value;

			return (
				<div key={index} className='listings-item' onClick={() => {
					this.props.app.showListing(listing._id);
				}}>
					<div className='listings-item-image' style={{ backgroundImage: `url("${imageUrl}")` }}></div>
					<div className='listings-item-price'>{listing.price}</div>
					<div className='listings-item-location'>{location}</div>
					<div className='listings-item-title'>{listing.title}</div>
				</div>
			);
		});

		const meta = this.state.meta;
		const total = meta.total;
		const start = (meta.page - 1) * meta.perPage + 1;
		const end = start + meta.perPage;

		const pages = [];
		let startPage = meta.page - 5;
		if (startPage < 1) {
			startPage = 1;
		}
		let endPage = startPage + 9;
		if (endPage > meta.totalPages) {
			endPage = meta.totalPages;
		}
		for (let i = startPage; i <= endPage; i++) {
			const className = i === meta.page ? 'listing-view-footer-number listing-view-footer-number-selected'
			: 'listing-view-footer-number';
			const page = (
				<span key={i} className={className}><a onClick={this.gotoPage.bind(this, i)}>{i}</a></span>
			);
			pages.push(page);
		}	
		const nextText = 'Next';
		const next = meta.page === meta.totalPages ? null : 
			<span className='listing-view-footer-next'><a onClick={this.gotoPage.bind(this, meta.page + 1)}>{nextText}</a></span>;
		return (
			<div className='listings-view'>
				<div>
					<div className='listings-view-count'>{`We found ${total} listings in the area, showing ${start} - ${end}`}</div>
					{listings}
					<div className='listings-view-footer'>
						<span className='listing-view-footer-page'>Page: </span>
						{pages}
						{next}
					</div>
				</div>
			</div>
		);
	}
}

export default ListingsView;