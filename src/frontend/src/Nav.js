import React, { Component } from 'react';
import './Nav.css';

class Nav extends Component {
	constructor(props) {
		super(props);
		this.state = {};
		this.onPlaceChanged = this.onPlaceChanged.bind(this);
	}

	componentDidMount() {
		const input = this.refs.input;
		const google = window.google;
		this.autocomplete = new google.maps.places.Autocomplete(input, {
			componentRestrictions: {country: "nz"}
		});

		this.autocomplete.addListener('place_changed', this.onPlaceChanged);
	}

	onPlaceChanged() {
		const map = this.props.map;
		const place = this.autocomplete.getPlace();
		if (!place.geometry) {
			return;
		}
		if (place.geometry.viewport) {
			map.fitBounds(place.geometry.viewport);
		} else {
			map.setCenter(place.geometry.location);
			map.setZoom(17);
		}

		if (place.address_components) {
			// TODO go to specific listing
		}
	}

	render() {
		return (
			<div>
				<div className='nav-search-container'>
					<input ref='input' className='nav-input' type='text' spellCheck='false' placeholder='Search By City, suburb, or address'/>
					<div className='nav-search-button' type='image'>
						<img className='nav-search-button-image' src='images/search.png'></img>
					</div>
				</div>
			</div>
		);
	}
}

export default Nav;