/**
 * main.js - Main application logic for ETTIway
 * Handles initialization, data loading, and UI interactions
 */

// Configuration constants
const CAMPUS_DATA_FILE = 'data/campus.sample.json';

const API_GRAPH_LOAD = '/api/graph/load';

// Variabilă globală pentru modul de test
window.isTestMode = false;
window.currentStartPoint = null;
window.currentDestinationPoint = null;
window.calculateRouteTest = calculateRouteTest; // Exportăm pentru a fi apelat din map.js

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

// Legătura între o clădire din UI și nodul aferent din graf
const buildingMap = {
    'corp a': 'intrare CORP A',
    'corp b': 'intrare CORP B',
    'cantina': 'intrare Cantina',
    'camin leu a': 'Intrare Camin LEU A'
};

// UI Dialog functions to replace native alert/confirm/prompt
function showAppConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', zIndex: '10000', fontFamily: 'Arial, sans-serif'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            backgroundColor: 'white', padding: '20px', borderRadius: '8px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)', width: '90%', maxWidth: '350px', textAlign: 'center'
        });

        const text = document.createElement('p');
        text.innerText = message;
        text.style.color = '#333';
        text.style.marginBottom = '20px';
        text.style.lineHeight = '1.4';
        
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'space-around';

        const btnNo = document.createElement('button');
        btnNo.innerText = 'Anulează';
        Object.assign(btnNo.style, { padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#e74c3c', color: 'white', cursor: 'pointer', fontWeight: 'bold' });
        btnNo.onclick = () => { overlay.remove(); resolve(false); };

        const btnYes = document.createElement('button');
        btnYes.innerText = 'Confirmă';
        Object.assign(btnYes.style, { padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#2ecc71', color: 'white', cursor: 'pointer', fontWeight: 'bold' });
        btnYes.onclick = () => { overlay.remove(); resolve(true); };

        btnContainer.appendChild(btnNo);
        btnContainer.appendChild(btnYes);
        box.appendChild(text);
        box.appendChild(btnContainer);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    });
}

function showAppPrompt(message, choices) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', zIndex: '10000', fontFamily: 'Arial, sans-serif'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            backgroundColor: 'white', padding: '20px', borderRadius: '8px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)', width: '90%', maxWidth: '350px', textAlign: 'center'
        });

        const text = document.createElement('p');
        text.innerText = message;
        text.style.color = '#333';
        
        const select = document.createElement('select');
        Object.assign(select.style, { width: '100%', padding: '10px', marginTop: '10px', marginBottom: '20px', borderRadius: '4px' });
        choices.forEach((c, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.innerText = c.name;
            select.appendChild(opt);
        });

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'space-around';

        const btnNo = document.createElement('button');
        btnNo.innerText = 'Anulează';
        Object.assign(btnNo.style, { padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#e74c3c', color: 'white', cursor: 'pointer', fontWeight: 'bold' });
        btnNo.onclick = () => { overlay.remove(); resolve(null); };

        const btnYes = document.createElement('button');
        btnYes.innerText = 'Alege';
        Object.assign(btnYes.style, { padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#3498db', color: 'white', cursor: 'pointer', fontWeight: 'bold' });
        btnYes.onclick = () => { overlay.remove(); resolve(parseInt(select.value)); };

        btnContainer.appendChild(btnNo);
        btnContainer.appendChild(btnYes);
        box.appendChild(text);
        box.appendChild(select);
        box.appendChild(btnContainer);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    });
}

function showAppAlert(message) {
    return new Promise((resolve) => {
        if (typeof showToast === 'function') {
            showToast(message, 'info');
            resolve();
            return;
        }

        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', zIndex: '10000', fontFamily: 'Arial, sans-serif'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            backgroundColor: 'white', padding: '20px', borderRadius: '8px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)', width: '90%', maxWidth: '350px', textAlign: 'center'
        });

        const text = document.createElement('p');
        text.innerText = message;
        text.style.color = '#333';
        text.style.marginBottom = '20px';
        
        const btnYes = document.createElement('button');
        btnYes.innerText = 'OK';
        Object.assign(btnYes.style, { padding: '10px 20px', border: 'none', borderRadius: '4px', backgroundColor: '#3498db', color: 'white', cursor: 'pointer', fontWeight: 'bold' });
        btnYes.onclick = () => { overlay.remove(); resolve(); };

        box.appendChild(text);
        box.appendChild(btnYes);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    });
}

