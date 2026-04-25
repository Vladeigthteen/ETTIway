
let campusMap;
let buildingsLayer;
let buildingsData = [];
let entrancesLayer;
const STYLES = {};
function initializeMap(lat = DEFAULT_CAMPUS_LAT, lon = DEFAULT_CAMPUS_LON, zoom = DEFAULT_ZOOM_LEVEL) {
    campusMap = L.map('map', {
        maxBounds: MAP_BOUNDS,
        maxBoundsViscosity: 1.0, // Makes the bounds solid (user can't drag outside)
        minZoom: 16 // Prevent zooming out too far
    }).setView([lat, lon], zoom);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        minZoom: 14
    }).addTo(campusMap);
    buildingsLayer = L.layerGroup().addTo(campusMap);
    entrancesLayer = L.layerGroup().addTo(campusMap);
    const drawnGroup = L.featureGroup().addTo(campusMap);
    const urlParams = new URLSearchParams(window.location.search);
    const isEditMode = urlParams.get('edit') === '1';
    if (isEditMode && typeof initGraphEditor === 'function') {
        initGraphEditor(campusMap, drawnGroup);
    } else if (!isEditMode) {
    }
    if (isEditMode) {
        const FloorControl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function() {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.style.backgroundColor = 'white';
                container.style.cursor = 'pointer';
                const btn = document.createElement('a');
                btn.innerHTML = 'ðŸ¢'; 
                btn.title = 'Editare Etaje';
                btn.style.display = 'flex';
                btn.style.justifyContent = 'center';
                btn.style.alignItems = 'center';
                btn.style.width = '30px';
                btn.style.height = '30px';
                btn.style.textDecoration = 'none';
                btn.style.color = '#333';
                btn.style.fontSize = '18px';
                btn.onclick = (e) => {
                    L.DomEvent.stop(e);
                    if (window.openFloorManager) {
                        window.openFloorManager();
                    } else {
                        console.error("Indoor Manager logic not loaded.");
                        alert("Eroare: Modulul de editare etaje nu este incarcat.");
                    }
                };
                container.appendChild(btn);
                return container;
            }
        });
        campusMap.addControl(new FloorControl());
    }
    console.log('Map initialized successfully');
    return { 
        map: campusMap, 
        drawnGroup: drawnGroup,
    };
}
function drawEntrances(entrances) {
    if (!entrances || !Array.isArray(entrances) || !campusMap) return;
    entrancesLayer.clearLayers();
    entrances.forEach(ent => {
        if (!ent || !ent.coordinates || ent.coordinates.length < 2) return;
        const latlng = ent.coordinates;
        let fillColor = '#2980b9'; // pedestrian default (blue)
        if (ent.type === 'vehicle') fillColor = '#27ae60'; // vehicle (green)
        const marker = L.circleMarker(latlng, {
            radius: 6,
            fillColor: fillColor,
            color: '#ffffff',
            weight: 1,
            fillOpacity: 0.95
        });
        const tooltip = ent.name || ent.id || 'Intrare';
        marker.bindTooltip(tooltip, { direction: 'top', permanent: false, className: 'entrance-tooltip' });
        marker.on('click', () => {
            campusMap.panTo(latlng);
        });
        entrancesLayer.addLayer(marker);
    });
}
function createBuildingPolygon(building) {
    if (!building.points || building.points.length < 3) {
        console.warn(`Invalid points for building ${building.id}`);
        return null;
    }
    const polygon = L.polygon(building.points, {
        color: building.color || "#ff7800",
        weight: 1,
        fillOpacity: 0.2,
        buildingId: building.id // Store building ID for reliable identification
    });
    const labelContent = building.name || '';
    if (labelContent) {
        polygon.bindTooltip(labelContent, {
            permanent: true,
            direction: "center",
            className: "building-label"
        });
    }
    if (building.icon && (building.icon.match(/\.(jpeg|jpg|gif|png|svg)$/i) || building.icon.startsWith('http'))) {
        const center = L.latLngBounds(building.points).getCenter();
        const ICON_SIZE = [32, 32];
        const icon = L.icon({
            iconUrl: building.icon,
            iconSize: ICON_SIZE,
            iconAnchor: [ICON_SIZE[0] / 2, ICON_SIZE[1] / 2],
            className: 'building-map-icon' // allows further CSS if desired
        });
        const imgMarker = L.marker(center, { icon: icon, interactive: false });
        polygon._iconMarker = imgMarker;
        buildingsLayer.addLayer(imgMarker);
    }
    polygon.on('mouseover', function() {
        this.setStyle({
            weight: 3,
            fillOpacity: 0.5
        });
    });
    polygon.on('mouseout', function() {
        this.setStyle({
            weight: 1,
            fillOpacity: 0.2
        });
    });
    polygon.on('click', function() {
        displayBuildingDetails(building);
        if (typeof window.openFloorPlanViewer === 'function') {
            window.openFloorPlanViewer(building.name, 0);
        } else {
            console.warn("Indoor Viewer not available");
        }
    });
    return polygon;
}
function loadBuildingPolygons(buildings) {
    buildingsLayer.clearLayers();
    buildingsData = buildings;
    let validBuildings = 0;
    buildings.forEach(building => {
        const polygon = createBuildingPolygon(building);
        if (polygon) {
            buildingsLayer.addLayer(polygon);
            validBuildings++;
        }
    });
    console.log(`Loaded ${validBuildings} building polygons out of ${buildings.length} buildings`);
}
function focusOnBuilding(building) {
    let targetLayer = null;
    buildingsLayer.eachLayer(layer => {
        if (layer.options.buildingId === building.id) {
            targetLayer = layer;
        }
    });
    if (targetLayer) {
        campusMap.fitBounds(targetLayer.getBounds());
        targetLayer.setStyle({ weight: 3, fillOpacity: 0.5 });
        setTimeout(() => {
            targetLayer.setStyle({ weight: 1, fillOpacity: 0.2 });
        }, 2000);
    }
}
function displayBuildingDetails(building) {
    const detailsDiv = document.getElementById('room-details');
    const detailsHTML = `
        <h3>Building Details</h3>
        <div class="room-info">
            <span class="room-info-label">Name:</span>
            <span class="room-info-value">${escapeHtml(building.name)}</span>
        </div>
        <div class="room-info">
            <span class="room-info-label">Description:</span>
            <span class="room-info-value">${escapeHtml(building.description)}</span>
        </div>
    `;
    detailsDiv.innerHTML = detailsHTML;
    detailsDiv.style.display = 'block';
}
function drawCampusBoundary(boundaryPoints) {
    if (!boundaryPoints || boundaryPoints.length < 3) return;
    L.polygon(boundaryPoints, {
        color: '#1466b8ff',
        weight: 2,
        dashArray: '5, 10',
        fill: false,
        interactive: false
    }).addTo(campusMap);
}
function isPointInPolygon(point, vs) {
    let x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1];
        let xj = vs[j][0], yj = vs[j][1];
        let intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
