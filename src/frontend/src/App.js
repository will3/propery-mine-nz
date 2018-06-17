import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import settings from './settings';
import request from 'request-promise';
import libUrl from 'url';
import _ from 'lodash';
import ListingView from './ListingView';
import geolib from 'geolib';
import ListingsView from './ListingsView';
import Nav from './Nav';

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
    const updateForBoundsChangedThrottled = _.throttle(this.updateForBoundsChanged.bind(this), 200, {leading: true, trailing: false});
    this.map.addListener('idle', function() {
      updateForBoundsChangedThrottled();
    });
    this.markers = [];

    const hash = this.props.hash;
    if (hash != null && hash.length > 1) {
      const listingId = hash.substring(1);
      this.showListing(listingId);
    }
    this.setState({ map: this.map });
  }

  updateForBoundsChanged() {
    this.getListings();
    this.setState({ bounds: this.getBounds() });
  }

  getListings() {
    const google = window.google;
    const bounds = this.map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const url = libUrl.parse(settings.host);
    url.pathname = '/clusters';
    url.query = {
      bounds: sw.lat() + ',' + sw.lng() + ',' + ne.lat() + ',' + ne.lng()
    };
    const urlString = libUrl.format(url);

    fetch(urlString)
    .then((response) => {
      if (response.ok) {
        response.json().then((result) => {
          const clusters = result.clusters || [];

          for (var i = 0; i < this.markers.length; i++) {
            const marker = this.markers[i];
            marker._moved = false;
          }

          const markers = this.markers.slice();
          clusters.forEach((cluster) => {
            const coords = { 
              lng: cluster.center[0], 
              lat: cluster.center[1] };

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

            const length = ('' + cluster.listingCount).length;
            let icon;
            if (cluster.listingCount === 1) {
              icon = { url: 'images/marker.png' };
            } else if (length === 1) {
              icon = { url: 'images/g1.png' };
            } else if (length === 2) {
              icon = { url: 'images/g2.png' };
            } else if (length === 3) {
              icon = { url: 'images/g3.png' };
            } else {
              icon = { url: 'images/g4.png' };
            }

            if (closestMarker == null || closestMarker._moved) {
              const marker = new google.maps.Marker({
                position: coords,
                map: this.map,
                icon: icon,
                label: this.formatLabel(cluster.listingCount)
              });
              this.markers.push(marker);
              this.addMarkerListener(marker, cluster);
            } else {
              closestMarker._moved = true;
              closestMarker.setPosition(coords);
              closestMarker.setLabel(this.formatLabel(cluster.listingCount));
              closestMarker.setIcon(icon);
              this.addMarkerListener(closestMarker, cluster);
            }
          });

          this.removeOutOfBoundsMarkers();

          for (var i = 0; i < markers.length; i++) {
            const marker = markers[i];
            if (!marker._moved) {
              marker.setMap(null);
              _.remove(this.markers, marker);
            }
          }
        });
      }
    });
  }

  addMarkerListener(marker, cluster) {
    if (marker._clickListener != null) {
      const google = window.google;
      google.maps.event.removeListener(marker._clickListener);
    }
    marker._clickListener = marker.addListener('click', () => {
      if (cluster.listingGroupCount === 1 || this.getWidth() < 0.03) {
        this.showListing(cluster.listingGroups[0].listings[0]._id);
      } else {
        const zoom = this.map.getZoom();
        this.map.setZoom(zoom + 2);
        this.map.setCenter(marker.getPosition());  
      }
    });
  }

  formatLabel(listingCount) {
    if (listingCount === 1) {
      return '';
    }
    return {
      text: '' + listingCount,
      color: 'white',
    }
  }

  showListing(listingId) {
    window.history.pushState(null, null, '#' + listingId);
    this.setState({ listingId });
  }

  onListingCloseClicked() {
    window.history.pushState(null, null, '#');
    this.setState({ listingId: null});
  }

  getBounds() {
    const google = window.google;
    const bounds = this.map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    return sw.lat() + ',' + sw.lng() + ',' + ne.lat() + ',' + ne.lng();
  }

  getWidth() {
    const bounds = this.map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const width = (ne.lng() - sw.lng() + 360) % 360;;
    return width;
  }

  removeOutOfBoundsMarkers() {
    const bounds = this.map.getBounds();

    const markersToDelete = [];
    for (var i = 0; i < this.markers.length;i ++) {
      const marker = this.markers[i];
      const position = marker.position;
      if (!bounds.contains(position)) {
        marker.setMap(null);
        markersToDelete.push(marker);
      }
    }

    _.remove(this.markers, (marker) => {
      return _.includes(markersToDelete, marker);
    });
  }

  render() {
    const listingId = this.state.listingId;
    const listingView = listingId == null ? null : (
      <div className="listing-view-background-container" onClick={this.onListingCloseClicked}>
        <ListingView listingId={listingId} onCloseClicked={this.onListingCloseClicked}/>
      </div>
    );

    const listingsView = this.state.bounds == null ? null : <ListingsView bounds={this.state.bounds} app={this}/>;

    return (
      <div>
        <nav>
          <Nav map={this.state.map}/>
        </nav>
        <div className="content-wrapper">
          <div id="map" className="map" />
          <div className="sidepanel">
            {listingsView}            
          </div>
        </div>
        {listingView}
      </div>
    );
  }
}

export default App;
