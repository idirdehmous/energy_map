
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
	maxZoom: 8,
	attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	ext: 'png'
});


let activeBasemap = osm1;
activeBasemap.addTo(map);

const basemapsConfig = [ {  id: "osm_dark", label: "OSM Dark matter" , category: "Basemaps",  icon: "map",layer: osm1 },  ] ; 




function styleParRegion(feature) {
	
console.log(feature) ; 	
  const regionName = feature.properties.zone;
  return {
    fillColor: getRegionColor(regionName), 
    fillOpacity: 0.7,
    color: '#525252',
    weight: 1.5,
    opacity: 1
  };
}



// Effet au survol de la souris
function highlightFeature(e) {
  const layer = e.target;

  layer.setStyle({
    weight: 3,          // Bordure plus épaisse
    color: '#000000',
    fillOpacity: 0.9    // Couleur plus intense
  });

  // Met le polygone au premier plan pour éviter que sa bordure soit coupée
  layer.bringToFront();
}

// Réinitialisation quand la souris quitte le polygone
function resetHighlight(e) {
  couche.resetStyle(e.target);
}



async function DisplayGeoJSON(url) {
  const response = await fetch(url);
  
  if (!response.ok) { 
    throw new Error(`Erreur HTTP ${response.status} pour ${url}`); // ✅ Corrigé : response au lieu de response1
  }
  const data = await response.json();

    couche = L.geoJSON(data, { 
    style: styleParRegion,
    onEachFeature(feature, layer) {
      // highlight the region 
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: () => displayTable(feature.properties)
      });
// Optional : display the wilaya name 
      if (feature.properties.nom) {
        layer.bindTooltip(feature.properties.nom, { sticky: true });
      }
    }	
  }).addTo(map);
  
const bounds = couche.getBounds();
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



function remplirTableau(tableId, lignes) {
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

function displayTable(props) {
    const code = String(props.code ?? props.id).padStart(2, "0");
    const nom = props.name_fr.toLocaleUpperCase("fr-FR");

    document.getElementById("titre-wilaya").textContent = `Wilaya sélectionnée : ${code} ${nom}`;

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

    const lignes_pec = [
        ["Code", code],
        ["Wilaya", nom],
        ["PEC ELEC", props.PEC_ELEC],
        ["PEC GAZ", props.PEC_GAZ],
        ["Nouveau", props.nouveau]
    ];

    // 1er tableau
    remplirTableau("table-wilaya", lignes_zone);
    document.getElementById("table-wilaya").hidden = false;

    // 2ème tableau (correspond à votre id="table-wilaya-pec")
    remplirTableau("table-wilaya-pec", lignes_pec);
    document.getElementById("section-pec").hidden = false;
}


/*function displayTable(props) {
    console.log(props ) ; 
    const code = String(props.code ?? props.id).padStart(2, "0");
    const nom = props.name_fr.toLocaleUpperCase("fr-FR");

    document.getElementById("titre-wilaya").textContent = `Wilaya sélectionnée : ${code} ${nom}`;

    const lignes_zone  = [
        ["Code"  , code],
        ["Wilaya", nom],
        ["Zone (indicative)"  , props.zone],
        ["NAE"   , props.NAE],
        ["NAG"   , props.NAG],
        ["TAE (%)"   , props.TAE],
        ["TAG (%)"   , props.TAG],
        ["TPG (%)"   , props.TPG],
	    ["Niveau (0-3)", props.niveau]  ];
    const lignes_pec = [
        ["Date de la situation"  , props.date],
        ["Code"  , props.code],
        ["Wilaya"  , nom],
        ["PEC ELEC"   , props.PEC_ELEC],
        ["PEC GAZ "   , props.PEC_GAZ],
        ["Nouveau", props.nouveau]  ];
    const table = document.getElementById("table-wilaya");

    const tbody = table.tBodies[0];


    tbody.replaceChildren();
    for (const [libelle, valeur] of lignes_zone) {
        const ligne = tbody.insertRow();
        const titre = document.createElement("th");
        titre.scope = "row";
        titre.textContent = libelle;
        ligne.appendChild(titre);
        const cellule = ligne.insertCell();
        cellule.textContent = typeof valeur === "number"  ? formatNombre.format(valeur) : (valeur ?? "—");
    }
    table.hidden = false;

}*/



