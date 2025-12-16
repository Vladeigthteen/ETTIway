/**
 * main.js - Main application logic for ETTIway
 * Handles initialization, data loading, and UI interactions
 */

// Configuration constants
const CAMPUS_DATA_FILE = 'data/campus.sample.json';

/**
 * Load campus room data from JSON file
 * @returns {Promise<Object>} Promise resolving to object with campus info and rooms array
 */
async function loadCampusData() {
    try {
        const response = await fetch(CAMPUS_DATA_FILE);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Campus data loaded successfully', data);
        return data;
    } catch (error) {
        console.error('Error loading campus data:', error);
        // Return empty object on error
        return { campus: null, rooms: [] };
    }
}

/**
 * Populate the room list in the sidebar
 * @param {Array} rooms - Array of room objects
 */
function populateRoomList(rooms) {
    const roomListContainer = document.getElementById('room-list-container');
    
    if (rooms.length === 0) {
        roomListContainer.innerHTML = '<p class="info-text">No rooms available</p>';
        return;
    }
    
    // Clear existing content
    roomListContainer.innerHTML = '';
    
    // Create list items for each room
    rooms.forEach(room => {
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        
        // Use escaped HTML to prevent XSS
        roomItem.innerHTML = `
            <div class="room-item-name">${escapeHtml(room.name)}</div>
            <div class="room-item-building">${escapeHtml(room.building)} - Floor ${escapeHtml(room.floor)}</div>
        `;
        
        // Add click handler to focus on room
        roomItem.addEventListener('click', () => {
            focusOnRoom(room);
            displayRoomDetails(room);
        });
        
        roomListContainer.appendChild(roomItem);
    });
    
    console.log(`Populated room list with ${rooms.length} rooms`);
}

/**
 * Initialize search functionality (UI only, no actual filtering)
 * Placeholder for future search implementation
 */
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    
    // Add placeholder event listener for future functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        console.log('Search term:', searchTerm);
        // Note: Actual search functionality can be implemented here in the future
        // For now, this is UI only as per requirements
    });
    
    console.log('Search input initialized (UI only)');
}

/**
 * Main initialization function
 * Called when the DOM is fully loaded
 */
async function initialize() {
    console.log('Initializing ETTIway application...');
    
    // Load campus data first
    const data = await loadCampusData();
    
    // Initialize the map with campus center coordinates if available
    if (data.campus && data.campus.location) {
        initializeMap(
            data.campus.location.latitude,
            data.campus.location.longitude
        );
    } else {
        // Fallback to default coordinates
        initializeMap();
    }
    
    // Load markers on the map
    if (data.rooms && data.rooms.length > 0) {
        loadRoomMarkers(data.rooms);
        populateRoomList(data.rooms);
    } else {
        document.getElementById('room-list-container').innerHTML = 
            '<p class="info-text">Failed to load room data</p>';
    }
    
    // Initialize search (UI only)
    initializeSearch();
    
    console.log('ETTIway application initialized successfully');
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', initialize);
