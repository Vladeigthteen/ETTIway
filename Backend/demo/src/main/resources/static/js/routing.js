



const COORD_PRECISION = 6;

const SNAP_TOLERANCE = 0.5;

function getCoordKey(lat, lng) {
    return `${Number(lat).toFixed(COORD_PRECISION)},${Number(lng).toFixed(COORD_PRECISION)}`;
}


function extractSegments(geoJSON) {
    const segments = [];
    if (!geoJSON || !geoJSON.features) return segments;

    function addLine(coords) {
        // GeoJSON da coordonatele ca [lng, lat]
        for (let i = 0; i < coords.length - 1; i++) {
            segments.push({
                a: { lat: coords[i][1],   lng: coords[i][0] },
                b: { lat: coords[i+1][1], lng: coords[i+1][0] }
            });
        }
    }

    geoJSON.features.forEach(feature => {
        if (!feature.geometry) return;            // FIX: geometry null nu mai da crash
        const g = feature.geometry;
        if (g.type === 'LineString') {
            addLine(g.coordinates);
        } else if (g.type === 'MultiLineString') { // FIX: MultiLineString
            g.coordinates.forEach(line => addLine(line));
        }
        
    });

    return segments;
}


function lineParams(p1, p2, p3, p4) {
    // lat/lng tratate ca y/x in plan - suficient la scara de campus
    const x1=p1.lng, y1=p1.lat, x2=p2.lng, y2=p2.lat;
    const x3=p3.lng, y3=p3.lat, x4=p4.lng, y4=p4.lat;
    const denom = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
    if (Math.abs(denom) < 1e-12) return null; // paralele / coliniare
    const t = ((x1-x3)*(y3-y4) - (y1-y3)*(x3-x4)) / denom;
    const u = ((x1-x3)*(y1-y2) - (y1-y3)*(x1-x2)) / denom;
    return { t, u, point: { lat: y1 + t*(y2-y1), lng: x1 + t*(x2-x1) } };
}

function dist2(p, q) { // distanta la patrat (doar pentru ordonare)
    const dx = p.lng - q.lng, dy = p.lat - q.lat;
    return dx*dx + dy*dy;
}

function splitSegmentsAtIntersections(segments) {
    const eps = 1e-9;
    const splitPoints = segments.map(() => []);

    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            const r = lineParams(segments[i].a, segments[i].b, segments[j].a, segments[j].b);
            if (!r) continue;
            const { t, u, point } = r;
            const tInterior = t > eps && t < 1 - eps;
            const uInterior = u > eps && u < 1 - eps;
            const tOnSeg = t >= -eps && t <= 1 + eps;
            const uOnSeg = u >= -eps && u <= 1 + eps;
            // taiem segmentul i daca intersectia cade in interiorul lui si pe segmentul j
            if (tInterior && uOnSeg) splitPoints[i].push(point);
            if (uInterior && tOnSeg) splitPoints[j].push(point);
        }
    }

    const result = [];
    segments.forEach((seg, idx) => {
        const pts = splitPoints[idx];
        if (pts.length === 0) { result.push(seg); return; }
        const all = [seg.a, ...pts, seg.b];
        all.sort((m, n) => dist2(seg.a, m) - dist2(seg.a, n)); // ordoneaza de-a lungul segmentului
        for (let k = 0; k < all.length - 1; k++) {
            result.push({ a: all[k], b: all[k+1] });
        }
    });
    return result;
}


function buildGraphFromGeoJSON(geoJSON, { splitIntersections = true } = {}) {
    const graph = {};
    const nodesMap = {};
    const nodeList = [];

    function getOrCreateNode(lat, lng) {
        const ll = L.latLng(lat, lng);
        // FIX conectivitate: refoloseste un nod existent daca e in raza SNAP_TOLERANCE
        for (const key of nodeList) {
            if (ll.distanceTo(nodesMap[key]) <= SNAP_TOLERANCE) return key;
        }
        const key = getCoordKey(lat, lng);
        if (!graph[key]) {
            graph[key] = [];
            nodesMap[key] = ll;
            nodeList.push(key);
        }
        return key;
    }

    function addEdge(k1, k2) {
        if (k1 === k2) return; // ignora muchiile de lungime zero
        const dist = nodesMap[k1].distanceTo(nodesMap[k2]);
        if (!graph[k1].some(e => e.node === k2)) graph[k1].push({ node: k2, weight: dist });
        if (!graph[k2].some(e => e.node === k1)) graph[k2].push({ node: k1, weight: dist });
    }

    let segments = extractSegments(geoJSON);
    if (splitIntersections) segments = splitSegmentsAtIntersections(segments);

    segments.forEach(seg => {
        const k1 = getOrCreateNode(seg.a.lat, seg.a.lng);
        const k2 = getOrCreateNode(seg.b.lat, seg.b.lng);
        addEdge(k1, k2);
    });

    return { graph, nodesMap };
}


