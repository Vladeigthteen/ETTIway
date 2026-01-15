/**
 * map.js - Interactive map functionality for ETTIway
 * Handles map initialization, building creation, and user interactions
 */

// Global map and buildings storage
let campusMap;
let buildingsLayer;
let buildingsData = [];
let entrancesLayer;
// Layers for paths
let drawnPathsLayer;    // used in Edit Mode (hidden by default)
let missingRoadsLayer;  // renders data.paths as solid gray (visible by default)
let existingRoadsLayer; // Extracted from OSM
// Styling defaults (easy to change)
const STYLES = {
    drawn: { color: '#e67e22', border: '#ffffffff', weight: 4, dash: '3,6', opacity: 1.0 },
    missing: { color: '#ffffffff', border: '#e6e0e0ff', weight: 10, dash: null, opacity: 0.7 },
    osm: { color: '#666666', weight: 2, opacity: 0.7 }
};

/**
 * Initialize the interactive map using Leaflet
 * Sets up the base map with OpenStreetMap tiles
 * @param {number} lat - Latitude for map center (optional, defaults to ETTI Campus)
 * @param {number} lon - Longitude for map center (optional, defaults to ETTI Campus)
 * @param {number} zoom - Initial zoom level (optional, defaults to 16)
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
    // Layer for missing roads (from data.paths) - visible by default
    missingRoadsLayer = L.layerGroup().addTo(campusMap);
    // Layer for user-drawn paths (edit mode) - not added to map by default
    drawnPathsLayer = L.layerGroup();
    // Layer for OSM roads
    existingRoadsLayer = L.layerGroup();

    // expose on window for toggles/UI
    window.missingRoadsLayer = missingRoadsLayer;
    window.drawnPathsLayer = drawnPathsLayer;
    
    console.log('Map initialized successfully');
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

// =========================
// Path Drawing Mode
// =========================

/**
 * Helper: create a bordered polyline (two stacked polylines) and return a wrapper
 * so callers can setLatLngs(...) on it. This gives the visual effect of a stroke
 * outline (border color) behind the main line.
 * @param {Array} latlngs initial latlngs
 * @param {Object} opts options for the main polyline: { color, weight, dashArray, opacity }
 * @param {String} borderColor color for the border/outline
 * @param {L.LayerGroup} targetLayer optional layer to add both polylines to
 * @returns {Object} wrapper with methods: setLatLngs(arr), addTo(layer), remove()
 */
function createBorderedPolyline(latlngs = [], opts = {}, borderColor = '#ffffff', targetLayer = null) {
    // border is drawn first (wider), then the main line on top
    const borderWeight = (opts.weight || 3) + 2; // slightly thicker
    const borderPoly = L.polyline(latlngs, {
        color: borderColor,
        weight: borderWeight,
        opacity: (opts.opacity !== undefined ? opts.opacity : 0.9),
        interactive: false
    });

    const mainPoly = L.polyline(latlngs, {
        color: opts.color || '#e67e22',
        weight: opts.weight || 3,
        dashArray: opts.dashArray || null,
        opacity: (opts.opacity !== undefined ? opts.opacity : 1.0)
    });

    const wrapper = {
        border: borderPoly,
        main: mainPoly,
        setLatLngs(arr) {
            wrapper.border.setLatLngs(arr);
            wrapper.main.setLatLngs(arr);
        },
        addTo(layer) {
            if (!layer) return;
            layer.addLayer(wrapper.border);
            layer.addLayer(wrapper.main);
        },
        remove() {
            try { wrapper.border.remove(); } catch (e) {}
            try { wrapper.main.remove(); } catch (e) {}
        }
    };

    if (targetLayer) wrapper.addTo(targetLayer);
    return wrapper;
}

// Drawing state
let drawModeEnabled = false;
let currentPathPoints = [];
let currentPolyline = null;
let _mapClickHandler = null;
let _drawIdCounter = 1;

// Floating panel elements (created on demand)
let _drawPanel = null;

