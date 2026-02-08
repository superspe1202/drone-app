// Center on Yilan Dongshan Basian Section
var map = L.map('map').setView([24.635, 121.785], 17);

// 1. Base Layers
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' });
var googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 22,
    subdomains:['mt0','mt1','mt2','mt3'],
    attribution: '© Google'
});

// 2. Vector Layer (The Interactive Magic)
var vectorLayer = L.geoJSON(null, {
    style: {
        color: "#f1c40f", // Highlight color
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.1
    },
    onEachFeature: function (feature, layer) {
        layer.on('click', function (e) {
            L.DomEvent.stopPropagation(e);
            
            // Selection effect
            vectorLayer.eachLayer(l => vectorLayer.resetStyle(l));
            layer.setStyle({ color: "#e74c3c", weight: 4, fillOpacity: 0.4 });
            
            // Area Calculation
            var areaSqm = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
            updateDisplay(areaSqm);
            
            layer.bindPopup(`<b>土地資訊</b><br>面積: ${Math.round(areaSqm)} m²`).openPopup();
        });
    }
}).addTo(map);

// 3. Dynamic Tile Loader (The Pro Way)
var loadedTiles = new Set();

function lng2tile(lon,zoom) { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }
function lat2tile(lat,zoom)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }

function loadVisibleVectors() {
    var zoom = map.getZoom();
    // We only have vector data at Zoom 15-20
    if (zoom < 15 || zoom > 20) return; 
    
    var bounds = map.getBounds();
    // Get visible tile range
    var minX = lng2tile(bounds.getWest(), zoom);
    var maxX = lng2tile(bounds.getEast(), zoom);
    var minY = lat2tile(bounds.getNorth(), zoom);
    var maxY = lat2tile(bounds.getSouth(), zoom);

    // Limit radius to prevent massive requests
    for (var x = minX; x <= maxX; x++) {
        for (var y = minY; y <= maxY; y++) {
            var tilePath = `${zoom}/${x}/${y}.json`;
            if (!loadedTiles.has(tilePath)) {
                loadedTiles.add(tilePath);
                fetch(`vector_tiles/${tilePath}`)
                    .then(res => {
                        if (res.ok) return res.json();
                        throw new Error('No tile');
                    })
                    .then(data => {
                        vectorLayer.addData(data);
                    })
                    .catch(err => { /* Ignore missing tiles */ });
            }
        }
    }
}

// Trigger on move
map.on('moveend', loadVisibleVectors);
loadVisibleVectors(); // Initial load

// UI Controls
googleSat.addTo(map);

var baseMaps = { "衛星地圖": googleSat, "一般地圖": osm };
var overlayMaps = { "地籍互動層": vectorLayer };
L.control.layers(baseMaps, overlayMaps).addTo(map);
L.control.locate({position: 'topleft'}).addTo(map);

// Manual Draw Tool (Backup)
var drawnItems = new L.FeatureGroup().addTo(map);
new L.Control.Draw({
    draw: { polygon: true, polyline: false, circle: false, rectangle: true, marker: false, circlemarker: false },
    edit: { featureGroup: drawnItems }
}).addTo(map);

map.on(L.Draw.Event.CREATED, function (e) {
    drawnItems.clearLayers();
    var layer = e.layer;
    drawnItems.addLayer(layer);
    updateDisplay(L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]));
});

// Price UI Sync
var pricePerFenInput = document.getElementById('pricePerFen');
var areaDisplay = document.getElementById('areaDisplay');
var areaSubDisplay = document.getElementById('areaSubDisplay');
var priceDisplay = document.getElementById('priceDisplay');
const SQM_TO_FEN = 0.00103102; 
const SQM_TO_PING = 0.3025;    

function updateDisplay(sqm) {
    var areaFen = sqm * SQM_TO_FEN;
    var areaPing = sqm * SQM_TO_PING;
    areaDisplay.innerText = areaFen.toFixed(2) + " 分";
    areaSubDisplay.innerText = "(" + Math.floor(areaPing) + " 坪)";
    var price = Math.ceil(areaFen * parseFloat(pricePerFenInput.value));
    priceDisplay.innerText = "$" + price.toLocaleString();
}

document.getElementById('locateBtn').addEventListener('click', function() {
    map.locate({setView: true, maxZoom: 18});
});
