import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import settings from './settings';
import request from 'request-promise';
import libUrl from 'url';
import _ from 'lodash';
import ListingView from './ListingView';
import geolib from 'geolib';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.onListingCloseClicked = this.onListingCloseClicked.bind(this);
  }

  componentDidMount() {
    const google = window.google;
    var mapProp = {
        center: new google.maps.LatLng(-36.848461, 174.763336),
        zoom: 15,
    };
    this.map = new google.maps.Map(document.getElementById("map"),mapProp);
    const updateForBoundsChangedThrottled = _.throttle(this.updateForBoundsChanged.bind(this), 400, {leading: false, trailing: true});
    this.map.addListener('bounds_changed', function() {
      console.log('bounds changed');
      updateForBoundsChangedThrottled();
    });
    this.markers = [];

    const hash = this.props.hash;
    if (hash != null && hash.length > 1) {
      const listingId = hash.substring(1);
      this.showListing(listingId);
    }
  }

  updateForBoundsChanged() {
    console.log('get listings');
    this.getListings();
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
        response.json().then((result) => {
          const clusters = result.clusters;

          for (var i = 0; i < this.markers.length; i++) {
            const marker = this.markers[i];
            marker._moved = false;
          }

          const markers = this.markers.slice();
          clusters.forEach((cluster) => {
            const coords = { 
              lng: parseFloat(cluster.center.longitude), 
              lat: parseFloat(cluster.center.latitude) };

            let minDistance = Infinity;
            let closestMarker = null;
            for (var i = 0; i < markers.length; i++) {
              const start = { latitude: markers[i].position.lat(), longitude: markers[i].position.lng() };
              const end = { latitude: coords.lat, longitude: coords.lng };
              const distance = geolib.getDistance(start, end);
              if (distance < minDistance) {
                minDistance = distance;
                closestMarker = markers[i];
              }
            }

            if (closestMarker == null || closestMarker._moved) {
              const marker = new google.maps.Marker({
                position: coords,
                map: this.map,
                icon: 'images/m3.png',
                label: '' + cluster.listingCount
              });  
              this.markers.push(marker);
            } else {
              closestMarker._moved = true;
              closestMarker.setPosition(coords);
              closestMarker.setLabel('' + cluster.listingCount);
            }
            
            // marker.addListener('click', () => {
            //   // this.showListing(listing._id);
            // });
          });
        });
      }
    });
  }

  showListing(listingId) {
    window.history.pushState(null, null, '#' + listingId);
    this.setState({ listingId });
  }

  onListingCloseClicked() {
    window.history.pushState(null, null, '#');
    this.setState({ listingId: null});
  }

  render() {
    const listingId = this.state.listingId;
    const listingView = listingId == null ? null : (
      <div className="listing-view-background-container">
        <ListingView listingId={listingId} onCloseClicked={this.onListingCloseClicked}/>
      </div>
    );

    return (
      <div>
        <nav></nav>
        <div id="map" className="map" />
        <div className="sidepanel"></div>
        {listingView}
      </div>
    );
  }
}

export default App;