function _ensureDrawPanel() {
    if (_drawPanel) return;
    _drawPanel = document.createElement('div');
    _drawPanel.id = 'draw-panel';
    _drawPanel.className = 'draw-panel';
    _drawPanel.innerHTML = `
        <div class="draw-header">Draw Mode</div>
        <div class="draw-status-row">Status: <span id="draw-status">OFF</span></div>
        <div class="draw-points-row">Points: <span id="draw-points">0</span></div>
        <div class="draw-last-row">Last: <span id="draw-last">-</span></div>
        <div id="draw-msg" class="draw-msg" aria-live="polite"></div>
    `;
    document.body.appendChild(_drawPanel);
}

function _updateDrawPanel() {
    _ensureDrawPanel();
    const statusEl = document.getElementById('draw-status');
    const pointsEl = document.getElementById('draw-points');
    const lastEl = document.getElementById('draw-last');
    const msgEl = document.getElementById('draw-msg');

    statusEl.textContent = drawModeEnabled ? 'ON' : 'OFF';
    pointsEl.textContent = currentPathPoints.length;
    if (currentPathPoints.length > 0) {
        const p = currentPathPoints[currentPathPoints.length - 1];
        lastEl.textContent = p.lat.toFixed(6) + ', ' + p.lng.toFixed(6);
    } else {
        lastEl.textContent = '-';
    }
    // clear transient message after a short delay
    if (msgEl && msgEl.dataset.timeout) {
        clearTimeout(msgEl.dataset.timeout);
        delete msgEl.dataset.timeout;
    }
    msgEl.textContent = '';
}

function _showDrawMessage(text, timeout = 2500) {
    _ensureDrawPanel();
    const msgEl = document.getElementById('draw-msg');
    if (!msgEl) return;
    msgEl.textContent = text;
    if (msgEl.dataset.timeout) clearTimeout(msgEl.dataset.timeout);
    msgEl.dataset.timeout = setTimeout(() => { msgEl.textContent = ''; delete msgEl.dataset.timeout; }, timeout);
}

/**
 * enableDrawMode - begin capturing clicks to form a path
 */
function enableDrawMode() {
    if (!campusMap) {
        console.warn('Map not initialized yet');
        return;
    }
    if (drawModeEnabled) return;
    drawModeEnabled = true;
    currentPathPoints = [];

    // create an empty bordered polyline and add it to the drawnPathsLayer (edit layer)
    if (!drawnPathsLayer) drawnPathsLayer = L.layerGroup();
    currentPolyline = createBorderedPolyline([], { color: STYLES.drawn.color, weight: STYLES.drawn.weight, dashArray: STYLES.drawn.dash, opacity: STYLES.drawn.opacity }, STYLES.drawn.border, drawnPathsLayer);

    // click handler
    _mapClickHandler = function(e) {
        const latlng = e.latlng;
        currentPathPoints.push(latlng);
        currentPolyline.setLatLngs(currentPathPoints);
        _updateDrawPanel();
    };

    campusMap.on('click', _mapClickHandler);
    _ensureDrawPanel();
    _updateDrawPanel();
}

/**
 * disableDrawMode - stop capturing clicks
 */
function disableDrawMode() {
    if (!drawModeEnabled) return;
    drawModeEnabled = false;
    if (_mapClickHandler && campusMap) campusMap.off('click', _mapClickHandler);
    _mapClickHandler = null;
    _updateDrawPanel();
}

/**
 * undoLastPoint - remove last point from current path
 */
function undoLastPoint() {
    if (!currentPathPoints || currentPathPoints.length === 0) return;
    currentPathPoints.pop();
    if (currentPolyline) currentPolyline.setLatLngs(currentPathPoints);
    _updateDrawPanel();
}

/**
 * clearCurrentPath - clear current path points and polyline
 */
function clearCurrentPath() {
    currentPathPoints = [];
    if (currentPolyline) {
        currentPolyline.setLatLngs([]);
    }
    _updateDrawPanel();
}

/**
 * exportCurrentPath - build JSON and copy to clipboard (try)
 */
