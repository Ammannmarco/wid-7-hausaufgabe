// Importiert Funktionen und Komponenten, die wir für die App benötigen
import { renderToString } from "react-dom/server"; // Konvertiert JSX in einen HTML-String für Leaflet-Popups
import {
  CssBaseline,
  Link,
  Typography,
  Button,
  Stack,
  Box,
} from "@mui/material"; // Material-UI-Komponenten für das Styling und Layout
import { useEffect, useState } from "react"; // React-Hooks für Zustand (State) und Nebenwirkungen (Effects)
import L from "leaflet"; // Leaflet-Bibliothek für die Kartendarstellung
import { MapContainer, TileLayer, GeoJSON, LayersControl } from "react-leaflet"; // Leaflet-Komponenten für React, z.B. Karte und Layer-Steuerung
import Header from "./Header"; // Eigene Header-Komponente für die App
import { BASE_LAYERS } from "./baseLayers"; // Array mit Basiskarteninformationen, definiert in einer separaten Datei

// Grenzen für die Karte (Outer Bounds), um die Ansicht auf die Weltkarte zu beschränken
const OUTER_BOUNDS = [
  [-80, -180], // Südwestlicher Punkt
  [80, 180], // Nordöstlicher Punkt
];

// Basis-URL für die USGS-API, die Erdbebendaten bereitstellt
const BASE_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/";

// Funktion zur Berechnung des Radius eines Markers basierend auf der Magnitude eines Erdbebens
function getMarkerRadius(magnitude) {
  const baseArea = 10; // Basisfläche des Markers, um eine Grundgröße zu definieren
  const scaleFactor = 2.5; // Skalierungsfaktor, um den Radius entsprechend der Magnitude zu berechnen
  const area = baseArea * Math.pow(10, (magnitude - 1) / scaleFactor); // Berechnung der Fläche basierend auf Magnitude und Skalierungsfaktor
  return Math.sqrt(area / Math.PI); // Radius basierend auf Fläche (Kreisfläche = π * Radius²)
}

// Funktion zur Darstellung eines Punktes als Marker auf der Karte
const pointToLayer = ({ properties }, latlng) => {
  const radius = getMarkerRadius(properties.mag); // Radius des Markers, abhängig von der Magnitude
  return L.circleMarker(latlng, { radius: radius, color: "red" }); // Erstellt einen roten Kreis-Marker an der angegebenen Position
};

// Funktion zur Erstellung von Popups für jedes Feature (Erdbebenpunkt) auf der Karte
const onEachFeature = (feature, layer) => {
  if (feature.properties && feature.properties.place) {
    // Wenn das Feature einen Ort hat
    const popup = <Popup {...feature} />; // Erzeugt ein Popup mit den Erdbebeninformationen
    layer.bindPopup(renderToString(popup)); // Bindet das Popup an den Marker und rendert es als HTML
  }
};

// Popup-Komponente zur Anzeige von Erdbebeninformationen in einem Popup-Fenster
function Popup({ properties, geometry }) {
  const [lon, lat, depth] = geometry.coordinates; // Extrahiert Längen-, Breitengrad und Tiefe des Erdbebens

  return (
    <>
      <Typography variant="h2">{properties.place}</Typography>{" "}
      {/* Titel des Popups mit dem Ort */}
      <p>
        {/* Erdbebeninformationen wie Magnitude, Tiefe, Typ und Koordinaten */}
        <span style={{ fontWeight: "bold" }}>MAGNITUDE</span>: {properties.mag}
        <br />
        <span style={{ fontWeight: "bold" }}>DEPTH</span>: {depth} km
        <br />
        <span style={{ fontWeight: "bold" }}>TYPE</span>: {properties.type}
        <br />
        <span style={{ fontWeight: "bold" }}>Lon/Lat</span>: {lon}, {lat}
      </p>
      <Typography variant="h3">
        {/* Link zu weiteren Informationen zum Erdbeben */}
        <Link variant="h3" target="_blank" href={properties.url}>
          More info
        </Link>
      </Typography>
    </>
  );
}

