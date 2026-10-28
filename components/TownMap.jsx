import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';

const townCenter = [10.67449, 76.01306];
const route = [
  [10.670849, 76.002072],
  [10.675411, 76.020533],
  [10.677212, 76.024398],
];

const locations = {
  attupuram: { coordinates: [10.670849, 76.002072], label: 'Attupuram Centre', note: 'Verified coordinate supplied by you' },
  chammanoor: { coordinates: [10.675411, 76.020533], label: 'Chammanoor Centre', note: 'Verified coordinate supplied by you' },
  school: { coordinates: [10.677212, 76.024398], label: 'Amal English School', note: 'Verified coordinate supplied by you' },
};

function MapFocus({ activeStop }) {
  const map = useMap();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const location = locations[activeStop];
    if (location) {
      map.flyTo(location.coordinates, 16, { duration: 1.1 });
    }
  }, [activeStop, map]);

  return null;
}

function MapActions({ satellite, onToggleSatellite }) {
  const map = useMap();
  return (
    <div className="leaflet-actions">
      <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()}>+</button>
      <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()}>−</button>
      <button type="button" className="layer-toggle" onClick={onToggleSatellite}>
        {satellite ? 'MAP' : 'SAT'}
      </button>
    </div>
  );
}

export default function TownMap({ activeStop, onSelectStop }) {
  const [satellite, setSatellite] = useState(false);
  const tiles = useMemo(() => satellite
    ? {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
      }
    : {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }, [satellite]);

  return (
    <MapContainer
      center={townCenter}
      zoom={14}
      scrollWheelZoom
      className={`leaflet-town-map ${satellite ? 'is-satellite' : ''}`}
      bounds={Object.values(locations).map(({ coordinates }) => coordinates)}
      boundsOptions={{ padding: [45, 45] }}
    >
      <TileLayer attribution={tiles.attribution} url={tiles.url} />
      <Polyline positions={route} pathOptions={{ color: '#d8873f', weight: 5, opacity: 0.9, dashArray: '10 10' }} />
      {Object.entries(locations).map(([key, location], index) => (
        <CircleMarker
          key={key}
          center={location.coordinates}
          radius={activeStop === key ? 12 : 9}
          pathOptions={{
            color: '#fff',
            weight: 3,
            fillColor: activeStop === key ? '#e7a35a' : '#173b31',
            fillOpacity: 1,
          }}
          eventHandlers={{ click: () => onSelectStop(key) }}
        >
          <Tooltip direction="top" offset={[0, -10]} permanent={activeStop === key}>
            <strong>{String(index + 1).padStart(2, '0')} · {location.label}</strong>
            <br />
            {location.note}
          </Tooltip>
        </CircleMarker>
      ))}
      <MapActions satellite={satellite} onToggleSatellite={() => setSatellite((value) => !value)} />
      <MapFocus activeStop={activeStop} />
    </MapContainer>
  );
}
