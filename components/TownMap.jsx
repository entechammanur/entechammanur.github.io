import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';

const townCenter = [10.67449, 76.01306];
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
  const [roadRoute, setRoadRoute] = useState([]);
  const [routeStatus, setRouteStatus] = useState('');
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
  const routeKey = route.map(([latitude, longitude]) => `${longitude},${latitude}`).join(';');

  useEffect(() => {
    if (route.length < 2) {
      setRoadRoute([]);
      setRouteStatus('');
      return undefined;
    }

    const controller = new AbortController();
    setRoadRoute([]);
    setRouteStatus('loading');

    const loadRoadRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${routeKey}?overview=full&geometries=geojson&steps=false`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`Road routing service returned ${response.status}.`);
        }

        const result = await response.json();
        const coordinates = result.routes?.[0]?.geometry?.coordinates;
        if (result.code !== 'Ok' || !Array.isArray(coordinates) || coordinates.length < 2) {
          throw new Error(result.message || 'Road routing service returned no route.');
        }
        const hasInvalidCoordinate = coordinates.some((coordinate) => (
          !Array.isArray(coordinate)
          || coordinate.length < 2
          || !Number.isFinite(coordinate[0])
          || !Number.isFinite(coordinate[1])
          || Math.abs(coordinate[0]) > 180
          || Math.abs(coordinate[1]) > 90
        ));
        if (hasInvalidCoordinate) {
          throw new Error('Road routing service returned invalid coordinates.');
        }

        setRoadRoute(coordinates.map(([longitude, latitude]) => [latitude, longitude]));
        setRouteStatus('');
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('The road route could not be loaded.', error);
        setRoadRoute([]);
        setRouteStatus('Road route unavailable. Landmark markers are still shown.');
      }
    };

    void loadRoadRoute();
    return () => controller.abort();
  }, [routeKey, route.length]);

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
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      className={`leaflet-town-map ${satellite ? 'is-satellite' : ''}`}
    >
      <TileLayer attribution={tiles.attribution} url={tiles.url} />
      {roadRoute.length > 1 && (
        <>
          <Polyline positions={roadRoute} pathOptions={{ color: 'var(--color-paper)', weight: 8, opacity: 0.9 }} />
          <Polyline positions={roadRoute} pathOptions={{ color: 'var(--color-accent)', weight: 4, opacity: 1 }} />
        </>
      )}
      {Object.entries(safeLocations).map(([key, location]) => (
        <CircleMarker
          key={key}
          center={location.coordinates}
          radius={activeStop === key ? 12 : 9}
          pathOptions={{
            color: 'var(--color-paper)',
            weight: 3,
            fillColor: activeStop === key || location.isHighlighted ? 'var(--color-accent)' : 'var(--color-ink-2)',
            fillOpacity: 1,
          }}
          eventHandlers={{ click: () => onSelectStop(key) }}
        >
          <Tooltip direction="top" offset={[0, -10]} permanent>{location.label}</Tooltip>
        </CircleMarker>
      ))}
      <MapActions satellite={satellite} onToggleSatellite={() => setSatellite((value) => !value)} />
      {routeStatus && (
        <div className="leaflet-route-status" role={routeStatus === 'loading' ? 'status' : 'alert'}>
          {routeStatus === 'loading' ? 'Loading road route…' : routeStatus}
        </div>
      )}
    </MapContainer>
  );
}
