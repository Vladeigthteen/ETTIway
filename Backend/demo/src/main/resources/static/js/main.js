/**
 * main.js - Main application logic for ETTIway
 * Handles initialization, data loading, and UI interactions
 */

// Configuration constants
const CAMPUS_DATA_FILE = 'data/campus.sample.json';

const API_GRAPH_LOAD = '/api/graph/load';

// Variabilă globală pentru modul de test
window.isTestMode = false;
let currentStartPoint = null;
let currentDestinationPoint = null;

// Funcție pentru a activa/dezactiva global Test Mode (din HTML)
window.toggleTestModeGlobal = function() {
    window.isTestMode = !window.isTestMode;
    const btn = document.getElementById('test-mode-btn');
    if (btn) {
        if (window.isTestMode) {
            btn.innerText = 'Dev: Test Mode ON';
            btn.style.backgroundColor = '#27ae60';
            alert('Mod Test activat. Click pe butonul "Find Me" pentru a începe simularea.');
        } else {
            btn.innerText = 'Dev: Test Mode OFF';
            btn.style.backgroundColor = '#e67e22';
            // Oprește simularea dacă rula
            if (typeof watchId !== 'undefined' && watchId === 'test_mode') {
                toggleLocation();
            }
        }
    }
};

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
    const isEditMode = new URLSearchParams(window.location.search).get('edit') === '1';

    try {
        const dbResponse = await fetch('/api/graph/load');
        if (dbResponse.ok) {
            const dbData = await dbResponse.text();
            
            // Verificăm dacă e un JSON gol {}
            if (dbData && dbData.trim() !== '{}' && dbData.trim() !== '') {
                const parsedData = JSON.parse(dbData);
                
                // Salvăm intern
                window.navigationData = parsedData;

                // Asigurare extra contra DB-ului returnând un template gol `{"type": "FeatureCollection", "features": []}`
                if (parsedData && parsedData.features && parsedData.features.length > 0) {
                    
                    // Adăugăm vizual DOAR dacă suntem în Edit Mode
                    if (isEditMode) {
                        L.geoJSON(parsedData, {
                            onEachFeature: (feature, layer) => {
                                if (drawnItems && drawnItems.addLayer) {
                                    drawnItems.addLayer(layer);
                                }
                            }
                        });
                        console.log('Graph data loaded successfully and DRAWN on map (Edit Mode)', parsedData);
                    } else {
                        console.log('Graph data loaded successfully in MEMORY (User Mode)', parsedData);
                    }
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
        
        // Mapăm click-urile pe hartă ptr test, indiferent de starea intială - se va bloca la rulare dacă e off
        setupTestModeRouting(mapInstance.map, mapInstance.drawnGroup);
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

/**
 * Configure Test Mode click events
 */
function setupTestModeRouting(map, graphGroup) {
    if (!map || !graphGroup) return;

    // La click pe hartă, setăm start-ul SAU destinația în funcție de ce ne lipsește.
    map.on('click', function(e) {
        if (!window.isTestMode || typeof watchId === 'undefined' || watchId !== 'test_mode') return;

        // Dacă nu avem punct de start (sau tocmai vrem să reluăm testul) setăm Start
        if (!currentStartPoint || (currentStartPoint && currentDestinationPoint)) {
            // Reset state ptr că aveam ambele puncte înainte
            currentStartPoint = e.latlng;
            currentDestinationPoint = null;
            
            if (typeof routeLayer !== 'undefined' && routeLayer) {
                routeLayer.clearLayers();
            }

            console.log("Start Point set via Test Mode:", e.latlng);

            // Mutăm marker-ul de start vizibil 
            if (typeof userMarker !== 'undefined' && userMarker) {
                userMarker.setLatLng(e.latlng);
                if (userMarker.isPopupOpen()) userMarker.closePopup();
                userMarker.bindPopup("Poziție simulată (Start)").openPopup();
            } else {
                userMarker = L.marker(e.latlng).addTo(map);
                userMarker.bindPopup("Poziție simulată (Start)").openPopup();
            }

            alert("Punct de plecare setat. Acum apasă pe un nod din graf (sau oriunde pe hartă) pentru destinație.");
            
        } else {
            // Avem start, dar nu avem destinație -> Click-ul va seta destinația!
            currentDestinationPoint = e.latlng;
            console.log("Destination Point set via Test Mode:", e.latlng);
            
            // Calculăm ruta direct.
            calculateRouteTest(map, graphGroup, currentStartPoint, currentDestinationPoint);
        }
    });

    // Pentru Markerii existenți (din layer), oprim eventul să nu duca către hartă dublu.
    function setupMarkerClick(layer) {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
            layer.on('click', function(e) {
                if (!window.isTestMode || watchId !== 'test_mode') return;
                
                L.DomEvent.stop(e); // Blochează emiterea de propagare catre harta

                if (!currentStartPoint || (currentStartPoint && currentDestinationPoint)) {
                    // La fel, funcționează ca prim click = start, daca vrei din interiorul nodului.
                    currentStartPoint = e.latlng;
                    currentDestinationPoint = null;
                    
                    if (typeof routeLayer !== 'undefined' && routeLayer) routeLayer.clearLayers();
                    
                    if (typeof userMarker !== 'undefined' && userMarker) {
                        userMarker.setLatLng(e.latlng);
                        userMarker.bindPopup("Start (Pe Nod existant)").openPopup();
                    } else {
                        userMarker = L.marker(e.latlng).addTo(map);
                        userMarker.bindPopup("Start (Pe Nod existant)").openPopup();
                    }
                    alert("Ai început traseul direct de pe un nod existent. Selectează alt nod / punct ca destinație.");
                } else {
                    currentDestinationPoint = e.latlng;
                    calculateRouteTest(map, graphGroup, currentStartPoint, currentDestinationPoint);
                }
            });
        }
    }

    // Atașăm pe layerul existent
    graphGroup.eachLayer(setupMarkerClick);

    // Atașăm pentru orice element o fi adăugat mai târziu 
    graphGroup.on('layeradd', function(e) {
        setupMarkerClick(e.layer);
    });
}

/**
 * Call routing implementation pt test
 */
function calculateRouteTest(map, graphGroup, startLatLng, endLatLng) {
    console.log(`Calculam ruta (Dijkstra pe graf real) de la ${startLatLng} catre ${endLatLng}`);
    
    if (typeof routeLayer !== 'undefined' && !routeLayer) {
        routeLayer = L.layerGroup().addTo(map);
    } else if (routeLayer) {
        routeLayer.clearLayers();
    }

    // Luăm geoJSON din variabila globală (pre-încărcată) SAU reconstruim din grup dacă edităm direct
    let geoJSON = window.navigationData;
    if (!geoJSON || geoJSON.features.length === 0) {
        geoJSON = graphGroup.toGeoJSON();
    }
    
    // Extragem graful prin `routing.js` care mapează totul
    const { graph, nodesMap } = buildGraphFromGeoJSON(geoJSON);
    
    if (Object.keys(nodesMap).length === 0) {
        alert('Eroare: Graful este gol. Te rog să desenezi manual segmente (Linii / Puncte) și să-l salvezi/încarci.');
        return;
    }

    const startKey = findNearestNode(startLatLng, nodesMap);
    const endKey = findNearestNode(endLatLng, nodesMap);

    if (!startKey || !endKey) {
        alert('Nu s-au putut găsi noduri în interiorul grafului.');
        return;
    }

    // Logica completă dijkstra generatoare de polylines perfecte
    const pathCoords = runDijkstra(graph, nodesMap, startKey, endKey);

    if (!pathCoords || pathCoords.length === 0) {
        alert('Nu există nicio rută posibilă între acest nod și destinația aleasă. Graful e izolat (traseele nu se unesc)!');
        return;
    }

    const path = L.polyline(pathCoords, {
        color: '#FF3333',    // Roșu distinct și puternic (schimbat din albastru)
        weight: 8,           // Puțin mai gros pentru vizibilitate
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round'
    }).addTo(routeLayer);
    
    // Focus vizual
    map.fitBounds(path.getBounds(), { padding: [50, 50] });
    
    const approxDistMeters = Math.round(pathCoords.reduce((acc, curr, idx) => {
        if (idx === 0) return acc;
        return acc + pathCoords[idx - 1].distanceTo(curr);
    }, 0));
    
    console.log(`Rută prelucrată pe graf având distanța estimată de ${approxDistMeters}m`);
    alert(`Acesta este drumul cel mai scurt pe graf (Aprox. ${approxDistMeters}m). Succes!`);
}
