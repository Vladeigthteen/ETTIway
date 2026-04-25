/**
 * main.js - Main application logic for ETTIway
 * Handles initialization, data loading, and UI interactions
 */

// Configuration constants
const CAMPUS_DATA_FILE = 'data/campus.sample.json';

const API_GRAPH_LOAD = '/api/graph/load';

/**
 * Load campus data from JSON file (Static background: buildings, boundaries)
 * @returns {Promise<Object>} Promise resolving to object with campus info and buildings array
 */
async function loadCampusData() {
    try {
        const response = await fetch(CAMPUS_DATA_FILE);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Campus data loaded successfully from local file', data);
        return data;
    } catch (error) {
        console.error('Error loading campus data:', error);
        // Return empty object on error
        return { campus: null, buildings: [] };
    }
}

/**
 * Load dynamic navigation graph from database
 */
async function loadNavigationGraph(drawnItems) {
    try {
        const dbResponse = await fetch(API_GRAPH_LOAD);
        if (dbResponse.ok) {
            const dbData = await dbResponse.text();
            
            // Verificăm dacă e un JSON gol {}
            if (dbData && dbData.trim() !== '{}' && dbData.trim() !== '') {
                const parsedData = JSON.parse(dbData);
                
                // Asigurare extra contra DB-ului returnând un template gol `{"type": "FeatureCollection", "features": []}`
                if (parsedData && parsedData.features && parsedData.features.length > 0) {
                    L.geoJSON(parsedData, {
                        onEachFeature: (feature, layer) => {
                            if (drawnItems && drawnItems.addLayer) {
                                drawnItems.addLayer(layer);
                            }
                        }
                    });
                    console.log('Graph data loaded successfully from Database', parsedData);
                } else {
                    console.log('Database returned graph structure with empty features.');
                }
            } else {
                console.log('Database returned empty graph, keeping dynamic layer clean.');
            }
        }
    } catch (dbError) {
        console.log('Could not load dynamic navigation graph from DB (possibly missing or network error)', dbError);
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

function initializeSidebarToggle(mapRef) {
    const body = document.body;
    const toggleBtn = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    let desktopCollapsed = false;

    if (!toggleBtn) {
        return;
    }

    function refreshMapSize() {
        if (!mapRef) return;
        setTimeout(() => {
            mapRef.invalidateSize();
        }, 280);
    }

    function syncToggleLabel() {
        if (mobileQuery.matches) {
            toggleBtn.textContent = body.classList.contains('sidebar-open') ? '✕' : '☰';
            return;
        }
        toggleBtn.textContent = desktopCollapsed ? '☰' : '✕';
    }

    function applyLayoutMode() {
        if (mobileQuery.matches) {
            body.classList.remove('sidebar-collapsed');
        } else {
            body.classList.remove('sidebar-open');
            body.classList.toggle('sidebar-collapsed', desktopCollapsed);
        }
        syncToggleLabel();
        refreshMapSize();
    }

    toggleBtn.addEventListener('click', () => {
        if (mobileQuery.matches) {
            body.classList.toggle('sidebar-open');
        } else {
            desktopCollapsed = !desktopCollapsed;
            body.classList.toggle('sidebar-collapsed', desktopCollapsed);
        }
        syncToggleLabel();
        refreshMapSize();
    });

    if (overlay) {
        overlay.addEventListener('click', () => {
            body.classList.remove('sidebar-open');
            syncToggleLabel();
            refreshMapSize();
        });
    }

    window.addEventListener('resize', applyLayoutMode);
    applyLayoutMode();
}

/**
 * Main initialization function
 * Called when the DOM is fully loaded
 */
async function initialize() {
    console.log('Initializing ETTIway application...');
    
    // Load campus data first
    const data = await loadCampusData();
    window.campusData = data; // Expose globally for other modules (e.g., indoor.js)
    
    // Initialize the map with campus center coordinates if available
    let mapInstance;
    if (data.campus && data.campus.location) {
        mapInstance = initializeMap(
            data.campus.location.latitude,
            data.campus.location.longitude
        );
    } else {
        mapInstance = initializeMap();
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

    // Load the dynamic navigation graph into mapInstance's drawnGroup
    if (mapInstance && mapInstance.drawnGroup) {
        await loadNavigationGraph(mapInstance.drawnGroup);
    }

    // Initialize UI components
    initializeSearch();
    initializeSidebarToggle(mapInstance.map);
}

function createDrawControls() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Create container
    const container = document.createElement('div');
    container.className = 'draw-controls';
    
    // ...existing code...
}

// OSM controls removed per request

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
