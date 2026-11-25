


// Variables for the bar hitograms 
let wilayaChart = null;
let allFeatures = [];
let chartJsLoaded = false;
let layersByCode = {};        // Maps wilaya code ("01") -> Leaflet layer
let currentSelectedCode = null;
let currentMetric = "TAG";

let sortByValue = false;
let displayedFeatures = [];




const METRIC_CONFIG = {
  TAG: { label: "TAG (%)", isPercent: true },
  TAE: { label: "TAE (%)", isPercent: true },
  TPG: { label: "TPG (%)", isPercent: true },
  NAE: { label: "NAE (Abonnés)", isPercent: false },
  NAG: { label: "NAG (Abonnés)", isPercent: false }
};





// Define hex values if appTheme is not already declared in an external file
/*const SCICHART_COLORS = {
  MutedRed: "#CC4848",
  VividOrange: "#F48420",
  MutedOrange: "#E28A3B",
  PaleOrange: "#F7B579",
  MutedPink: "#D46A92",
  VividPink: "#EC0F6C",
  PalePink: "#F28CB6",
  VividPurple: "#8B36D1",
  Indigo: "#4E38D6",
  VividBlue: "#364BA0",
  PaleBlue: "#8FA8E0",
  VividSkyBlue: "#50C7E0",
  MutedSkyBlue: "#67BDAF",
  MutedTeal: "#36B8A6",
  PaleTeal: "#8EDAD0"
};*/




const SCICHART_COLORS = {
  MutedRed:     "#FF0000", // minimum
  VividOrange:  "#FF1800",
  MutedOrange:  "#FF3000",
  PaleOrange:   "#FF4900",
  MutedPink:    "#FF6100",
  VividPink:    "#FF7900",
  PalePink:     "#FF9200",
  VividPurple:  "#FFAA00",
  Indigo:       "#FFC200",
  VividBlue:    "#FFDB00",
  PaleBlue:     "#FFF300",
  VividSkyBlue: "#DFFF00",
  MutedSkyBlue: "#94FF00",
  MutedTeal:    "#4AFF00",
  PaleTeal:     "#00FF00"  // maximum
};


// 5 distinct intervals for TAE, TAG, TPG (0-20%, 20-40%, 40-60%, 60-80%, 80-100%)
/*const PERCENT_PALETTE = [
  SCICHART_COLORS.MutedRed,     // 0% – 20%
  SCICHART_COLORS.VividOrange,  // 20% – 40%
  SCICHART_COLORS.MutedPink,    // 40% – 60%
  SCICHART_COLORS.VividPurple,  // 60% – 80%
  SCICHART_COLORS.Indigo        // 80% – 100%
];*/
const PERCENT_PALETTE = [
  "#E88888", //  0 à < 20 % — rouge doux
  "#F2B079", // 20 à < 40 % — orange abricot
  "#F4D873", // 40 à < 60 % — jaune doré
  "#B6D982", // 60 à < 80 % — vert tendre
  "#70BA85"  // 80 à 100 %  — vert doux
];

// 5 distinct intervals for NAE, NAG subscriber counts
const COUNT_PALETTE = [
  SCICHART_COLORS.PaleTeal,     // 0 – 20% of max
  SCICHART_COLORS.MutedSkyBlue, // 20 – 40% of max
  SCICHART_COLORS.MutedTeal,    // 40 – 60% of max
  SCICHART_COLORS.VividSkyBlue, // 60 – 80% of max
  SCICHART_COLORS.VividBlue     // 80 – 100% of max
];





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
	minZoom: 5,
	maxZoom: 7,
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
    fillOpacity: 0.85,
    color: '#525252',
    weight: 1.5,
    opacity: 1
  };
}



