/**
 * main.js - Main application logic for ETTIway
 * Handles initialization, data loading, and UI interactions
 */

/**
 * Load campus room data from JSON file
 * @returns {Promise<Array>} Promise resolving to array of room objects
 */
async function loadCampusData() {
    try {
        const response = await fetch('data/campus.sample.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Campus data loaded successfully', data);
        return data.rooms;
    } catch (error) {
        console.error('Error loading campus data:', error);
        // Return empty array on error
        return [];
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
        
        roomItem.innerHTML = `
            <div class="room-item-name">${room.name}</div>
            <div class="room-item-building">${room.building} - Floor ${room.floor}</div>
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
    
    // Initialize the map
    initializeMap();
    
    // Load campus data
    const rooms = await loadCampusData();
    
    // Load markers on the map
    if (rooms.length > 0) {
        loadRoomMarkers(rooms);
        populateRoomList(rooms);
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