/**
 * Initialize search functionality (integrată cu rutarea)
 */
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    
    // Suport și pentru enter press pentru mai multă fluență, sau change (când apasă enter / pierde focus)
    searchInput.addEventListener('change', async (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        console.log('User searched for:', searchTerm);
        
        if (!searchTerm) return;
        
        let targetPoint = null;
        let finalBuildingName = searchTerm; // Fallback nume pentru afișaj
        
        // Căutăm direct în datele statice ale campusului punctele definite drept intrări
        let matchingEntrances = [];
        if (window.campusData && window.campusData.entrances) {
            for (let ent of window.campusData.entrances) {
                const nodeName = (ent.name || ent.id || '').toLowerCase();
                if (nodeName.startsWith('intrare') && nodeName.includes(searchTerm)) {
                    matchingEntrances.push({
                        name: ent.name || ent.id,
                        pt: L.latLng(ent.coordinates[0], ent.coordinates[1])
                    });
                }
            }
        }
        
        if (matchingEntrances.length === 0 && buildingMap[searchTerm] && window.campusData && window.campusData.entrances) {
             let mappedName = buildingMap[searchTerm].toLowerCase();
             for (let ent of window.campusData.entrances) {
                const nodeName = (ent.name || ent.id || '').toLowerCase();
                if (nodeName === mappedName) {
                    matchingEntrances.push({
                        name: ent.name || ent.id,
                        pt: L.latLng(ent.coordinates[0], ent.coordinates[1])
                    });
                }
             }
        }

        if (matchingEntrances.length === 1) {
            let userConfirmed = await showAppConfirm(`Vrei să navighezi către: ${matchingEntrances[0].name}?`);
            if (userConfirmed) {
                targetPoint = matchingEntrances[0].pt;
                finalBuildingName = matchingEntrances[0].name;
            } else {
                e.target.value = '';
                return; // User has cancelled
            }
        } else if (matchingEntrances.length > 1) {
            let choiceIdx = await showAppPrompt(`S-au găsit mai multe intrări pentru clădirea aleasă. Alege una dintre ele:`, matchingEntrances);
            if (choiceIdx !== null && choiceIdx >= 0 && choiceIdx < matchingEntrances.length) {
                let sel = matchingEntrances[choiceIdx];
                let userConfirmed = await showAppConfirm(`Vrei să navighezi către: ${sel.name}?`);
                if (userConfirmed) {
                    targetPoint = sel.pt;
                    finalBuildingName = sel.name;
                } else {
                    e.target.value = '';
                    return;
                }
            } else {
                e.target.value = '';
                return; // User has cancelled / invalid
            }
        }
        
        // 2. Geografic Fallback dacă nu avem mapare explicită, calculăm centroidul din campusData
        if (!targetPoint && window.campusData && window.campusData.buildings) {
            const b = window.campusData.buildings.find(b => b.name.toLowerCase() === searchTerm);
            if (b && b.points && window.navigationData && window.navigationData.features) {
                finalBuildingName = b.name;
                const centroid = L.latLngBounds(b.points).getCenter();
                let minDist = Infinity;
                
                // Căutăm cel mai apropiat nod Point la acest centroid
                for (let f of window.navigationData.features) {
                    if (f.geometry.type === 'Point') {
                        const pt = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
                        const d = centroid.distanceTo(pt);
                        if (d < minDist) {
                            minDist = d;
                            targetPoint = pt;
                        }
                    }
                }
                if (targetPoint) {
                    console.log(`Fallback folosit: a fost selectat nodul cel mai apropiat de centrul clădirii (Dist: ${Math.round(minDist)}m)`);
                    let userConfirmed = await showAppConfirm(`S-a dedus o intrare aproximativă pentru: ${b.name}. Confirmare navigare?`);
                    if (!userConfirmed) {
                        e.target.value = '';
                        return;
                    }
                }
            }
        }
        
        // 3. Confirmare și Navigare dacă am găsit ceva
        if (targetPoint) {
            window.currentDestinationPoint = targetPoint;
            
            // Start point = locația exactă din GPS (userMarker)
            if (typeof userMarker !== 'undefined' && userMarker && userMarker.getLatLng) {
                window.currentStartPoint = userMarker.getLatLng();
                if (typeof campusMap !== 'undefined' && campusMap && typeof window.calculateRouteTest === 'function') {
                    window.calculateRouteTest(campusMap, L.featureGroup(), window.currentStartPoint, window.currentDestinationPoint);
                }
            } else {
                await showAppAlert(`Conectare GPS în așteptare... Destinația (${finalBuildingName}) e setată. Când poziția v-a fi activată, ruta se va calcula. Puteți folosi și "Find Me".`);
            }
        } else {
            await showAppAlert(`Clădirea '${searchTerm}' nu a putut fi localizată nici după nume explicit, nici cu fallback vizual.`);
        }
        
        // Deschidem și focusăm clădirea fizic dacă vrem să o vedem
        const bUI = window.campusData?.buildings?.find(b => b.name.toLowerCase() === searchTerm);
        if (bUI && typeof focusOnBuilding === 'function') {
            focusOnBuilding(bUI);
        }
        
        // Eliberăm input-ul și închidem lista de mobil (dacă e cazul)
        e.target.value = '';
        if (window.innerWidth <= 768) {
            document.body.classList.remove('sidebar-open');
        }
    });
    
    console.log('Search input initialized successfully (Map & Routing integrated).');
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
        if (!window.currentStartPoint || (window.currentStartPoint && window.currentDestinationPoint)) {
            // Reset state ptr că aveam ambele puncte înainte
            window.currentStartPoint = e.latlng;
            window.currentDestinationPoint = null;
            
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
                // Dacă cumva customUserIcon din map.js este prezent, îl folosim
                const iconConf = typeof customUserIcon !== 'undefined' ? { icon: customUserIcon } : {};
                userMarker = L.marker(e.latlng, iconConf).addTo(map);
                userMarker.bindPopup("Poziție simulată (Start)").openPopup();
            }

            alert("Punct de plecare setat. Acum apasă pe un nod din graf (sau oriunde pe hartă) pentru destinație.");
            
        } else {
            // Avem start, dar nu avem destinație -> Click-ul va seta destinația!
            window.currentDestinationPoint = e.latlng;
            console.log("Destination Point set via Test Mode:", e.latlng);
            
            // Calculăm ruta direct.
            window.calculateRouteTest(map, graphGroup, window.currentStartPoint, window.currentDestinationPoint);
        }
    });

    // Pentru Markerii existenți (din layer), oprim eventul să nu duca către hartă dublu.
    function setupMarkerClick(layer) {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
            layer.on('click', function(e) {
                if (!window.isTestMode || watchId !== 'test_mode') return;
                
                L.DomEvent.stop(e); // Blochează emiterea de propagare catre harta

                if (!window.currentStartPoint || (window.currentStartPoint && window.currentDestinationPoint)) {
                    // La fel, funcționează ca prim click = start, daca vrei din interiorul nodului.
                    window.currentStartPoint = e.latlng;
                    window.currentDestinationPoint = null;
                    
                    if (typeof routeLayer !== 'undefined' && routeLayer) routeLayer.clearLayers();
                    
                    if (typeof userMarker !== 'undefined' && userMarker) {
                        userMarker.setLatLng(e.latlng);
                        userMarker.bindPopup("Start (Pe Nod existant)").openPopup();
                    } else {
                        const iconConf2 = typeof customUserIcon !== 'undefined' ? { icon: customUserIcon } : {};
                        userMarker = L.marker(e.latlng, iconConf2).addTo(map);
                        userMarker.bindPopup("Start (Pe Nod existant)").openPopup();
                    }
                    console.log("Ai setat startul via marker manual pe un nod. (Test Mode)");
                } else {
                    window.currentDestinationPoint = e.latlng;
                    window.calculateRouteTest(map, graphGroup, window.currentStartPoint, window.currentDestinationPoint);
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
        console.warn('Nu există nicio rută disponibilă între start și destinația aleasă. Probabil nu există conectivitate între cele 2 noduri.');
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
    
    // Nu folosim alert pe live-routing ca să nu blocăm ecranul (mai ales de la GPS).
    // Eventual putem updata un element vizual de tipul <div id="route-info"> pe viitor.
    if (window.isTestMode && typeof routeLayer !== 'undefined' && routeLayer.getLayers().length === 1) {
        // Opțional o alertă doar pentru Test Mode izolat (la primul click)
        // alert(`Drumul cel mai scurt: ~${approxDistMeters}m`);
    }
}