async function exportCurrentPath() {
    if (!currentPathPoints || currentPathPoints.length === 0) {
        _showDrawMessage('No points to export');
        return;
    }

    const id = 'path_' + _drawIdCounter++;
    const payload = {
        id: id,
        type: 'pedestrian',
        points: currentPathPoints.map(p => [parseFloat(p.lat.toFixed(6)), parseFloat(p.lng.toFixed(6))])
    };

    const json = JSON.stringify(payload, null, 2);
    // Helpful console output for easy copy/paste into data file
    console.log('// Paste into campus.sample.json -> paths:[...]');
    console.log(json);

    // Try copying to clipboard
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(json);
            _showDrawMessage('Path exported and copied to clipboard');
        } else {
            _showDrawMessage('Path exported (clipboard not available)');
        }
    } catch (err) {
        console.warn('Clipboard write failed', err);
        _showDrawMessage('Exported but clipboard copy failed');
    }

    // Optionally disable draw mode after export
    // disableDrawMode();

    // Add exported path to runtime storage and preview on missingRoadsLayer
    try {
        addPathObject(payload);
    } catch (e) {
        console.warn('Failed to add exported path to runtime', e);
    }
}

// Make functions available globally so main.js UI can call them
window.enableDrawMode = enableDrawMode;
window.disableDrawMode = disableDrawMode;
window.undoLastPoint = undoLastPoint;
window.clearCurrentPath = clearCurrentPath;
window.exportCurrentPath = exportCurrentPath;
/**
 * renderPathsFromData - render missingRoadsLayer from data.paths
 * Note: data.paths is kept as the routing network but rendered into missingRoadsLayer
 * (solid gray) rather than the edit-layer (drawnPathsLayer).
 * @param {Object} data - campus JSON object
 */
function renderPathsFromData(data) {
    if (!campusMap) return;
    if (!missingRoadsLayer) missingRoadsLayer = L.layerGroup().addTo(campusMap);

    missingRoadsLayer.clearLayers();
    // Clear any existing runtime wrappers (we'll recreate them below)
    try {
        Object.keys(_runtimePathLayers).forEach(id => {
            try { _runtimePathLayers[id].remove(); } catch (e) {}
            delete _runtimePathLayers[id];
        });
    } catch (e) {}
    if (!data || !Array.isArray(data.paths)) return;

    data.paths.forEach(obj => {
        if (!obj || !Array.isArray(obj.points) || obj.points.length === 0) return;
        const latlngs = obj.points.map(p => [parseFloat(p[0]), parseFloat(p[1])]);
           // draw with border for better visual separation
           const wrapper = createBorderedPolyline(latlngs, { color: STYLES.missing.color, weight: STYLES.missing.weight, opacity: STYLES.missing.opacity }, STYLES.missing.border, missingRoadsLayer);
           // bind tooltip on the main polyline
           try { wrapper.main.bindTooltip(obj.id || obj.type || 'path', { permanent: false, direction: 'center' }); } catch (e) {}
    });

    // Also render persisted/runtime-added paths stored in window.runtimePaths
    try {
        const rpaths = window.runtimePaths || [];
        rpaths.forEach(obj => {
            if (!obj || !Array.isArray(obj.points) || obj.points.length === 0) return;
            const latlngs = obj.points.map(p => [parseFloat(p[0]), parseFloat(p[1])]);
            const wrapper = createBorderedPolyline(latlngs, { color: STYLES.missing.color, weight: STYLES.missing.weight, opacity: STYLES.missing.opacity }, STYLES.missing.border, missingRoadsLayer);
            try { wrapper.main.bindTooltip(obj.id || obj.type || 'path', { permanent: false, direction: 'center' }); } catch (e) {}
            _runtimePathLayers[obj.id] = wrapper;
        });
    } catch (e) { console.warn('Failed to render runtime paths', e); }
}

// expose
window.renderPathsFromData = renderPathsFromData;

// Runtime storage for paths added/removed during the session
const STORAGE_KEY = 'ettiway.runtimePaths.v1';
const _runtimePathLayers = {}; // id -> wrapper (border+main)

