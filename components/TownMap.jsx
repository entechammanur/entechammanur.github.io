import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';

const townCenter = [10.6724, 76.0084];
const route = [
  [10.67287, 75.99524],
  [10.67217, 75.99541],
  [10.6742, 76.0048],
  [10.6745, 76.012],
  [10.6711, 76.0215],
];

const locations = {
  sbi: { coordinates: [10.6728718, 75.9952439], label: 'State Bank of India', note: 'Moonnamkallu, Althara' },
  school: { coordinates: [10.6711057, 76.0214967], label: 'Amal English School', note: 'Chammanoor' },
  post: { coordinates: [10.6721701, 75.995414], label: 'Punnayurkulam Post Office', note: 'Moonnamkallu, Althara · PIN 679561' },
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