let watchId = null;
let userMarker = null;
let accuracyCircle = null;
let currentHeading = 0;
function handleOrientation(event) {
    let alpha = event.alpha;
    let webkitHeading = event.webkitCompassHeading;
    if (webkitHeading) {
        currentHeading = webkitHeading;
    } else if (alpha !== null) {
        currentHeading = 360 - alpha;
    }
    if (userMarker && userMarker._icon) {
        const svgArrow = userMarker._icon.querySelector('.user-direction-svg');
        if (svgArrow) {
            svgArrow.style.transform = `rotate(${currentHeading}deg)`;
        }
    }
}
if ('ondeviceorientationabsolute' in window) {
    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
} else {
    window.addEventListener('deviceorientation', handleOrientation, true);
}
const customUserIcon = L.divIcon({
    className: 'custom-user-indicator',
    html: `
    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative;">
        <!-- SVG-ul (SÄƒgeata) pe care o vom roti dinamic cu deviceorientation -->
        <svg class="user-direction-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="width: 32px; height: 32px; transform-origin: center center; position: absolute; top:0; left:0; transition: transform 0.1s linear;">
            <path d="M 16 0 L 24 16 L 16 12 L 8 16 Z" fill="#e74c3c" stroke="white" stroke-width="1.5" />
        </svg>
        <!-- Cercul albastru permanent pt locaÈ›ia fixÄƒ -->
        <div style="width: 14px; height: 14px; background: #3498db; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 4px rgba(0,0,0,0.5); z-index: 2; position: relative;"></div>
    </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});
let routeLayer = null;
function toggleLocation() {
    const btn = document.getElementById('find-me-btn');
    const warning = document.getElementById('geo-warning');
    if (watchId === null) {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(permissionState => {
                if (permissionState !== 'granted') console.warn('Compass permission denied by user.');
            }).catch(console.error);
        }
        if (window.isTestMode) {
            watchId = "test_mode";
            if (btn) {
                btn.style.backgroundColor = 'blue';
                btn.style.color = 'white';
                btn.innerText = 'Test Mode: Activ (Click pe hartÄƒ)';
            }
            alert("Test Mode activat. FÄƒ click oriunde pe hartÄƒ pentru a-È›i simula poziÈ›ia de plecare.");
            return;
        }
        if (!navigator.geolocation) {
            alert("Geolocation nu este suportatÄƒ de browser-ul tÄƒu.");
            return;
        }
        if (btn) {
            btn.style.backgroundColor = 'blue';
            btn.style.color = 'white';
            btn.innerText = 'Activ';
        }
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                const userPoint = [userLat, userLon];
                if (userMarker) {
                    userMarker.setLatLng(userPoint);
                } else {
                    userMarker = L.marker(userPoint, { icon: customUserIcon }).addTo(campusMap);
                    userMarker.bindPopup("Te afli aici.");
                }
                if (window.currentDestinationPoint && typeof window.calculateRouteTest === 'function') {
                    window.currentStartPoint = L.latLng(userPoint[0], userPoint[1]);
                    window.calculateRouteTest(campusMap, L.featureGroup(), window.currentStartPoint, window.currentDestinationPoint);
                }
                if (accuracyCircle) {
                    accuracyCircle.setLatLng(userPoint);
                    accuracyCircle.setRadius(accuracy);
                } else {
                    accuracyCircle = L.circle(userPoint, {
                        radius: accuracy,
                        fillColor: '#3498db',
                        color: '#3498db',
                        weight: 2,
                        fillOpacity: 0.3
                    }).addTo(campusMap);
                }
                const boundary = typeof CAMPUS_POINTS !== 'undefined' ? CAMPUS_POINTS : window.campusData?.campus?.boundary;
                if (boundary && boundary.length >= 3) {
                    if (isPointInPolygon(userPoint, boundary)) {
                        if (warning) warning.style.display = 'none';
                    } else {
                        if (warning) warning.style.display = 'block';
                    }
                }
                campusMap.setView(userPoint, 19);
            },
            (error) => {
                console.error("Eroare de localizare:", error);
            },
            { enableHighAccuracy: true }
        );
    } else {
        if (window.isTestMode) {
            watchId = null;
        } else {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        if (userMarker) {
            userMarker.remove();
            userMarker = null;
        }
        if (accuracyCircle) {
            accuracyCircle.remove();
            accuracyCircle = null;
        }
        if (routeLayer) {
            routeLayer.clearLayers();
        }
        if (btn) {
            btn.style.backgroundColor = '#3498db';
            btn.style.color = 'white';
            btn.innerText = 'Find Me';
        }
        if (warning) warning.style.display = 'none';
    }
}