/**
 * Load runtime paths from localStorage. If none, return empty array.
 */
function loadRuntimePathsFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (e) {
        console.warn('Failed to load runtime paths from storage', e);
        return [];
    }
}

/**
 * Save current runtime paths to localStorage
 */
function saveRuntimePathsToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.runtimePaths || []));
    } catch (e) {
        console.warn('Failed to save runtime paths to storage', e);
    }
}

// initialize runtimePaths from storage
window.runtimePaths = loadRuntimePathsFromStorage();

/**
 * addPathObject - add a path object to runtime storage and render it into missingRoadsLayer
 * @param {Object} obj - {id, type, points: [[lat,lng], ...]}
 */
function addPathObject(obj) {
    if (!obj || !Array.isArray(obj.points)) return null;
    // ensure id
    if (!obj.id) obj.id = 'path_' + (Date.now());

    // push to runtime storage

    window.runtimePaths.push(obj);
    // persist runtime paths immediately
    try { saveRuntimePathsToStorage(); } catch (e) {}

    // ensure layer
    if (!missingRoadsLayer) missingRoadsLayer = L.layerGroup().addTo(campusMap);

    const latlngs = obj.points.map(p => [parseFloat(p[0]), parseFloat(p[1])]);
    const wrapper = createBorderedPolyline(latlngs, { color: STYLES.missing.color, weight: STYLES.missing.weight, opacity: STYLES.missing.opacity }, STYLES.missing.border, missingRoadsLayer);
    try { wrapper.main.bindTooltip(obj.id || obj.type || 'path', { permanent: false, direction: 'center' }); } catch (e) {}

    _runtimePathLayers[obj.id] = wrapper;


    // notify listeners (UI) that runtime paths changed
    try { window.dispatchEvent(new CustomEvent('pathsUpdated')); } catch (e) {}

    return obj.id;
}

/**
 * removePathById - remove a runtime path and its layer by id
 * @param {String} id
 */
function removePathById(id) {
    if (!id) return false;
    // remove from runtimePaths
    const idx = (window.runtimePaths || []).findIndex(p => p.id === id);
    if (idx !== -1) window.runtimePaths.splice(idx, 1);

    // remove layer
    const wrapper = _runtimePathLayers[id];
    if (wrapper) {
        try { wrapper.remove(); } catch (e) {}
        delete _runtimePathLayers[id];
    }

    // persist updated runtime paths
    try { saveRuntimePathsToStorage(); } catch (e) {}
    // notify UI
    try { window.dispatchEvent(new CustomEvent('pathsUpdated')); } catch (e) {}
    return true;
}

// expose
window.addPathObject = addPathObject;
window.removePathById = removePathById;

/**
 * Export all runtime paths (JSON array) to clipboard and console
 */
async function exportAllRuntimePaths() {
    try {
        const arr = window.runtimePaths || [];
        const json = JSON.stringify(arr, null, 2);
        console.log('// Exported runtime paths (array)');
        console.log(json);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(json);
            alert('Toate traseele din sesiune au fost copiate în clipboard');
        } else {
            prompt('Copiează manual JSON-ul:', json);
        }
    } catch (e) {
        console.warn('exportAllRuntimePaths failed', e);
        alert('Export eșuat');
    }
}

/**
 * Clear persisted runtime paths from localStorage and from map/session
 */
function clearPersistedRuntimePaths() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) { console.warn('Failed to clear storage', e); }
    // remove all runtime path layers
    try {
        Object.keys(_runtimePathLayers).forEach(id => {
            try { _runtimePathLayers[id].remove(); } catch (e) {}
            delete _runtimePathLayers[id];
        });
    } catch (e) {}
    window.runtimePaths = [];
    try { window.dispatchEvent(new CustomEvent('pathsUpdated')); } catch (e) {}
}

window.exportAllRuntimePaths = exportAllRuntimePaths;

/**
 * Compute bounding box from a list of points
 * @param {Array<Array<number>>} points - Array of [lat, lng]
 * @returns {Object} {south, west, north, east}
 */
