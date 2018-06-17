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
		if (nextProps.bounds != this.props.bounds) {
			this.getListings(nextProps.bounds);	
		}
	}

	getListings(bounds) {
		if (bounds == null) {
			return;
		}
		const url = libUrl.parse(settings.host);
    url.pathname = '/listings';
    url.query = {};
    if (bounds != null) {
    	url.query.bounds = bounds;
    }
    
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
					<div className='listings-item-image' style={{ backgroundImage: `url(\"${imageUrl}\")` }}></div>
					<div className='listings-item-price'>{listing.price}</div>
					<div className='listings-item-location'>{location}</div>
					<div className='listings-item-title'>{listing.title}</div>
				</div>
			);
		});

		const total = this.state.meta.total;
		const start = (this.state.meta.page - 1) * this.state.meta.perPage + 1;
		const end = start + this.state.meta.perPage;

		return (
			<div className='listings-view'>
				<div>
					<div className='listings-view-count'>{`We found ${total} listings in the area, showing ${start} - ${end}`}</div>
					{listings}
				</div>
			</div>
		);
	}
}

export default ListingsView;