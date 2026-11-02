const PLUS_CODE_ALPHABET = '23456789CFGHJMPQRVWX';
const PAIR_RESOLUTIONS = [20, 1, 0.05, 0.0025, 0.000125];

function decodePlusCode(value) {
  const code = value.toUpperCase().replace(/\s/g, '');
  const separator = code.indexOf('+');
  if (separator < 2 || separator > 8 || code.length < separator + 3) return null;
  const significant = code.replace('+', '');
  if (!/^[23456789CFGHJMPQRVWX]+$/.test(significant) || separator < 8) return null;

  let latitude = -90;
  let longitude = -180;
  const pairLength = Math.min(separator, 10);
  for (let index = 0; index < pairLength; index += 2) {
    const latDigit = PLUS_CODE_ALPHABET.indexOf(code[index]);
    const lngDigit = PLUS_CODE_ALPHABET.indexOf(code[index + 1]);
    if (latDigit < 0 || lngDigit < 0) return null;
    const resolution = PAIR_RESOLUTIONS[index / 2];
    latitude += latDigit * resolution;
    longitude += lngDigit * resolution;
  }

  let latitudeResolution = PAIR_RESOLUTIONS[Math.min(pairLength / 2, 4)] || 0.000125;
  let longitudeResolution = latitudeResolution;
  for (let index = 10; index < significant.length; index += 1) {
    const digit = PLUS_CODE_ALPHABET.indexOf(significant[index]);
    if (digit < 0) return null;
    latitudeResolution /= 5;
    longitudeResolution /= 4;
    latitude += Math.floor(digit / 4) * latitudeResolution;
    longitude += (digit % 4) * longitudeResolution;
  }

  return {
    latitude: latitude + latitudeResolution / 2,
    longitude: longitude + longitudeResolution / 2,
  };
}

function parseCoordinates(value) {
  const match = value.match(/(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}

function parseGoogleMapsUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const coordinatePatterns = [
    /@(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,
    /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
  ];
  const urlText = `${url.pathname} ${url.search} ${url.hash}`;
  for (const pattern of coordinatePatterns) {
    const match = urlText.match(pattern);
    if (match) {
      const coordinates = parseCoordinates(`${match[1]},${match[2]}`);
      if (coordinates) return coordinates;
    }
  }

  for (const key of ['q', 'query', 'll', 'center', 'destination', 'daddr']) {
    const coordinates = parseCoordinates(url.searchParams.get(key) || '');
    if (coordinates) return coordinates;
  }
  return null;
}

export function parseLocationInput(value = '') {
  const input = value.trim();
  if (!input) return { type: 'empty', coordinates: null };

  const coordinates = parseCoordinates(input);
  if (coordinates) return { type: 'coordinates', coordinates };

  const plusCodeMatch = input.toUpperCase().match(/[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,}/);
  if (plusCodeMatch) {
    const plusCodeCoordinates = decodePlusCode(plusCodeMatch[0]);
    if (plusCodeCoordinates) return { type: 'plus_code', coordinates: plusCodeCoordinates };
  }

  if (/^https?:\/\//i.test(input)) {
    const linkCoordinates = parseGoogleMapsUrl(input);
    if (linkCoordinates) return { type: 'google_maps_link', coordinates: linkCoordinates };
  }

  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(input)) {
    return { type: 'short_google_maps_link', coordinates: null };
  }
  if (/google\.[^/]+\/maps|maps\.google\./i.test(input)) {
    return { type: 'google_maps_link', coordinates: null };
  }
  return { type: 'unrecognized', coordinates: null };
}
