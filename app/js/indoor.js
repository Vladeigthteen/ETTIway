/**
 * indoor.js - Handles indoor map modal for Corp B with GeoJSON layers
 */

const INDOOR_CONFIG = {
    // Maps building ID 'buildingB' (from dataset) to Corp B configuration
    "buildingB": {
        title: "Corp B - Indoor Map",
        floors: [
            {
                id: "parter",
                name: "Parter",
                // Existing files
                path: "indoor/CorpB/Parter dreapta/",
                layers: {
                    rooms: "Rooms.geojson",
                    corridors: "holuri.geojson",
                    doors: "doors.geojson",
                    stairs: "Stairs.geojson"
                }
            },
            {
                id: "etaj1",
                name: "Etaj 1",
                // Placeholder path - files do not exist yet
                path: "indoor/CorpB/Etaj1/",
                layers: {
                    rooms: "Rooms.geojson",
                    corridors: "holuri.geojson",
                    doors: "doors.geojson",
                    stairs: "Stairs.geojson"
                }
            },
            {
                id: "etaj2",
                name: "Etaj 2",
                // Placeholder path - files do not exist yet
                path: "indoor/CorpB/Etaj2/",
                layers: {
                    rooms: "Rooms.geojson",
                    corridors: "holuri.geojson",
                    doors: "doors.geojson",
                    stairs: "Stairs.geojson"
                }
            },
            {
                id: "etaj3",
                name: "Etaj 3",
                // Placeholder path - files do not exist yet
                path: "indoor/CorpB/Etaj3/",
                layers: {
                    rooms: "Rooms.geojson",
                    corridors: "holuri.geojson",
                    doors: "doors.geojson",
                    stairs: "Stairs.geojson"
                }
            }
        ]
    }
};

let indoorMap = null;
let currentIndoorLayers = [];

/**
 * Open the indoor modal for a specific building
 * @param {string} buildingId - ID of the building (e.g. "buildingB")
 */
function openIndoor(buildingId) {
    const config = INDOOR_CONFIG[buildingId];
    if (!config) {
        console.warn("No indoor config for " + buildingId);
        return;
    }

    // Show Modal
    const modal = document.getElementById('indoor-modal');
    const modalTitle = document.getElementById('indoor-title');
    
    if (modal) {
        modal.style.display = 'block';
        setTimeout(() => { modal.classList.add('open'); }, 10);
    }
    
    if (modalTitle) modalTitle.textContent = config.title;

    // Initialize Indoor Map
    if (!indoorMap) {
        indoorMap = L.map('indoor-map', {
            crs: L.CRS.Simple,
            minZoom: -5,
            maxZoom: 5,
            zoomControl: true
        });
    }

    // Generate Floor Buttons
    const controls = document.getElementById('indoor-controls');
    if (controls) {
        controls.innerHTML = ''; // Clear existing
        config.floors.forEach(floor => {
            const btn = document.createElement('button');
            btn.className = 'floor-btn';
            btn.textContent = floor.name;
            btn.onclick = () => loadFloor(floor);
            controls.appendChild(btn);
        });
    }

    // Load Default Floor (Parter or first available)
    const defaultFloor = config.floors.find(f => f.id === "parter") || config.floors[0];
    if (defaultFloor) {
        loadFloor(defaultFloor);
    }
    
    // Resize map during transition
    setTimeout(() => {
        if (indoorMap) indoorMap.invalidateSize();
    }, 200);
}

/**
 * Close the indoor modal
 */
function closeIndoor() {
    const modal = document.getElementById('indoor-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
}

/**
 * Load a specific floor into the indoor map
 * @param {Object} floorConfig - Floor object from configuration
 */
async function loadFloor(floorConfig) {
    if (!indoorMap) return;

    // Update UI buttons
    const btns = document.querySelectorAll('.floor-btn');
    btns.forEach(b => {
        if (b.textContent === floorConfig.name) b.classList.add('active');
        else b.classList.remove('active');
    });

    // Clear existing layers
    currentIndoorLayers.forEach(layer => indoorMap.removeLayer(layer));
    currentIndoorLayers = [];

    const path = floorConfig.path;
    const files = floorConfig.layers;

    // Helper to fetch and add layer
    const loadLayer = async (filename, styleOptions, pointHandler) => {
        if (!filename) return null;
        try {
            const resp = await fetch(path + filename);
            if (!resp.ok) {
                // If it's 404, it just means the file isn't created yet (expected for Etaj 1-3)
                if (resp.status === 404) {
                    console.log(`Layer ${filename} not found for ${floorConfig.name} (not implemented yet).`);
                } else {
                    console.warn(`HTTP error ${resp.status} for ${filename}`);
                }
                return null;
            }
            const data = await resp.json();

            const geoLayer = L.geoJSON(data, {
                style: styleOptions,
                pointToLayer: pointHandler,
                onEachFeature: (feature, layer) => {
                    const name = feature.properties.name || feature.properties.id;
                    if (name) {
                        layer.bindTooltip(String(name), {
                            permanent: false,
                            direction: 'center',
                            className: 'indoor-label'
                        });
                    }
                }
            }).addTo(indoorMap);
            
            currentIndoorLayers.push(geoLayer);
            return geoLayer;
        } catch (err) {
            console.warn(`Failed to parse/load ${filename}:`, err);
            return null;
        }
    };

    // --- Styling ---
    const roomStyle = { fillColor: "#f5f5f5",
        fillOpacity: 1,
        color: "#000",
        weight: 2
        };
    const corridorStyle = { color: '#444', weight: 5, opacity: 0.8 };
    const doorMarker = (feature, latlng) => L.circleMarker(latlng, { radius: 3, fillColor: '#000', color: '#fff', weight: 1, fillOpacity: 1 });
    const stairMarker = (feature, latlng) => L.circleMarker(latlng, { radius: 8, fillColor: '#ff4500', color: '#fff', weight: 2, fillOpacity: 1 }).bindTooltip("Stairs", { offset: [0, -5] });

    // --- Load Layers ---
    // If files don't exist yet, these will just return null and nothing breaks
    const roomsLayer = await loadLayer(files.rooms, () => roomStyle, null);
    await loadLayer(files.corridors, () => corridorStyle, null);
    await loadLayer(files.doors, null, doorMarker);
    await loadLayer(files.stairs, null, stairMarker);

    // Fit bounds or show message if empty
    if (roomsLayer) {
        indoorMap.fitBounds(roomsLayer.getBounds(), { padding: [20, 20] });
    } else {
        console.log(`Floor ${floorConfig.name} seems empty or failed to load rooms.`);
    }
}

// Global expose
window.openIndoor = openIndoor;
window.closeIndoor = closeIndoor; 

