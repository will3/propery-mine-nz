import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import settings from './settings';
import fetch from 'fetch';
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
      const url = libUrl.format({
        host: settings.host,
        path: 'listings',
        query: {
          ne: ne.lat() + ',' + ne.lng(),
          sw: sw.lat() + ',' + sw.lat()
        }
      });
      
      fetch(url)
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
