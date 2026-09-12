import React from 'react';

function ProblemLocation({ latitude, longitude, address }) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <div className="mt-3 rounded-md border border-green-100 bg-green-50 p-3 text-sm">
      <p className="font-semibold text-gray-800">{address || 'Pinned problem location'}</p>
      <p className="text-gray-600">{latitude}, {longitude}</p>
      <a className="mt-1 inline-block font-semibold text-india-green hover:underline" href={mapUrl} target="_blank" rel="noreferrer">
        Open in Google Maps
      </a>
    </div>
  );
}

export default ProblemLocation;