function getBoundingBox(points) {
    if (!points || points.length === 0) return null;
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    points.forEach(([lat, lng]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
    });

    return { south: minLat, west: minLng, north: maxLat, east: maxLng };
}

/**
 * Fetch and visualize OSM roads
 * @param {Array<Array<number>>} boundary - Campus boundary [lat, lng] points
 */
async function loadOsmRoads(boundary) {
    const statusEl = document.getElementById('osm-status');
    const updateStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

    if (!boundary) {
        updateStatus("No boundary data available.");
        return;
    }

    const CACHE_KEY = "ettiway_osm_roads_cache";
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    updateStatus("Loading OSM data...");

    try {
        let osmData = null;
        let cached = null;
        try {
             cached = localStorage.getItem(CACHE_KEY);
        } catch(e) {}
        
        const now = Date.now();

        // Check cache
        if (cached) {
            try {
                const parsedCache = JSON.parse(cached);
                if (now - parsedCache.timestamp < CACHE_DURATION) {
                    console.log("Using cached OSM data.");
                    osmData = parsedCache.data;
                }
            } catch (e) {
                console.warn("Invalid OSM cache, refetching.");
            }
        }

        // Fetch if not in cache
        if (!osmData) {
            const bbox = getBoundingBox(boundary);
            // Overpass QL: South, West, North, East
            const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
            
            const query = `[out:json][timeout:25];(way["highway"~"footway|path|pedestrian|residential|service|living_street"](${bboxStr}););out body;>;out skel qt;`;

            const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
            
            console.log("Fetching from Overpass API:", url);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Overpass API error: ${response.status}`);
            }

            osmData = await response.json();
            
            // Save to cache
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: now,
                    data: osmData
                }));
            } catch (e) {
                console.warn("Could not save to localStorage (quota exceeded?)", e);
            }
        }

        // Process and draw
        processAndDrawOsmData(osmData);
        updateStatus("OSM loaded.");
        
        // Auto-check the checkbox if it's not already
        const checkbox = document.getElementById('chk-show-osm');
        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
            toggleOsmLayer(true);
        }

    } catch (error) {
        console.error("Failed to load OSM roads:", error);
        updateStatus("Error loading OSM.");
    }
}

/**
 * Parse Overpass JSON and draw polylines
 * @param {Object} data - Overpass JSON response
 */
function processAndDrawOsmData(data) {
    if (typeof existingRoadsLayer === 'undefined' || !existingRoadsLayer) return;
    existingRoadsLayer.clearLayers();

    const nodes = new Map();
    const ways = [];

    // First pass: collect nodes
    data.elements.forEach(el => {
        if (el.type === 'node') {
            nodes.set(el.id, { lat: el.lat, lng: el.lon });
        } else if (el.type === 'way') {
            ways.push(el);
        }
    });

    // Second pass: build geometries for ways
    ways.forEach(way => {
        const latLngs = way.nodes.map(nodeId => {
            const node = nodes.get(nodeId);
            return node ? [node.lat, node.lng] : null;
        }).filter(coord => coord !== null);

        if (latLngs.length > 1) {
            L.polyline(latLngs, STYLES.osm).addTo(existingRoadsLayer);
        }
    });

    // Now connect entrances
    processEntrances();
}

/**
 * Toggle the visibility of the OSM roads layer
 * @param {boolean} show - Whether to show the layer
 */
function toggleOsmLayer(show) {
    if (typeof campusMap === 'undefined' || !campusMap || typeof existingRoadsLayer === 'undefined' || !existingRoadsLayer) return;
    if (show) {
        if (!campusMap.hasLayer(existingRoadsLayer)) {
            campusMap.addLayer(existingRoadsLayer);
        }
    } else {
        if (campusMap.hasLayer(existingRoadsLayer)) {
            campusMap.removeLayer(existingRoadsLayer);
        }
    }
}
window.clearPersistedRuntimePaths = clearPersistedRuntimePaths;
