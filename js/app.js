


// Variables for the bar hitograms 
let wilayaChart = null;
let allFeatures = [];
let chartJsLoaded = false;
let layersByCode = {};        // Maps wilaya code ("01") -> Leaflet layer
let currentSelectedCode = null;


// baseMap Leaflet
const southWest_corner  = L.latLng([38.5, 2.5]);
const northEast_corner  = L.latLng([55.5,  8.5]);
const map_extent        = L.latLngBounds(southWest_corner, northEast_corner);

// init the map object  
const map = L.map('map', { crs: L.CRS.EPSG3857 }).setView([50.5, 5.75], 6);

/*var  osm1 = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});*/

var osm1 = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.{ext}', {
	minZoom: 3,
	maxZoom: 6,
	attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	ext: 'png'
});


let activeBasemap = osm1;
activeBasemap.addTo(map);

const basemapsConfig = [ {  id: "osm_dark", label: "OSM Dark matter" , category: "Basemaps",  icon: "map",layer: osm1 },  ] ; 



function styleByRegion(feature) {		
  const regionName = feature.properties.zone;
  return {
    fillColor: getRegionColor(regionName), 
    fillOpacity: 0.7,
    color: '#525252',
    weight: 1.5,
    opacity: 1
  };
}



// Mouse hover  ! 
function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({
    weight: 3,         
    color: '#000000',
    fillOpacity: 0.9  
  });
   // Highlight on polygon  
  layer.bringToFront();
}


// Reset the polygon props if mouse is outside 
function resetHighlight(e) {
  geo_layer.resetStyle(e.target);
}



async function DisplayGeoJSON(url) {
  const response = await fetch(url);
  
  if (!response.ok) { 
    throw new Error(`Erreur HTTP ${response.status} pour ${url}`); // ✅ Corrigé : response au lieu de response1
  }
  const data = await response.json();


allFeatures = [...data.features].sort((a, b) => {
  return Number(a.properties.code ?? a.properties.id) - Number(b.properties.code ?? b.properties.id);
});
renderTagChart();


console.log(allFeatures)  ; 


geo_layer = L.geoJSON(data, {
  style: styleByRegion,

  onEachFeature(feature, layer) {
    // 1. Define code & save the layer reference for chart-to-map sync
    const code = String(feature.properties.code ?? feature.properties.id).padStart(2, "0");
    layersByCode[code] = layer;

    // 2. Attach all events inside a single object
    layer.on({
      mouseover: highlightFeature,
      mouseout: (e) => {
        if (code !== currentSelectedCode) {
          resetHighlight(e);
        }
      },
      click: () => selectWilaya(code)
    });

    // Optional: display the wilaya name
    if (feature.properties.nom) {
      layer.bindTooltip(feature.properties.nom, { sticky: true });
    }
  }
}).addTo(map);


const bounds = geo_layer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [15, 15] });
  }
}

// Add legend  
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  const regions = ['Nord', 'Hauts-Plateaux', 'Sud'];
  div.innerHTML = '<strong>Régions</strong><br>';
  regions.forEach(region => {
    div.innerHTML +=
      `<i style="background:${getRegionColor(region)}"></i> ${region}<br>`;
  });
  return div;
};
legend.addTo(map);


// Call the function to display the map 
DisplayGeoJSON("./json/data.geojson").catch(console.error);


// Set color regions  
function getRegionColor(region) {
	console.log(region) ; 
	
  switch (region) {
    case 'Nord':
      return '#7cb5de';    // Blue   
    case 'Hauts-Plateaux':
      return '#e9ebc7';    // 
    case 'Sud':
      return '#f7b160';   // kaki  
    default:
      return '#95a5a6'; 
  }
}



// Tables  
const formatNombre = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2
});



function fillTable(tableId, lignes) {
    const table = document.getElementById(tableId);
    const tbody = table.tBodies[0];

    tbody.replaceChildren();

    for (const [libelle, valeur] of lignes) {
        const ligne = tbody.insertRow();
        
        const titre = document.createElement("th");
        titre.scope = "row";
        titre.textContent = libelle;
        ligne.appendChild(titre);

        const cellule = ligne.insertCell();
        cellule.textContent = typeof valeur === "number"
            ? formatNombre.format(valeur)
            : (valeur ?? "—");
    }
}





function formatDateDDMMYYYY(val) {
  if (!val) return "—";
  
  const str = String(val).replace(/\D/g, "");
  if (str.length !== 8) return val;

  const year = str.slice(0, 4);
  const month = Number(str.slice(4, 6)); // Drops leading zero (e.g. "05" -> 5, "11" -> 11)
  const day = str.slice(6, 8);

  return `${day}-${month}-${year}`;
}


