// Center on Yilan Dongshan Basian Section
var map = L.map('map').setView([24.635, 121.785], 17);

// 1. Base Layers
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' });
var googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 22,
    subdomains:['mt0','mt1','mt2','mt3'],
    attribution: '© Google'
});

// 2. Image Tile Layers (Visual Reference)
var cadastral591 = L.tileLayer('tiles/{z}/{x}/{y}.png', {
    opacity: 1.0,
    maxZoom: 20,       
    minZoom: 15,
    zIndex: 100,
    attribution: '591地籍圖(離線)'
});

// 3. Vector Layer (Interactive Lots)
var vectorLayer = L.geoJSON(null, {
    style: {
        color: "transparent", // Invisible but clickable
        weight: 1,
        fillColor: "#3498db",
        fillOpacity: 0
    },
    onEachFeature: function (feature, layer) {
        layer.on('click', function (e) {
            L.DomEvent.stopPropagation(e);
            // Highlight
            vectorLayer.eachLayer(l => vectorLayer.resetStyle(l));
            layer.setStyle({ color: "#f1c40f", weight: 3, fillOpacity: 0.4 });
            
            // Calculate Area
            var areaSqm = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
            updateDisplay(areaSqm);
            
            // Popup info
            var props = feature.properties || {};
            layer.bindPopup(`<b>土地資訊</b><br>面積: ${Math.round(areaSqm)} m²`).openPopup();
        });
    }
}).addTo(map);

// 4. Dynamic Loader Logic
var loadedTiles = new Set();

function lng2tile(lon,zoom) { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }
function lat2tile(lat,zoom)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }

function loadVisibleVectors() {
    var zoom = map.getZoom();
    if (zoom < 17) return; // Only load at high zoom for performance
    
    var bounds = map.getBounds();
    var minX = lng2tile(bounds.getWest(), zoom);
    var maxX = lng2tile(bounds.getEast(), zoom);
    var minY = lat2tile(bounds.getNorth(), zoom);
    var maxY = lat2tile(bounds.getSouth(), zoom);

    for (var x = minX; x <= maxX; x++) {
        for (var y = minY; y <= maxY; y++) {
            var tileKey = `${zoom}/${x}/${y}`;
            if (!loadedTiles.has(tileKey)) {
                loadedTiles.add(tileKey);
                fetch(`vector_tiles/${tileKey}.json`)
                    .then(res => res.json())
                    .then(data => {
                        vectorLayer.addData(data);
                    })
                    .catch(err => {
                        // Tile might not exist yet
                    });
            }
        }
    }
}

map.on('moveend', loadVisibleVectors);
loadVisibleVectors();

// UI Elements
googleSat.addTo(map);
cadastral591.addTo(map);

var baseMaps = { "衛星地圖": googleSat, "白底地圖": osm };
var overlayMaps = { "591 紅線 (離線)": cadastral591, "互動選取層": vectorLayer };
L.control.layers(baseMaps, overlayMaps).addTo(map);
L.control.locate({position: 'topleft'}).addTo(map);

// Existing Draw Tools (Manual Override)
var drawnItems = new L.FeatureGroup().addTo(map);
new L.Control.Draw({
    draw: { polygon: { showArea: true }, polyline: false, circle: false, rectangle: true, marker: false, circlemarker: false },
    edit: { featureGroup: drawnItems }
}).addTo(map);

map.on(L.Draw.Event.CREATED, function (e) {
    drawnItems.clearLayers();
    var layer = e.layer;
    drawnItems.addLayer(layer);
    updateDisplay(L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]));
});

// Price Calculation
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
