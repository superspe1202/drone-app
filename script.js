// Center on Yilan Dongshan Basian Section (冬山鄉八仙段)
var map = L.map('map').setView([24.6185, 121.7510], 19);

// 1. Base Layers
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' });
var googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 22,
    subdomains:['mt0','mt1','mt2','mt3'],
    attribution: '© Google'
});

// 2. Vector Layer
var vectorLayer = L.geoJSON(null, {
    style: {
        color: "#f1c40f",
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.1
    },
    onEachFeature: function (feature, layer) {
        layer.on('click', function (e) {
            L.DomEvent.stopPropagation(e);
            vectorLayer.eachLayer(l => vectorLayer.resetStyle(l));
            layer.setStyle({ color: "#e74c3c", weight: 5, fillOpacity: 0.4 });
            
            var latlngs = layer.getLatLngs();
            var pts = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
            var areaSqm = L.GeometryUtil.geodesicArea(pts);
            updateDisplay(areaSqm);
            showEdgeLengths(layer);
            
            layer.bindPopup(`<b>地塊資訊</b><br>面積: ${Math.round(areaSqm)} m²`).openPopup();
        });
    }
}).addTo(map);

// 3. 邊長顯示
var edgeLabelGroup = L.layerGroup().addTo(map);

function showEdgeLengths(layer) {
    edgeLabelGroup.clearLayers();
    var latlngs = layer.getLatLngs();
    var pts = latlngs[0];
    if (Array.isArray(pts[0])) pts = pts[0]; 

    for (var i = 0; i < pts.length; i++) {
        var p1 = pts[i];
        var p2 = pts[(i + 1) % pts.length];
        var distance = map.distance(p1, p2);
        if (distance > 1) {
            var midPoint = L.latLng((p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2);
            L.marker(midPoint, {
                icon: L.divIcon({
                    className: 'edge-label',
                    html: `<span>${distance.toFixed(1)}m</span>`,
                    iconSize: [50, 20],
                    iconAnchor: [25, 10]
                }),
                interactive: false
            }).addTo(edgeLabelGroup);
        }
    }
}

// 4. INLINED Test Data
const testData = {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[[121.7508316040039, 24.618511855026984], [121.7508316040039, 24.618307029310575], [121.7511735856533, 24.618307029310575], [121.7511735856533, 24.618341166929977], [121.75100058317184, 24.61840944216878], [121.7508316040039, 24.618511855026984]]]}, "properties": {"id": 0, "area_m2": 2316, "lengths": [22.8, 34.6, 3.8, 19.1, 20.5]}}, {"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[[121.7508316040039, 24.618617925487268], [121.7508316040039, 24.61852282783322], [121.75099924206734, 24.618420414975017], [121.7511735856533, 24.618349701334825], [121.7511735856533, 24.618538677442228], [121.75111055374146, 24.6185606230547], [121.75112128257751, 24.618594760674103], [121.75110250711441, 24.618598418276182], [121.75112530589104, 24.618595979874794], [121.75111189484596, 24.61856428065678], [121.7511735856533, 24.618542335044307], [121.75111323595047, 24.61856793825886], [121.75113067030907, 24.618597199075488], [121.75111725926399, 24.61856915745955], [121.7511735856533, 24.61854721184708], [121.75117090344429, 24.618594760674103], [121.75100326538086, 24.618604514279646], [121.75098180770874, 24.618617925487268], [121.7508316040039, 24.618617925487268]]]}, "properties": {"id": 6, "area_m2": 3722, "lengths": [10.6, 20.4, 19.3, 21.0, 6.8, 3.9, 1.9, 2.3, 3.8, 6.7, 6.7, 3.7, 3.4, 6.2, 5.3, 17.0, 2.6, 15.2]}}]};

vectorLayer.addData(testData);

// Controls
googleSat.addTo(map);
var pricePerFenInput = document.getElementById('pricePerFen');
var areaDisplay = document.getElementById('areaDisplay');
var areaSubDisplay = document.getElementById('areaSubDisplay');
var priceDisplay = document.getElementById('priceDisplay');

function updateDisplay(sqm) {
    areaDisplay.innerText = (sqm * 0.001031).toFixed(2) + " 分";
    areaSubDisplay.innerText = "(" + Math.floor(sqm * 0.3025) + " 坪)";
    priceDisplay.innerText = "$" + Math.ceil(sqm * 0.001031 * parseFloat(pricePerFenInput.value)).toLocaleString();
}

document.getElementById('locateBtn').addEventListener('click', () => map.locate({setView: true, maxZoom: 18}));
document.getElementById('clearBtn').addEventListener('click', () => {
    vectorLayer.eachLayer(l => vectorLayer.resetStyle(l));
    edgeLabelGroup.clearLayers();
    updateDisplay(0);
});
