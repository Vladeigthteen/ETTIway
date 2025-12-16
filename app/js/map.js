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
 */
function initializeMap() {
    // Create map centered on a default university location
    // Coordinates: roughly centered on a typical European university campus
    campusMap = L.map('map').setView([45.7489, 21.2087], 16);
    
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
    
    // Create popup content with room details (escaped to prevent XSS)
    const popupContent = `
        <div class="popup-content">
            <div class="popup-title">${escapeHtml(room.name)}</div>
            <div class="popup-info">
                <span class="popup-label">Building:</span> ${escapeHtml(room.building)}
            </div>
            <div class="popup-info">
                <span class="popup-label">Floor:</span> ${escapeHtml(room.floor)}
            </div>
            <div class="popup-info">
                <span class="popup-label">Capacity:</span> ${escapeHtml(String(room.capacity))} people
            </div>
            <div class="popup-info">
                <span class="popup-label">Type:</span> ${escapeHtml(room.type)}
            </div>
        </div>
    `;
    
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
    
    // Create HTML for room details (escaped to prevent XSS)
    const detailsHTML = `
        <h3>Room Details</h3>
        <div class="room-info">
            <span class="room-info-label">Name:</span>
            <span class="room-info-value">${escapeHtml(room.name)}</span>
        </div>
        <div class="room-info">
            <span class="room-info-label">Building:</span>
            <span class="room-info-value">${escapeHtml(room.building)}</span>
        </div>
        <div class="room-info">
            <span class="room-info-label">Floor:</span>
            <span class="room-info-value">${escapeHtml(room.floor)}</span>
        </div>
        <div class="room-info">
            <span class="room-info-label">Capacity:</span>
            <span class="room-info-value">${escapeHtml(String(room.capacity))} people</span>
        </div>
        <div class="room-info">
            <span class="room-info-label">Type:</span>
            <span class="room-info-value">${escapeHtml(room.type)}</span>
        </div>
        <div class="room-info">
            <span class="room-info-label">Description:</span>
            <span class="room-info-value">${escapeHtml(room.description)}</span>
        </div>
    `;
    
    roomDetailsDiv.innerHTML = detailsHTML;
}
