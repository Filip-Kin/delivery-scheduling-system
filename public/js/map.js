const TOMTOM_ROOT = 'https://api.tomtom.com/routing/1/calculateRoute/';
const TOMTOM_API_KEY = 'Hg4jLs5luDaRh8dod5xPmmJIILwSqpCB';
const TOMTOM_OPTIONS = '/json?routeRepresentation=polyline&departAt=now&routeType=fastest&traffic=true&avoid=unpavedRoads&travelMode=truck&vehicleCommercial=true'
const MAPS_API_KEY = 'AIzaSyCtA_clScnfTOWVumOPPM4Qk4hVvbpFTts';

const STREETVIEW_API_KEY = 'AIzaSyCtA_clScnfTOWVumOPPM4Qk4hVvbpFTts';
const STREETVIEW_FOV = 90;

const LOCATIONS = {
    1: { lat: -36.927150, lng: 174.805333 }, // Onehunga
    2: { lat: -36.946745, lng: 174.893381 }, // East Tamaki
    4: { lat: -36.718036, lng: 174.695739 }, // Albany
    9: { lat: -36.620664, lng: 174.677284 }, // Hibiscus Coast
    10: { lat: -36.814676, lng: 174.601116 }, // Westgate
}

latLongEncoder = (latlong) => {
    return encodeURIComponent(latlong.lat+','+latlong.lng+':');
}

let script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&callback=initMap`;
script.defer = true;


let map;
let path;

const initMap = () => {
    map = new google.maps.Map(document.getElementById("map"), {
        center: {
            lat: -36.848,
            lng: 174.763
        },
        zoom: 10,
    });
}

const calcRoute = async () => {
    if (order.location === 7) return M.toast({
        html: 'This order is a direct delivery'
    });
    if (order.address[0] === '1' || order.address[0] === '') return M.toast({
        html: 'No delivery address'
    });

    let geocodeResult = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(order.address.join(', ')) + '&key=' + MAPS_API_KEY).then(res => res.json());
    let dest = geocodeResult.results[0].geometry.location;
    let res = await fetch(TOMTOM_ROOT + latLongEncoder(LOCATIONS[order.location]) + encodeURIComponent(`${dest.lat},${dest.lng}`) + TOMTOM_OPTIONS + '&key=' + TOMTOM_API_KEY).then(res => res.json());
    let route = res.routes[0].legs[0].points.map(x => ({
        lat: x.latitude,
        lng: x.longitude
    }));

    order.time = parseInt(res.routes[0].legs[0].summary.travelTimeInSeconds/60);
    order.distance = parseFloat((res.routes[0].legs[0].summary.lengthInMeters/1000).toFixed(1));
    document.getElementById('distance').innerText = `${order.distance} km - ${order.time} minutes`;

    let minLat = route[0].lat,
        minLng = route[0].lng,
        maxLat = route[0].lat,
        maxLng = route[0].lng;
    for (let point of route) {
        if (point.lat < minLat) minLat = point.lat
        if (point.lng < minLng) minLng = point.lng
        if (point.lat > maxLat) maxLat = point.lat
        if (point.lng > maxLng) minLng = point.lng
    }

    map.setCenter({
        lat: ((maxLat - minLat) / 2) + minLat,
        lng: ((maxLng - minLng) / 2) + minLng
    });

    let xZoom, yZoom;
    if ((maxLat - minLat) < 0) xZoom = (minLat - maxLat) * -24.22 + 13.5;
    else xZoom = (maxLat - minLat) * -24.22 + 13.5;
    
    if ((minLng - maxLng) < 0) yZoom = (maxLng - minLng) * -24.22 + 13.5;
    else yZoom = (minLng - maxLng) * -24.22 + 13.5;

    map.setZoom((xZoom > yZoom) ? xZoom : yZoom)

    try {path.setMap(null)} catch(e) {}
    path = new google.maps.Polyline({
        path: route,
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 2,
    });
    path.setMap(map)

    new google.maps.Marker({
      position: LOCATIONS[order.location],
      map,
      icon: 'https://fonts.gstatic.com/s/i/materialicons/store/v5/24px.svg',
      title: "NZLS",
    });

    new google.maps.Marker({
      position: geocodeResult.results[0].geometry.location,
      map,
      icon: 'https://fonts.gstatic.com/s/i/materialicons/place/v6/24px.svg',
      title: "Dest",
    });
}

const setStreetView = (elm, location) => {
    let width = document.getElementById('streetview-container').offsetWidth-20;
    elm.src = `https://maps.googleapis.com/maps/api/streetview?size=${width}x${(width*.5).toFixed(0)}&fov=${STREETVIEW_FOV}&location=${encodeURIComponent(location)}&key=${STREETVIEW_API_KEY}`;
}

window.initMap = initMap;
document.head.appendChild(script);
