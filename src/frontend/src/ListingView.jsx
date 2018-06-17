import React, { Component } from 'react';
import libUrl from 'url';
import settings from './settings';
import _ from 'lodash';
import './ListingView.css';
import he from 'he';

class ListingView extends Component {
	constructor(props) {
		super(props);
		this.state = {
			photoIndex: 0
		};

		this.onLeftClicked = this.onLeftClicked.bind(this);
		this.onRightClicked = this.onRightClicked.bind(this);
	}

	componentDidMount() {
		const url = libUrl.parse(settings.host);
    url.pathname = '/listings/' + this.props.listingId;
    const urlString = libUrl.format(url);

    fetch(urlString)
    .then((response) => {
      if (response.ok) {
      	response.json().then((listing) => {
      		this.setState({ listing });
      	});
      }
    });
	}

	onLeftClicked() {
		const listing = this.state.listing;
		this.setState({ photoIndex: (this.state.photoIndex + 1) % listing.images.length });
	}

	onRightClicked() {
		const listing = this.state.listing;
		this.setState({ photoIndex: (this.state.photoIndex - 1 + listing.images.length) % listing.images.length });
	}

	render() {
		const listing = this.state.listing;
		if (listing == null) {
			return null;
		}
		let imageUrl = listing.images[this.state.photoIndex];
		imageUrl = imageUrl.thumb || imageUrl;
		imageUrl = imageUrl.replace('/thumb/', '/plus/');

		const location = _.find(listing.attributes, (attr) => {
			return attr.title === 'Location:'
		}).value;
		
		const agentPhoto = listing.agentPhoto == null || listing.agentPhoto.length === 0 ? null : (
			<div className='listing-agent-photo' style={{ backgroundImage: `url("${listing.agentPhoto}")` }}></div>
		);
		const phone = listing.agentWorkPhoneNumber == null || listing.agentWorkPhoneNumber.length === 0 ? null : (
			<div className='listing-agent-phone'>
				<span className='listing-detail-title'>Phone:  </span>
				<span className='listing-detail-value'>{listing.agentWorkPhoneNumber}</span>
			</div>
		);

		const mobile = listing.agentMobilePhoneNumber == null || listing.agentMobilePhoneNumber.length === 0 ? null : (
			<div className='listing-agent-phone'>
				<span className='listing-detail-title'>Mobile: </span>
				<span className='listing-detail-value'>{listing.agentMobilePhoneNumber}</span>
			</div>
		);

		// { _id, listingId, title, price, listedStatus, images, agentBrandingImage, agentName, agentWorkPhoneNumber, agentMobilePhoneNumber, description, mapState, expiredAt, attributes, url, location, agentPhoto }

		const attributes = listing.attributes.map((attr, i) => {
			let value;
			if (attr.title === 'Floor area:') {
				value = <td dangerouslySetInnerHTML={{ __html: attr.value }}></td>
			} else if (attr.title === 'Open home times:') {
				const html = attr.value.join(`<br>`);
				value = <td dangerouslySetInnerHTML={{ __html: html }}></td>
			} else if (attr.title === 'Land area:') {
				value = <td dangerouslySetInnerHTML={{ __html: attr.value }}></td>	
			} else {
				value = <td>{he.decode(attr.value)}</td>
			}
			return (
				<tr key={i}>
					<th>{attr.title}</th>
					{value}
				</tr>
			);
		});

		const table = attributes.length === 0 ? null : (
			<table className='listing-attr-table'>
				<tbody>
					{attributes}
				</tbody>
			</table>
		);

		return (
			<div className='listing-view-container'>
				<div className='listing-view-top-bar'>
					<div className='close-button' onClick={this.props.onCloseClicked}>
						<i className="fas fa-times"></i>
						Close
					</div>
				</div>
				<div className='listing-view-container-scroll'>
					<div>
						<div className='listing-view-carousel'>
							<span className='listing-view-carousel-button listing-view-carousel-button-left' onClick={this.onLeftClicked}>
								<i class="fas fa-chevron-left"></i>
							</span>
							<span className='listing-view-carousel-button listing-view-carousel-button-right' onClick={this.onRightClicked}>
								<i class="fas fa-chevron-right"></i>
							</span>
							<img className='listing-view-image' style={{ backgroundImage: `url("${imageUrl}")` }}/>
						</div>

						<div className='listing-detail-row'>
							<div className='listing-detail-cell'>
								<div className='listing-detail-cell-padding'>
									<h1 className='listing-location'>{he.decode(location)}</h1>
									<h2 className='listing-price'>{he.decode(listing.price)}</h2>
									<div className='listing-status'>{listing.listedStatus}</div>
								</div>
							</div>
							<div className='listing-detail-cell listing-detail-cell-border-left'>
								<div className='listing-detail-cell-padding'>
									<div className='listing-detail-agent-container'>
										{agentPhoto}
										<div className='listing-detail-agent-details'>
											<h2 className='listing-agent-name'>{listing.agentName}</h2>
											{phone}
											{mobile}
										</div>
									</div>
								</div>
							</div>
						</div>
						{table}
						<div className='listing-desc'>
							<h1>{listing.title}</h1>
							<div dangerouslySetInnerHTML={{ __html: listing.description.trim() }}></div>
						</div>
					</div>
				</div>
			</div>
		);
		// src={imageUrl}
	}
}

export default ListingView;