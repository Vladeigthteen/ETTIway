/**
 * routing.js - Graph construction and Dijkstra algorithm for dynamic navigation graph.
 */

const COORD_PRECISION = 6;

// Funcție utilitară: returnează o cheie string unică pentru coordonate cu precizie ridicată
function getCoordKey(lat, lng) {
    return `${Number(lat).toFixed(COORD_PRECISION)},${Number(lng).toFixed(COORD_PRECISION)}`;
}

/**
 * Convertește GeoJSON-ul grafului într-o listă de adiacență.
 * Returnează { graph, nodesMap }
 * - graph: { "key": [ { node: "key2", weight: distance }, ... ] }
 * - nodesMap: { "key": L.latLng }
 */
function buildGraphFromGeoJSON(geoJSON) {
    const graph = {};
    const nodesMap = {};

    function addNode(lat, lng) {
        const key = getCoordKey(lat, lng);
        if (!graph[key]) {
            graph[key] = [];
            nodesMap[key] = L.latLng(lat, lng);
        }
        return key;
    }

    function addEdge(key1, key2, dist) {
        // Graf neorientat: adaugă în ambele direcții
        graph[key1].push({ node: key2, weight: dist });
        graph[key2].push({ node: key1, weight: dist });
    }

    if (!geoJSON || !geoJSON.features) return { graph, nodesMap };

    geoJSON.features.forEach(feature => {
        // Segmentăm polylines (Linii de traseu desenate)
        if (feature.geometry.type === 'LineString') {
            const coords = feature.geometry.coordinates; // Atenție: GeoJSON aruncă sub formă [lng, lat]
            for (let i = 0; i < coords.length - 1; i++) {
                const lat1 = coords[i][1], lng1 = coords[i][0];
                const lat2 = coords[i+1][1], lng2 = coords[i+1][0];
                
                const key1 = addNode(lat1, lng1);
                const key2 = addNode(lat2, lng2);
                
                // Distanța reală în metri (foarte clară din clasa Leaflet)
                const dist = nodesMap[key1].distanceTo(nodesMap[key2]);
                addEdge(key1, key2, dist);
            }
        } 
        // Noduri separate desenate explicit (Markers)
        else if (feature.geometry.type === 'Point') {
            const lat = feature.geometry.coordinates[1], lng = feature.geometry.coordinates[0];
            addNode(lat, lng);
        }
    });

    return { graph, nodesMap };
}

/**
 * Găsește cheia celui mai apropiat nod de o poziție oarecare
 */
function findNearestNode(targetLatLng, nodesMap) {
    let nearestKey = null;
    let minDistance = Infinity;

    for (const key in nodesMap) {
        const dist = targetLatLng.distanceTo(nodesMap[key]);
        if (dist < minDistance) {
            minDistance = dist;
            nearestKey = key;
        }
    }
    return nearestKey;
}

/**
 * Algoritmul Dijkstra veritabil pentru trasarea rutei minime.
 * Returnează un array de obiecte L.latLng ce va deveni calea viitoarei dâre trasate pe hartă.
 */
function runDijkstra(graph, nodesMap, startKey, endKey) {
    if (!graph[startKey] || !graph[endKey]) return null;

    const distances = {};
    const previous = {};
    const unvisited = new Set();

    for (const node in graph) {
        distances[node] = Infinity;
        previous[node] = null;
        unvisited.add(node);
    }
    distances[startKey] = 0;

    while (unvisited.size > 0) {
        // Găsim nodul curent nevizitat cu distanța minimă
        let current = null;
        let minD = Infinity;
        for (const node of unvisited) {
            if (distances[node] < minD) {
                minD = distances[node];
                current = node;
            }
        }

        // Dacă nu mai avem drumuri accesibile sau am atins finalul
        if (current === null || current === endKey) {
            break;
        }

        unvisited.delete(current);

        // Preia vecinii și relaxează drumurile
        for (const neighbor of graph[current]) {
            if (!unvisited.has(neighbor.node)) continue;

            const alt = distances[current] + neighbor.weight;
            if (alt < distances[neighbor.node]) {
                distances[neighbor.node] = alt;
                previous[neighbor.node] = current;
            }
        }
    }

    // Dacă nodul de destinație e tot pe infinity, calea e imposibilă (ex. graf rupt)
    if (distances[endKey] === Infinity) {
        return null; // Drum izolat topografic
    }

    // Reconstruiește traseul de la capăt spre început (A -> B devine prev(Prev(B)))
    const path = [];
    let curr = endKey;
    while (curr) {
        path.unshift(nodesMap[curr]);
        curr = previous[curr];
    }

    return path;
}