// Mouse hover  ! 
function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({
    weight: 1.5,         
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


// ** Geographical renderiung part **  //
async function DisplayGeoJSON(url) {
  const response = await fetch(url);
  
  if (!response.ok) { 
    throw new Error(`Erreur HTTP ${response.status} pour ${url}`); // ✅ Corrigé : response au lieu de response1
  }
  const data = await response.json();
allFeatures = [...data.features].sort((a, b) => {
  return Number(a.properties.code ?? a.properties.id) - Number(b.properties.code ?? b.properties.id);
});
//renderTagChart();
renderChart() ;

   geo_layer = L.geoJSON(data, {
              style: styleByRegion,
              onEachFeature(feature, layer) {
    // Define code & save the layer reference for chart-to-map sync
    const code = String(feature.properties.code ?? feature.properties.id).padStart(2, "0");
    layersByCode[code] = layer;

    // Attach all events inside a single object
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

// Add a legend   inside the map for the region colors 
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  const regions = ['Nord', 'Hauts-Plateaux', 'Sud'];
  div.innerHTML = '<strong>Régions</strong><br>';
  regions.forEach(region => {div.innerHTML +=`<i style="background:${getRegionColor(region)}"></i> ${region}<br>`; });
  return div;
};
legend.addTo(map);

// Call the function to display the map  with the json file as argument  
DisplayGeoJSON("./json/data.geojson").catch(console.error);



// Set color regions  
function getRegionColor(region) {
	console.log(region) ; 	
  switch (region) {
    case 'Nord':
      return '#6d71ed';    // Blue   
    case 'Hauts-Plateaux':
      return '#37e6ae';    // 
    case 'Sud':
      return '#cde85f';  
    default:
      return '#95a5a6'; 
  }
}






//***  TABLES AND HISTOGRAMS  ***  // 
// Tables  
const formatNombre = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2
});

// Fill the tables function  
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
        cellule.textContent = typeof valeur === "number" ? formatNombre.format(valeur) : (valeur ?? "—");
    }
}

// Litle function for date formatting  
function formatDateDDMMYYYY(val) {
  if (!val) return "—";
  const str = String(val).replace(/\D/g, "");
  if (str.length !== 8) return val;
  const year = str.slice(0, 4);
  const month = Number(str.slice(4, 6)); // Drops leading zero (e.g. "05" -> 5, "11" -> 11)
  const day = str.slice(6, 8);
  return `${day}-${month}-${year}`;
}


//Populate all tabs when a polygon is clicked
function displayTable(props) {
  if (!props) return;


  const code = String(props.code ?? props.id).padStart(2, "0");


    currentSelectedCode = code;
  const nom = props.name_fr.toLocaleUpperCase("fr-FR");

  document.getElementById("titre-wilaya").textContent = `Wilaya sélectionnée : ${code} ${nom}`;
  // Table  1  Properties
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

  // Tab 2  PEC Table
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

  // Tab 3  Update Histogram plots 
  updateHistogram(props);
}

// Placeholder for histogram logic
function updateHistogram(props) {
  //console.log("Updating chart for:", props.name_fr, props.TAE, props.TAG, props.TPG);
  return null ; 
}


// Open a tab  
function openTab(evt, tabId) {
  // Hide all tab panels
  document.querySelectorAll(".tabcontent").forEach(panel => {
    panel.style.display = "none";
  });

  //Remove active highlight from all tab buttons
  document.querySelectorAll(".tablinks").forEach(btn => {
    btn.classList.remove("active");
  });

  //Show clicked tab & activate its button
  document.getElementById(tabId).style.display = "block";
  evt.currentTarget.classList.add("active");

  // Resize and auto-scroll the chart when opening the Histogrammes tab  
if (tabId === "tab-histograms" && wilayaChart) {
  wilayaChart.resize();
 scrollToSelectedBar();
  if (currentSelectedCode) {
    const idx = displayedFeatures.findIndex(
      f => String(f.properties.code ?? f.properties.id).padStart(2, "0") === currentSelectedCode
    );

    const scrollBox = document.getElementById("chart-scroll-box");
    const meta = wilayaChart.getDatasetMeta(0);

    if (idx !== -1 && scrollBox && meta.data[idx]) {
      // Exact Y position of the bar inside the 1500px canvas
      const barY = meta.data[idx].y;

      setTimeout(() => {
        scrollBox.scrollTo({
          top: Math.max(0, barY - scrollBox.clientHeight / 2),
          behavior: "smooth"
        });
      }, 50);
    }
  }
}

}


function selectWilaya(code, fromChart = false) {
  if (currentSelectedCode && layersByCode[currentSelectedCode]) {
    geo_layer.resetStyle(layersByCode[currentSelectedCode]);
  }

  currentSelectedCode = code;
  const layer = layersByCode[code];
  if (!layer) return;


const config = METRIC_CONFIG[currentMetric];
layer.setStyle({
  weight: 3,
  color: config.isPercent ? "#4f46e5" : "#4f46e5" ,   // appTheme.VividSkyBlue : appTheme.VividPink,
  fillOpacity: 0.85
});


 /* layer.setStyle({
    weight: 3,
    color: "#4f46e5",
    fillOpacity: 0.85
  });*/
  layer.bringToFront();

  displayTable(layer.feature.properties);
  renderChart(code);

  // Scroll to the bar if the user clicked on the map while Histogrammes is open
  if (!fromChart) {
    scrollToSelectedBar();
  }
}





// Load the chart.js  plugins   (lazy load )  )
function loadChartJsAndRender(selectedCode = null) {
  if (chartJsLoaded) {
    renderChart(selectedCode);
    return;  }
    
  const script = document.createElement("script");
  script.src = "https://jsdelivr.net";
  script.onload = () => {    chartJsLoaded = true;    renderTagChart(selectedCode);  };
  document.head.appendChild(script);
}




//*** Metric and lengend for the drop down menu  ***//  

// Function to sort the bars by wilaya or by values !
function toggleSort() {
  sortByValue = !sortByValue;
  const btn = document.getElementById("sort-btn");
  if (btn) {
    btn.textContent = sortByValue ? "Trier par:code wilaya 01-69" : "Trier par: valeurs décroissante ";
  }
  renderChart(currentSelectedCode);
}

function changeMetric(metric) {
  currentMetric = metric;
  renderChart(currentSelectedCode);
}

// Compute bar color based on percentage (0-100%) or relative ratio (0-100% of max)
function getMetricColor(val, maxVal, isPercent) {
  const ratio = isPercent ? val : (maxVal > 0 ? (val / maxVal) * 100 : 0);
  const palette = isPercent ? PERCENT_PALETTE : COUNT_PALETTE;

  if (ratio < 20) return palette[0];
  if (ratio < 40) return palette[1];
  if (ratio < 60) return palette[2];
  if (ratio < 80) return palette[3];
  return palette[4];
}


function updateChartLegend(isPercent, maxVal) {
  const legendEl = document.getElementById("chart-legend");
  if (!legendEl) return;

  if (isPercent) {
    legendEl.innerHTML = `
      <span><i style="background:${PERCENT_PALETTE[0]}"></i> 0 – 20%</span>
      <span><i style="background:${PERCENT_PALETTE[1]}"></i> 20 – 40%</span>
      <span><i style="background:${PERCENT_PALETTE[2]}"></i> 40 – 60%</span>
      <span><i style="background:${PERCENT_PALETTE[3]}"></i> 60 – 80%</span>
      <span><i style="background:${PERCENT_PALETTE[4]}"></i> 80 – 100%</span>
      <span><i style="background:#4f46e5; border: 1.5px solid #000;"></i> Sélectionnée</span>
    `;
  } else {
    const step = maxVal / 5;
    const fmt = (n) => formatNombre.format(Math.round(n));
    legendEl.innerHTML = `
      <span><i style="background:${COUNT_PALETTE[0]}"></i> 0 – ${fmt(step)}</span>
      <span><i style="background:${COUNT_PALETTE[1]}"></i> ${fmt(step)} – ${fmt(step * 2)}</span>
      <span><i style="background:${COUNT_PALETTE[2]}"></i> ${fmt(step * 2)} – ${fmt(step * 3)}</span>
      <span><i style="background:${COUNT_PALETTE[3]}"></i> ${fmt(step * 3)} – ${fmt(step * 4)}</span>
      <span><i style="background:${COUNT_PALETTE[4]}"></i> > ${fmt(step * 4)}</span>
      <span><i style="background:#4f46e5; border: 1.5px solid #000;"></i> Sélectionnée</span>
    `;
  }
}



// Build the legend for the histogram plot
function getTagColor(val) {
  if (val < 20) return "#f43f5e"; // 0%  – 20 % 
  if (val < 40) return "#fb923c"; // 20% – 40 % 
  if (val < 60) return "#facc15"; // 40% – 60 % 
  if (val < 80) return "#34d399"; // 60% – 80 % 
  return "#059669";               // 80% – 100%
}



function scrollToSelectedBar() {
  const histTab = document.getElementById("tab-histograms");
  // Only scroll if the Histogrammes tab is currently visible and a wilaya is selected
  if (!histTab || histTab.style.display === "none" || !currentSelectedCode || !wilayaChart) {
    return;
  }

  const idx = displayedFeatures.findIndex(
    f => String(f.properties.code ?? f.properties.id).padStart(2, "0") === currentSelectedCode
  );

  const scrollBox = document.getElementById("chart-scroll-box");
  const meta = wilayaChart.getDatasetMeta(0);

  if (idx !== -1 && scrollBox && meta.data[idx]) {
    const barY = meta.data[idx].y;
    setTimeout(() => {
      scrollBox.scrollTo({
        top: Math.max(0, barY - scrollBox.clientHeight / 2),
        behavior: "smooth"
      });
    }, 50);
  }
}


function hexToRgba(hex, alpha = 0.75) {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


function renderChart(selectedCode = null) {
  const canvas = document.getElementById("chart-wilaya");
  if (!canvas || typeof Chart === "undefined") return;

  const config = METRIC_CONFIG[currentMetric];

  // 1. Sort features based on active mode
  displayedFeatures = [...allFeatures].sort((a, b) => {
    if (sortByValue) {
      const valA = Number(a.properties[currentMetric]) || 0;
      const valB = Number(b.properties[currentMetric]) || 0;
      return valB - valA; // Highest to lowest
    }
    const codeA = Number(a.properties.code ?? a.properties.id);
    const codeB = Number(b.properties.code ?? b.properties.id);
    return codeA - codeB; // Administrative code 01 -> 69
  });

  // 2. Build arrays from displayedFeatures
  const values = displayedFeatures.map(f => Number(f.properties[currentMetric]) || 0);
  const maxVal = config.isPercent ? 100 : Math.max(...values, 1);

  updateChartLegend(config.isPercent, maxVal);

  const labels = displayedFeatures.map(f => {
    const code = String(f.properties.code ?? f.properties.id).padStart(2, "0");
    return `${code} - ${f.properties.name_fr}`;
  });

  const highlightColor = config.isPercent ? "#4f46e5" : "#4f46e5";
  //const highlightColor = config.isPercent ? appTheme.VividSkyBlue : appTheme.VividPink;
  const backgroundColors = displayedFeatures.map((f, idx) => {
    const code = String(f.properties.code ?? f.properties.id).padStart(2, "0");
    return (selectedCode && code === selectedCode)
      ? highlightColor
      : getMetricColor(values[idx], maxVal, config.isPercent);
  });
  


  const borderWidths = displayedFeatures.map(f => {
    const code = String(f.properties.code ?? f.properties.id).padStart(2, "0");
    return (selectedCode && code === selectedCode) ? 2 : 0.5;
  });


/*const barOpacity = 0.75; // Adjust between 0.1 and 1.0
const backgroundColors = displayedFeatures.map((f, idx) => {
  const code = String(f.properties.code ?? f.properties.id).padStart(2, "0");
  if (selectedCode && code === selectedCode) {
    return hexToRgba("#8EDAD0", 1); // Selected bar at 100% opacity
  }
  const baseHex = getMetricColor(values[idx], maxVal, config.isPercent);
  return hexToRgba(baseHex, barOpacity);
});*/




// Optional: Give each bar a solid 100% opaque border matching its fill color
const borderColors = displayedFeatures.map((f, idx) => {
  const code = String(f.properties.code ?? f.properties.id).padStart(2, "0");
  if (selectedCode && code === selectedCode) {
    return "#000000";
  }
  return getMetricColor(values[idx], maxVal, config.isPercent);
});


  if (wilayaChart) {
    wilayaChart.data.labels = labels; // Important: update labels when sort order changes
    wilayaChart.data.datasets[0].label = config.label;
    wilayaChart.data.datasets[0].data = values;
    wilayaChart.data.datasets[0].backgroundColor = backgroundColors;
    wilayaChart.data.datasets[0].borderWidth = borderWidths;
    wilayaChart.options.scales.x.max = config.isPercent ? 100 : undefined;
    wilayaChart.options.scales.x.title.text = config.label;
    wilayaChart.update("none");
    return;
  }

  wilayaChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: config.label,
        data : values,
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
      onClick: (event, elements) => {
        if (!elements.length) return;
        const index = elements[0].index;
        // Read from displayedFeatures so sorted bars map to the exact right wilaya
        const feature = displayedFeatures[index];
        const code = String(feature.properties.code ?? feature.properties.id).padStart(2, "0");
        selectWilaya(code);

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
          max: config.isPercent ? 100 : undefined,
          title: { display: true, text: config.label }
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




/*function renderChart(selectedCode = null) {
  const canvas = document.getElementById("chart-wilaya");
  if (!canvas || typeof Chart === "undefined") return;

  const config = METRIC_CONFIG[currentMetric];
  const values = allFeatures.map(f => Number(f.properties[currentMetric]) || 0);
  const maxVal = config.isPercent ? 100 : Math.max(...values, 1);

  updateChartLegend(config.isPercent, maxVal);

  const labels = allFeatures.map(f => {
    const code = String(f.properties.code ?? f.properties.id).padStart(2, "0");
    return `${code} - ${f.properties.name_fr}`;
  });

  // Use indigo highlight on green/warm bars, and rose highlight on blue NAE/NAG bars
  const highlightColor = config.isPercent ? "#4f46e5" : "#e11d48";

  const backgroundColors = allFeatures.map((f, idx) => {
    const code = String(f.properties.code ?? f.properties.id).padStart(2, "0");
    return (selectedCode && code === selectedCode)
      ? highlightColor
      : getMetricColor(values[idx], maxVal, config.isPercent);
  });

  const borderWidths = allFeatures.map(f => {
    const code = String(f.properties.code ?? f.properties.id).padStart(2, "0");
    return (selectedCode && code === selectedCode) ? 2 : 0.5;
  });

  if (wilayaChart) {
    wilayaChart.data.datasets[0].label = config.label;
    wilayaChart.data.datasets[0].data = values;
    wilayaChart.data.datasets[0].backgroundColor = backgroundColors;
    wilayaChart.data.datasets[0].borderWidth = borderWidths;
    wilayaChart.options.scales.x.max = config.isPercent ? 100 : undefined;
    wilayaChart.options.scales.x.title.text = config.label;
    wilayaChart.update("none");
    return;
  }

  wilayaChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: config.label,
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
      onClick: (event, elements) => {
        if (!elements.length) return;
        const index = elements[0].index;
        const feature = allFeatures[index];
        const code = String(feature.properties.code ?? feature.properties.id).padStart(2, "0");
        selectWilaya(code);

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
          max: config.isPercent ? 100 : undefined,
          title: { display: true, text: config.label }
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
}*/




/*function renderTagChart(selectedCode = null) {
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
	 // Dataset is an array of subarrays . The data are in the first  i = 0
    // Access datasets[0]
    wilayaChart.data.datasets[0].backgroundColor = backgroundColors;
    wilayaChart.data.datasets[0].borderWidth     = borderWidths;
    wilayaChart.update("none");
    return;
  }
  
  // Render the histograms  
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
}*/