// 2. Populate all tabs when a polygon is clicked
function displayTable(props) {
  if (!props) return;

  const code = String(props.code ?? props.id).padStart(2, "0");
  const nom = props.name_fr.toLocaleUpperCase("fr-FR");

  document.getElementById("titre-wilaya").textContent = `Wilaya sélectionnée : ${code} ${nom}`;

  // Tab 1: Properties
  const lignes_zone = [
    ["Code", code],
    ["Wilaya", nom],
    ["Zone (indicative)", props.zone],
    ["NAE", props.NAE],
    ["NAG", props.NAG],
    ["TAE (%)", props.TAE],
    ["TAG (%)", props.TAG],
    ["TPG (%)", props.TPG],
    ["Niveau (0-3)", props.niveau]
  ];
  fillTable("table-wilaya", lignes_zone);
  document.getElementById("table-wilaya").hidden = false;

  // Tab 3: PEC Table
  const lignes_pec = [
    ["Date"     , formatDateDDMMYYYY( props.date) ],
    ["Code"     , code],
    ["Wilaya"   , nom],
    ["PEC ELEC" ,  props.PEC_ELEC],
    ["PEC GAZ"  ,  props.PEC_GAZ],
    ["Nouveau"  , props.nouveau]
  ];
  fillTable("table-wilaya-pec", lignes_pec);
  document.getElementById("table-wilaya-pec").hidden = false;

  // Tab 2: Update Histogram (if you have a chart function)
  updateHistogram(props);
}

// Placeholder for your histogram logic
function updateHistogram(props) {
  // Render or update your Chart.js / D3 chart inside #chart-wilaya here
  console.log("Updating chart for:", props.name_fr, props.TAE, props.TAG, props.TPG);
}






function openTab(evt, tabId) {
  document.querySelectorAll(".tabcontent").forEach(panel => {
    panel.style.display = "none";
  });

  document.querySelectorAll(".tablinks").forEach(btn => {
    btn.classList.remove("active");
  });

  document.getElementById(tabId).style.display = "block";
  evt.currentTarget.classList.add("active");

  // Fix canvas sizing when switching to the hidden Histogrammes tab
  if (tabId === "tab-histograms" && wilayaChart) {
    wilayaChart.resize();
  }
}




function selectWilaya(code) {
  // 1. Reset previously selected polygon on the map
  if (currentSelectedCode && layersByCode[currentSelectedCode]) {
    geo_layer.resetStyle(layersByCode[currentSelectedCode]);
  }

  currentSelectedCode = code;
  const layer = layersByCode[code];
  if (!layer) return;

  // 2. Highlight polygon on the map
  layer.setStyle({
    weight: 3,
   // color: "#2b83ba",
   color: "#616fed",
    fillOpacity: 0.85
  });
  layer.bringToFront();

  // 3. Update tables & highlight bar on the chart
  displayTable(layer.feature.properties);
  renderTagChart(code);
}


function loadChartJsAndRender(selectedCode = null) {
  if (chartJsLoaded) {
    renderTagChart(selectedCode);
    return;
  }
  const script = document.createElement("script");
  script.src = "https://jsdelivr.net";
  script.onload = () => {
    chartJsLoaded = true;
    renderTagChart(selectedCode);
  };
  document.head.appendChild(script);
}





/*function getTagColor(val) {
  if (val < 25) return "#d73027"; // Red (Low)
  if (val < 50) return "#fc8d59"; // Orange (Medium-Low)
  if (val < 75) return "#fee08b"; // Yellow (Medium-High)
  return "#1a9850";               // Green (High >= 75%)
}*/

function getTagColor(val) {
  if (val < 20) return "#f43f5e"; // 0% – 20%: Modern Rose
  if (val < 40) return "#fb923c"; // 20% – 40%: Warm Orange
  if (val < 60) return "#facc15"; // 40% – 60%: Vibrant Amber
  if (val < 80) return "#34d399"; // 60% – 80%: Fresh Mint
  return "#059669";               // 80% – 100%: Deep Emerald
}


function renderTagChart(selectedCode = null) {
  const canvas = document.getElementById("chart-wilaya");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = allFeatures.map(f => {
    const code = String(f.properties.code ?? f.properties.id).padStart(2, "0");
    return `${code} - ${f.properties.name_fr}`;
  });

  const values = allFeatures.map(f => Number(f.properties.TAG) || 0);

  const backgroundColors = allFeatures.map(f => {
    const code = String(f.properties.code ?? f.properties.id).padStart(2, "0");
    return (selectedCode && code === selectedCode)  ? "#616fed" : getTagColor(Number(f.properties.TAG) || 0);
  });

  const borderWidths = allFeatures.map(f => {
    const code = String(f.properties.code ?? f.properties.id).padStart(2, "0");
    return (selectedCode && code === selectedCode) ? 2 : 0.5;
  });

  if (wilayaChart) {
    // Fixed: access datasets[0]
    wilayaChart.data.datasets[0].backgroundColor = backgroundColors;
    wilayaChart.data.datasets[0].borderWidth     = borderWidths;
    wilayaChart.update("none");
    return;
  }

  wilayaChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "TAG (%)",
        data: values,
        backgroundColor: backgroundColors,
        borderColor: "#222",
        borderWidth: borderWidths
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      // Chart -> Map click handler
      onClick: (event, elements) => {
        if (!elements.length) return;
        const index = elements[0].index;
        const feature = allFeatures[index];
        const code = String(feature.properties.code ?? feature.properties.id).padStart(2, "0");

        selectWilaya(code);

        // Zoom/pan the map to the clicked wilaya
        const layer = layersByCode[code];
        if (layer) {
          map.fitBounds(layer.getBounds(), { maxZoom: 8, padding: [20, 20] });
        }
      },
      onHover: (event, elements) => {
        event.native.target.style.cursor = elements.length ? "pointer" : "default";
      },
      plugins: {
        legend: { display: false },
        title: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          title: { display: true, text: "TAG (%)" }
        },
        y: {
          ticks: {
            autoSkip: false,
            font: { size: 11 }
          }
        }
      }
    }
  });
}



