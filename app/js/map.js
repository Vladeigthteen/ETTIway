/**
 * map.js - Interactive map functionality for ETTIway
 * Handles map initialization, marker creation, and user interactions
 */

// Global map and markers storage
let campusMap;
let markersLayer;
let roomsData = [];

/**
 * Initialize the interactive map using Leaflet
 * Sets up the base map with OpenStreetMap tiles
 * @param {number} lat - Latitude for map center (optional, defaults to ETTI Campus)
 * @param {number} lon - Longitude for map center (optional, defaults to ETTI Campus)
 * @param {number} zoom - Initial zoom level (optional, defaults to 16)
 */
function initializeMap(lat = DEFAULT_CAMPUS_LAT, lon = DEFAULT_CAMPUS_LON, zoom = DEFAULT_ZOOM_LEVEL) {
    // Create map centered on specified coordinates
    campusMap = L.map('map').setView([lat, lon], zoom);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 14
    }).addTo(campusMap);
    
    // Create a layer group for markers (allows easy management)
    markersLayer = L.layerGroup().addTo(campusMap);
    
    console.log('Map initialized successfully');
}

/**
 * Create a marker for a room
 * @param {Object} room - Room data object
 * @returns {L.Marker|null} Leaflet marker object or null if invalid coordinates
 */
function createRoomMarker(room) {
    // Validate coordinates before creating marker
    if (!isValidCoordinate(room.latitude, room.longitude)) {
        console.warn(`Invalid coordinates for room ${room.id}: ${room.latitude}, ${room.longitude}`);
        return null;
    }
    
    // Create marker with room information in options for easy identification
    const marker = L.marker([room.latitude, room.longitude], {
        title: room.name,
        alt: room.name,
        roomId: room.id // Store room ID for reliable identification
    });
    
    // Create popup content with room details using shared template
    const popupContent = createRoomDetailsHtml(room, true);
    
    // Bind popup to marker
    marker.bindPopup(popupContent);
    
    // Add click event to update sidebar
    marker.on('click', function() {
        displayRoomDetails(room);
    });
    
    return marker;
}

/**
 * Load room markers onto the map
 * @param {Array} rooms - Array of room objects
 */
function loadRoomMarkers(rooms) {
    // Clear existing markers
    markersLayer.clearLayers();
    
    // Store rooms data globally
    roomsData = rooms;
    
    // Create and add markers for each room
    let validMarkers = 0;
    rooms.forEach(room => {
        const marker = createRoomMarker(room);
        if (marker) {
            markersLayer.addLayer(marker);
            validMarkers++;
        }
    });
    
    console.log(`Loaded ${validMarkers} room markers out of ${rooms.length} rooms`);
}

/**
 * Focus map on a specific room
 * @param {Object} room - Room data object
 */
function focusOnRoom(room) {
    // Validate coordinates before focusing
    if (!isValidCoordinate(room.latitude, room.longitude)) {
        console.warn(`Cannot focus on room ${room.id}: invalid coordinates`);
        return;
    }
    
    // Pan to room location
    campusMap.setView([room.latitude, room.longitude], 18);
    
    // Find and open the marker popup using room ID for reliable matching
    markersLayer.eachLayer(layer => {
        if (layer.options.roomId === room.id) {
            layer.openPopup();
        }
    });
}

/**
 * Display room details in the sidebar
 * @param {Object} room - Room data object
 */
function displayRoomDetails(room) {
    const roomDetailsDiv = document.getElementById('room-details');
    
    // Create HTML for room details using shared template
    const detailsHTML = `
        <h3>Room Details</h3>
        <div class="room-info">
            <span class="room-info-label">Name:</span>
            <span class="room-info-value">${escapeHtml(room.name)}</span>
        </div>
        ${createRoomDetailsHtml(room, false)}
    `;
    
    roomDetailsDiv.innerHTML = detailsHTML;
}
