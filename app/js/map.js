/**
 * map.js - Interactive map functionality for ETTIway
 * Handles map initialization, building creation, and user interactions
 */

// Global map and buildings storage
let campusMap;
let buildingsLayer;
let buildingsData = [];
let entrancesLayer;
// Styling defaults (easy to change)
const STYLES = {};

/**
 * Initialize the interactive map using Leaflet
 * Sets up the base map with OpenStreetMap tiles
 * @param {number} lat - Latitude for map center (optional, defaults to ETTI Campus)
 * @param {number} lon - Longitude for map center (optional, defaults to ETTI Campus)
 * @param {number} zoom - Initial zoom level (optional, defaults to 16)
 * @returns {Object} Map instance and editor controls
 */
function initializeMap(lat = DEFAULT_CAMPUS_LAT, lon = DEFAULT_CAMPUS_LON, zoom = DEFAULT_ZOOM_LEVEL) {
    // Create map centered on specified coordinates with boundary restrictions
    campusMap = L.map('map', {
        maxBounds: MAP_BOUNDS,
        maxBoundsViscosity: 1.0, // Makes the bounds solid (user can't drag outside)
        minZoom: 16 // Prevent zooming out too far
    }).setView([lat, lon], zoom);
    
    // Add CartoDB Positron No Labels tile layer (clean map without text)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        minZoom: 14
    }).addTo(campusMap);
    
    // Create a layer group for buildings (allows easy management)
    buildingsLayer = L.layerGroup().addTo(campusMap);
    // Layer for entrances (gates/parking/pedestrian)
    entrancesLayer = L.layerGroup().addTo(campusMap);
    
    // -- Map Editor --
    const drawnGroup = L.featureGroup().addTo(campusMap);
    if (typeof initGraphEditor === 'function') {
        initGraphEditor(campusMap, drawnGroup);
    } else {
        console.warn('Graph Editor script not found');
    }
    
    console.log('Map initialized successfully');

    return { 
        map: campusMap, 
        drawnGroup: drawnGroup,
    };
}

/**
 * Draw entrance markers on the map
 * @param {Array} entrances - Array of entrance objects {id,name,type,coordinates}
 */
function drawEntrances(entrances) {
    if (!entrances || !Array.isArray(entrances) || !campusMap) return;

    // Clear existing entrance markers
    entrancesLayer.clearLayers();

    entrances.forEach(ent => {
        if (!ent || !ent.coordinates || ent.coordinates.length < 2) return;

        const latlng = ent.coordinates;

        // Style based on type
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
            // center map on entrance when clicked
            campusMap.panTo(latlng);
        });

        entrancesLayer.addLayer(marker);
    });
}

/**
 * Create a polygon for a building
 * @param {Object} building - Building data object
 * @returns {L.Polygon|null} Leaflet polygon object or null if invalid coordinates
 */
function createBuildingPolygon(building) {
    // Validate points
    if (!building.points || building.points.length < 3) {
        console.warn(`Invalid points for building ${building.id}`);
        return null;
    }
    
    // Create polygon with building information
    const polygon = L.polygon(building.points, {
        color: building.color || "#ff7800",
        weight: 1,
        fillOpacity: 0.2,
        buildingId: building.id // Store building ID for reliable identification
    });
    
    // Add permanent text label by default (keeps map readable)
    const labelContent = building.name || '';
    if (labelContent) {
        polygon.bindTooltip(labelContent, {
            permanent: true,
            direction: "center",
            className: "building-label"
        });
    }

    // If building has an image icon path, create a separate Leaflet marker
    // positioned at the polygon centroid. Using a marker (L.icon or L.divIcon)
    // ensures the icon remains a fixed pixel size on screen and doesn't scale
    // when the user zooms the map.
    if (building.icon && (building.icon.match(/\.(jpeg|jpg|gif|png|svg)$/i) || building.icon.startsWith('http'))) {
        // compute a sensible center for the icon (centroid of polygon bounds)
        // polygon must be added to map to compute pixel accurate center; use bounds center
        const center = L.latLngBounds(building.points).getCenter();

        // create a pixel-sized icon (adjust size as needed)
        const ICON_SIZE = [32, 32];
        const icon = L.icon({
            iconUrl: building.icon,
            iconSize: ICON_SIZE,
            iconAnchor: [ICON_SIZE[0] / 2, ICON_SIZE[1] / 2],
            className: 'building-map-icon' // allows further CSS if desired
        });

        // create marker and add it to the same layer group as the polygon so
        // it is managed together. Make it non-interactive so it doesn't block
        // polygon clicks (we still have polygon click handler above).
        const imgMarker = L.marker(center, { icon: icon, interactive: false });
        // store a reference on the polygon so callers can remove or identify
        // related marker if needed
        polygon._iconMarker = imgMarker;
        buildingsLayer.addLayer(imgMarker);
    }
    
    // Add interactions
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
        
        // Open indoor map for Corp B
        if (building.id === 'buildingB' && typeof openIndoor === 'function') {
            openIndoor(building.id);
        }
    });
    
    return polygon;
}

/**
 * Load building polygons onto the map
 * @param {Array} buildings - Array of building objects
 */
function loadBuildingPolygons(buildings) {
    // Clear existing layers
    buildingsLayer.clearLayers();
    
    // Store buildings data globally
    buildingsData = buildings;
    
    // Create and add polygons for each building
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

/**
 * Focus map on a specific building
 * @param {Object} building - Building data object
 */
function focusOnBuilding(building) {
    // Find the layer corresponding to the building
    let targetLayer = null;
    buildingsLayer.eachLayer(layer => {
        if (layer.options.buildingId === building.id) {
            targetLayer = layer;
        }
    });

    if (targetLayer) {
        // Fit map to polygon bounds
        campusMap.fitBounds(targetLayer.getBounds());
        
        // Simulate mouseover effect temporarily
        targetLayer.setStyle({ weight: 3, fillOpacity: 0.5 });
        setTimeout(() => {
            targetLayer.setStyle({ weight: 1, fillOpacity: 0.2 });
        }, 2000);
    }
}

/**
 * Display building details in the sidebar
 * @param {Object} building - Building data object
 */
function displayBuildingDetails(building) {
    const detailsDiv = document.getElementById('room-details');
    
    // Create HTML for building details
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
    
    // Show the details section (if hidden)
    detailsDiv.style.display = 'block';
}

/**
 * Draw the campus boundary
 * @param {Array} boundaryPoints - Array of [lat, lon] points
 */
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

// Path Drawing Mode removed per request


// Removed OSM logic per request

