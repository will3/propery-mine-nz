import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import settings from './settings';
import request from 'request-promise';
import libUrl from 'url';
import _ from 'lodash';

class App extends Component {
  componentDidMount() {
    const google = window.google;
    var mapProp = {
        center: new google.maps.LatLng(-36.848461, 174.763336),
        zoom: 15,
    };
    this.map = new google.maps.Map(document.getElementById("map"),mapProp);
    const updateForBoundsChangedThrottled = _.throttle(this.updateForBoundsChanged.bind(this), 0.1);
    this.map.addListener('bounds_changed', function() {
      updateForBoundsChangedThrottled();
    });
    this.markers = {};
  }

  updateForBoundsChanged() {
    this.getListings();
    this.removeOutOfBoundsMarkers();
  }

  getListings() {
    const google = window.google;
    const bounds = this.map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const url = libUrl.parse(settings.host);
    url.pathname = '/listings';
    url.query = {
      bounds: sw.lat() + ',' + sw.lng() + ',' + ne.lat() + ',' + ne.lng()
    };
    const urlString = libUrl.format(url);
      
    fetch(urlString)
    .then((response) => {
      if (response.ok) {
        response.json().then((listings) => {
          listings.forEach((listing) => {
            const coords = { lng: listing.location.coordinates[0], lat: listing.location.coordinates[1] };
            if (this.markers[listing._id] == null) {
              const marker = new google.maps.Marker({
                position: coords,
                map: this.map
              });
              marker.addListener('click', () => {
                this.showListing(listing);
              });
              this.markers[listing._id] = marker;
            }
          });
        });
      }
    });
  }

  showListing(listing) {
    console.log(listing);
  }

  removeOutOfBoundsMarkers() {
    const bounds = this.map.getBounds();

    const markersToDelete = [];
    for (var id in this.markers) {
      const marker = this.markers[id];
      const position = marker.position;
      if (!bounds.contains(position)) {
        marker.setMap(null);
        markersToDelete.push(id);
      }
    }

    for (var i = 0; i < markersToDelete.length; i++) {
      delete this.markers[markersToDelete[i]];
    }
  }

  render() {
    return (
      <div>
        <nav></nav>
        <div id="map" className="map" />
        <div className="sidepanel"></div>
      </div>
    );
  }
}

export default App;
