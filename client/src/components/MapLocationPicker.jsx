import React, { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { notify } from './ToastProvider';

const INDIA_CENTER = [20.5937, 78.9629];

function MapClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function MapViewport({ location }) {
  const map = useMap();

  useEffect(() => {
    if (location?.latitude !== null && location?.longitude !== null) {
      map.setView([location.latitude, location.longitude], Math.max(map.getZoom(), 13));
    }
  }, [location, map]);

  return null;
}

function MapLocationPicker({ location, onChange }) {
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      notify('Location services are not available in this browser.', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => onChange({
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
      }),
      () => notify('Could not read your current location. Please click the map to place the pin.', 'error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const markerPosition = location?.latitude !== null && location?.longitude !== null
    ? [location.latitude, location.longitude]
    : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <label className="block text-sm font-bold text-gray-700">Problem location</label>
          <p className="text-xs text-gray-500">Click the map to place the pin, or use your current location.</p>
        </div>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="px-3 py-2 text-sm font-semibold text-india-green border border-india-green rounded-md hover:bg-green-50"
        >
          Use my location
        </button>
      </div>
      <MapContainer
        center={INDIA_CENTER}
        zoom={5}
        scrollWheelZoom
        className="h-72 w-full rounded-md border border-gray-300 z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onChange={onChange} />
        <MapViewport location={location} />
        {markerPosition && <CircleMarker center={markerPosition} radius={9} pathOptions={{ color: '#138808', fillColor: '#ff9933', fillOpacity: 0.9 }} />}
      </MapContainer>
      {location?.latitude !== null && location?.longitude !== null ? (
        <p className="mt-2 text-sm font-medium text-gray-700">
          Selected coordinates: {location.latitude}, {location.longitude}
        </p>
      ) : (
        <p className="mt-2 text-sm text-amber-700">A map pin is required before submitting the report.</p>
      )}
    </div>
  );
}

export default MapLocationPicker;