// Hauptkomponente für die Karte
function Map() {
  // State-Variablen zur Speicherung der GeoJSON-Daten der Erdbeben, Mindest-Magnitude und Zeitspanne
  const [quakesJson, setQuakesJson] = useState([]); // Zustand für Erdbebendaten im GeoJSON-Format
  const [minMag, setMinMag] = useState("2.5"); // Zustand für die Mindest-Magnitude (Filter)
  const [timespan, setTimespan] = useState("week"); // Zustand für das Zeitintervall (Filter)

  // Asynchrone Funktion zum Abrufen der Erdbebendaten von der API
  async function fetchQuakeData(url) {
    try {
      const resp = await fetch(url); // Abrufen der Daten von der API
      if (!resp.ok) {
        throw new Error(`Error fetching data from ${url}`); // Fehler, falls Abruf fehlschlägt
      }
      const data = await resp.json(); // Konvertierung der JSON-Antwort in ein JavaScript-Objekt
      setQuakesJson(data.features); // Speichern der Erdbebendaten im Zustand `quakesJson`
    } catch (error) {
      console.log(error); // Ausgabe des Fehlers in der Konsole
    }
  }

  // useEffect-Hook, um die Erdbebendaten neu zu laden, wenn `minMag` oder `timespan` sich ändern
  useEffect(() => {
    const url = `${BASE_URL}/${minMag}_${timespan}.geojson`; // Dynamisch generierte URL basierend auf den Filtern
    fetchQuakeData(url); // Daten abrufen
  }, [minMag, timespan]); // Abhängigkeiten, die den Hook bei Änderungen auslösen

  return (
    <>
      <CssBaseline />{" "}
      {/* Basis-Styles von Material-UI für einheitliche Darstellung */}
      <Header /> {/* Header-Komponente für den oberen Teil der App */}
      {/* Filterkomponente für Magnitude und Zeitintervall */}
      <Box display="flex" justifyContent="center" padding={2}>
        <Stack direction="row" spacing={4} alignItems="center">
          {/* Filter für die Magnitude */}
          <Stack alignItems="center">
            <Typography variant="h6">Stärke</Typography>{" "}
            {/* Überschrift für den Magnitude-Filter */}
            <Stack direction="row" spacing={1} justifyContent="center">
              {/* Buttons für die Magnitude-Filter */}
              {["all", "1.0", "2.5", "4.5", "significant"].map((magnitude) => (
                <Button
                  key={magnitude} // Eindeutiger Schlüssel für jeden Button
                  variant={minMag === magnitude ? "contained" : "outlined"} // Hervorhebung des aktiven Buttons
                  onClick={() => setMinMag(magnitude)} // Klick-Handler, um `minMag` Zustand zu aktualisieren
                  disabled={
                    timespan === "month" &&
                    (magnitude === "all" || magnitude === "1.0")
                  }
                  // Deaktiviert die Optionen "ALL" und "M1.0+" für "month"
                >
                  {magnitude === "all" ? "ALL" : `${magnitude}+`}{" "}
                  {/* Beschriftung des Buttons */}
                </Button>
              ))}
            </Stack>
          </Stack>

          {/* Filter für das Zeitintervall */}
          <Stack alignItems="center">
            <Typography variant="h6">Zeitintervall</Typography>{" "}
            {/* Überschrift für den Zeitintervall-Filter */}
            <Stack direction="row" spacing={1} justifyContent="center">
              {/* Buttons für die Zeitintervall-Filter */}
              {["hour", "day", "week", "month"].map((intervall) => (
                <Button
                  key={intervall} // Eindeutiger Schlüssel für jeden Button
                  variant={timespan === intervall ? "contained" : "outlined"} // Hervorhebung des aktiven Buttons
                  onClick={() => setTimespan(intervall)} // Klick-Handler, um `timespan` Zustand zu aktualisieren
                >
                  {intervall === "hour"
                    ? "LAST HOUR"
                    : intervall === "day"
                    ? "LAST DAY"
                    : intervall === "week"
                    ? "LAST 7 DAYS"
                    : "LAST 30 DAYS"}{" "}
                  {/* Beschriftung des Buttons */}
                </Button>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Box>
      {/* Hauptkomponente für die Kartendarstellung */}
      <MapContainer
        style={{ height: "100vh" }} // Festlegung der Höhe der Karte auf 100% der Bildschirmhöhe
        center={[0, 0]} // Anfangszentrum der Karte auf den Nullpunkt
        zoom={3} // Anfangs-Zoomstufe
        minZoom={2} // Minimale Zoomstufe
        maxBounds={OUTER_BOUNDS} // Grenzen der Karte, um die Ansicht auf die Weltkarte zu beschränken
        maxBoundsViscosity={1} // Begrenzung der Karte auf definierte Bounds
      >
        <LayersControl position="topright">
          {" "}
          {/* Kontrollelement für die Ebenen */}
          {/* Hinzufügen der Basiskarten aus `BASE_LAYERS` */}
          {BASE_LAYERS.map((baseLayer) => (
            <LayersControl.BaseLayer
              key={baseLayer.url} // Eindeutiger Schlüssel für jede Basiskarte
              checked={baseLayer.checked} // Standardmäßig aktivierte Basiskarte
              name={baseLayer.name} // Name der Basiskarte
            >
              <TileLayer
                attribution={baseLayer.attribution} // Quellenangabe der Basiskarte
                url={baseLayer.url} // URL der Basiskartenkacheln
              />
            </LayersControl.BaseLayer>
          ))}
          {/* Overlay für die Erdbeben-Daten */}
          <LayersControl.Overlay checked name="USGS Earthquakes">
            <GeoJSON
              data={quakesJson} // Erdbeben-GeoJSON-Daten
              pointToLayer={pointToLayer} // Funktion zur Darstellung jedes Punktes
              key={quakesJson.length} // Eindeutiger Schlüssel für Re-Rendering bei Datenänderung
              onEachFeature={onEachFeature} // Popup-Funktion für jedes Erdbeben
            />
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </>
  );
}

export default Map;
