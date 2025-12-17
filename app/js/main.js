/**
 * main.js - Main application logic for ETTIway
 * Handles initialization, data loading, and UI interactions
 */

// Configuration constants
const CAMPUS_DATA_FILE = 'data/campus.sample.json';

/**
 * Load campus data from JSON file
 * @returns {Promise<Object>} Promise resolving to object with campus info and buildings array
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
        return { campus: null, buildings: [] };
    }
}

/**
 * Populate the building list in the sidebar
 * @param {Array} buildings - Array of building objects
 */
function populateBuildingList(buildings) {
    const listContainer = document.getElementById('room-list-container');
    
    if (!buildings || buildings.length === 0) {
        listContainer.innerHTML = '<p class="info-text">No buildings available</p>';
        return;
    }
    
    // Clear existing content
    listContainer.innerHTML = '';
    
    // Create list items for each building
    buildings.forEach(building => {
        const item = document.createElement('div');
        item.className = 'room-item'; // Keeping class name for style compatibility
        
        // Use escaped HTML to prevent XSS
        item.innerHTML = `
            <div class="room-item-name">${escapeHtml(building.name)}</div>
            <div class="room-item-building">${escapeHtml(building.description)}</div>
        `;
        
        // Add click handler to focus on building
        item.addEventListener('click', () => {
            focusOnBuilding(building);
            displayBuildingDetails(building);
        });
        
        listContainer.appendChild(item);
    });
    
    console.log(`Populated list with ${buildings.length} buildings`);
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
        initializeMap();
    }
    
    // Draw campus boundary if available
    if (data.campus && data.campus.boundary) {
        drawCampusBoundary(data.campus.boundary);
    }
    
    // Load buildings onto the map
    if (data.buildings) {
        loadBuildingPolygons(data.buildings);
        populateBuildingList(data.buildings);
    }

    // Draw entrances (gates, parking access) if present in the data
    if (data.entrances) {
        try {
            drawEntrances(data.entrances);
        } catch (e) {
            console.warn('Error drawing entrances:', e);
        }
    }
    
    // Initialize UI components
    initializeSearch();

    // Create draw controls in the sidebar
    createDrawControls();
}

/**
 * createDrawControls - add drawing buttons to the sidebar and wire them
 */
function createDrawControls() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Create container
    const container = document.createElement('div');
    container.id = 'draw-controls';
    container.className = 'draw-controls';

    container.innerHTML = `
        <h3 style="padding:12px 20px; color:#bdc3c7;">Path Drawing</h3>
        <div class="draw-buttons" style="padding:0 20px 20px 20px; display:flex; gap:8px; flex-wrap:wrap;">
            <button id="btn-start" class="draw-btn">Start drawing</button>
            <button id="btn-stop" class="draw-btn">Stop drawing</button>
            <button id="btn-undo" class="draw-btn">Undo</button>
            <button id="btn-clear" class="draw-btn">Clear</button>
            <button id="btn-export" class="draw-btn">Finish & Export</button>
        </div>
    `;

    // Insert near top but after search container
    const search = document.querySelector('.search-container');
    if (search && search.parentNode) {
        search.parentNode.insertBefore(container, search.nextSibling);
    } else {
        sidebar.insertBefore(container, sidebar.firstChild);
    }

    // Wire up buttons
    document.getElementById('btn-start').addEventListener('click', () => {
        if (window.enableDrawMode) window.enableDrawMode();
    });
    document.getElementById('btn-stop').addEventListener('click', () => {
        if (window.disableDrawMode) window.disableDrawMode();
    });
    document.getElementById('btn-undo').addEventListener('click', () => {
        if (window.undoLastPoint) window.undoLastPoint();
    });
    document.getElementById('btn-clear').addEventListener('click', () => {
        if (window.clearCurrentPath) window.clearCurrentPath();
    });
    document.getElementById('btn-export').addEventListener('click', () => {
        if (window.exportCurrentPath) window.exportCurrentPath();
    });
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
