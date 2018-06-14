import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import settings from './settings';
import request from 'request-promise';
import libUrl from 'url';

class App extends Component {
  componentDidMount() {
    const google = window.google;
    var mapProp = {
        center: new google.maps.LatLng(-36.848461, 174.763336),
        zoom: 15,
    };
    var map = new google.maps.Map(document.getElementById("map"),mapProp);
    map.addListener('bounds_changed', function() {
      const bounds = map.getBounds();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const url = libUrl.parse(settings.host);
      url.pathname = '/listings';
      url.query = {
        ne: ne.lat() + ',' + ne.lng(),
        sw: sw.lat() + ',' + sw.lat()
      };
      const urlString = libUrl.format(url);
      
      fetch(urlString)
      .then((response) => {

      });
    });
  }

  render() {
    return (
      <div>
        <div id="map" class="map">
        </div>
      </div>
    );
  }
}

export default App;
