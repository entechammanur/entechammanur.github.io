import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';

const townCenter = [10.67449, 76.01306];
function MapFocus({ activeStop, locations }) {
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
  }, [activeStop, locations, map]);

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

export default function TownMap({ activeStop, onSelectStop, locations = {} }) {
  const [satellite, setSatellite] = useState(false);
  const safeLocations = Object.fromEntries(
    Object.entries(locations).filter(([, location]) => (
      Array.isArray(location.coordinates)
      && location.coordinates.length === 2
      && location.coordinates.every((value) => Number.isFinite(Number(value)))
      && Math.abs(Number(location.coordinates[0])) <= 90
      && Math.abs(Number(location.coordinates[1])) <= 180
    )),
  );
  const route = Object.values(safeLocations).map(({ coordinates }) => coordinates);
  const mapCoordinates = route.length > 0 ? route[0] : townCenter;
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
      center={mapCoordinates}
      zoom={route.length === 1 ? 16 : 14}
      scrollWheelZoom
      className={`leaflet-town-map ${satellite ? 'is-satellite' : ''}`}
      bounds={route.length > 1 ? route : undefined}
      boundsOptions={{ padding: [45, 45] }}
    >
      <TileLayer attribution={tiles.attribution} url={tiles.url} />
      {route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#d8873f', weight: 5, opacity: 0.9, dashArray: '10 10' }} />}
      {Object.entries(safeLocations).map(([key, location], index) => (
        <CircleMarker
          key={key}
          center={location.coordinates}
          radius={activeStop === key ? 12 : 9}
          pathOptions={{
            color: '#fff',
            weight: 3,
            fillColor: activeStop === key || location.isHighlighted ? '#e7a35a' : '#173b31',
            fillOpacity: 1,
          }}
          eventHandlers={{ click: () => onSelectStop(key) }}
        >
          <Tooltip direction="top" offset={[0, -10]} permanent={activeStop === key}>
            <strong>{location.stopLabel || `STOP ${String(index + 1).padStart(2, '0')}`} · {location.label}</strong>
            <br />
            {location.note}
          </Tooltip>
        </CircleMarker>
      ))}
      <MapActions satellite={satellite} onToggleSatellite={() => setSatellite((value) => !value)} />
      <MapFocus activeStop={activeStop} locations={safeLocations} />
    </MapContainer>
  );
}