function projectPointOnSegment(p, a, b) {
    const ax=a.lng, ay=a.lat, bx=b.lng, by=b.lat, px=p.lng, py=p.lat;
    const dx = bx-ax, dy = by-ay;
    const len2 = dx*dx + dy*dy;
    let t = len2 === 0 ? 0 : ((px-ax)*dx + (py-ay)*dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return { lat: ay + t*dy, lng: ax + t*dx };
}

function findNearestPointOnGraph(targetLatLng, graph, nodesMap) {
    let best = null;
    const seen = new Set();
    for (const k1 in graph) {
        for (const edge of graph[k1]) {
            const k2 = edge.node;
            const pairId = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
            if (seen.has(pairId)) continue;
            seen.add(pairId);
            const proj = projectPointOnSegment(
                { lat: targetLatLng.lat, lng: targetLatLng.lng },
                nodesMap[k1], nodesMap[k2]
            );
            const snapped = L.latLng(proj.lat, proj.lng);
            const d = targetLatLng.distanceTo(snapped);
            if (!best || d < best.distance) best = { snapped, distance: d, k1, k2 };
        }
    }
    return best; // {snapped, distance, k1, k2} sau null daca graful e gol
}

// Insereaza un nod temporar exact in punctul de snap, conectat la capetele muchiei.
// Foloseste-l pentru start (locatia utilizatorului) si sfarsit (cladirea).
function addTemporaryNode(targetLatLng, graph, nodesMap) {
    const near = findNearestPointOnGraph(targetLatLng, graph, nodesMap);
    if (!near) return null;
    const key = 'tmp:' + getCoordKey(near.snapped.lat, near.snapped.lng);
    if (!graph[key]) { graph[key] = []; nodesMap[key] = near.snapped; }
    [near.k1, near.k2].forEach(endKey => {
        const d = near.snapped.distanceTo(nodesMap[endKey]);
        if (!graph[key].some(e => e.node === endKey)) graph[key].push({ node: endKey, weight: d });
        if (!graph[endKey].some(e => e.node === key)) graph[endKey].push({ node: key, weight: d });
    });
    return key;
}

// Curata nodurile temporare dupa o rutare, ca sa nu se acumuleze.
function removeTemporaryNodes(graph, nodesMap) {
    for (const key in graph) {
        if (key.startsWith('tmp:')) { delete graph[key]; delete nodesMap[key]; }
    }
    for (const key in graph) {
        graph[key] = graph[key].filter(e => !e.node.startsWith('tmp:'));
    }
}



function findNearestNode(targetLatLng, nodesMap) {
    let nearestKey = null, minDistance = Infinity;
    for (const key in nodesMap) {
        const dist = targetLatLng.distanceTo(nodesMap[key]);
        if (dist < minDistance) { minDistance = dist; nearestKey = key; }
    }
    return nearestKey;
}


function runDijkstra(graph, nodesMap, startKey, endKey) {
    if (!graph[startKey] || !graph[endKey]) return null;
    const distances = {}, previous = {}, unvisited = new Set();
    for (const node in graph) {
        distances[node] = Infinity;
        previous[node] = null;
        unvisited.add(node);
    }
    distances[startKey] = 0;
    while (unvisited.size > 0) {
        let current = null, minD = Infinity;
        for (const node of unvisited) {
            if (distances[node] < minD) { minD = distances[node]; current = node; }
        }
        if (current === null || current === endKey) break;
        unvisited.delete(current);
        for (const neighbor of graph[current]) {
            if (!unvisited.has(neighbor.node)) continue;
            const alt = distances[current] + neighbor.weight;
            if (alt < distances[neighbor.node]) {
                distances[neighbor.node] = alt;
                previous[neighbor.node] = current;
            }
        }
    }
    if (distances[endKey] === Infinity) return null; // drum izolat topografic
    const path = [];
    let curr = endKey;
    while (curr) { path.unshift(nodesMap[curr]); curr = previous[curr]; }
    return path;
}

