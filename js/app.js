(async function () {
  ("use strict");

  // ------------------------------
  // Utility Functions and Globals
  // ------------------------------

  // Spinner functions
  const spinner = document.querySelector(".spinner-container");
  function showSpinner() {
    spinner.style.display = "flex";
  }
  function hideSpinner() {
    spinner.style.display = "none";
  }

  // Filter Variables
  let mannerFilter = null;
  let modeFilter = null;
  let currentTimeRange = [0, 2359]; // Default to "All Crashes" range

  // Global variable to store the currently filtered crash data.
  let currentFilteredData = [];

  // Layer properties for crash severities
  const layerProps = [
    {
      id: "K",
      text: "Fatal Crash (K)",
      color: "#15252e",
      size: 12,
      checked: true,
    },
    {
      id: "A",
      text: "Serious Injury Crash (A)",
      color: "#294a5b",
      size: 10,
      checked: true,
    },
    {
      id: "B",
      text: "Minor Injury Crash (B)",
      color: "#5294b6",
      size: 7.5,
      checked: true,
    },
    {
      id: "C",
      text: "Possible Injury Crash (C)",
      color: "#a9cadb",
      size: 6,
      checked: true,
    },
    {
      id: "O",
      text: "Property Damage Only (O)",
      color: "#d4e4ed",
      size: 4,
      checked: true,
    },
  ];

  // Manner of Collision mapping
  const mannerOfCollisionMapping = {
    ANGLE: "Angle",
    BACKING: "Backing",
    "HEAD ON": "Head On",
    "OPPOSING LEFT TURN": "Opposing Left Turn",
    "REAR END": "Rear End",
    "REAR TO REAR": "Rear to Rear",
    "SIDESWIPE-OPPOSITE DIRECTION": "Sideswipe-Opposite Direction",
    "SIDESWIPE-SAME DIRECTION": "Sideswipe-Same Direction",
    "SINGLE VEHICLE": "Single Vehicle",
  };

  // Mode mapping
  const modeMapping = {
    Bicyclists: ["Bicyclist"],
    Pedestrians: ["Pedestrian"],
    Motorcyclists: ["Motorcyclist"],
    "Intersection Crashes": ["Intersection Crash"],
    "Motor Vehicles": ["Motor Vehicles"],
  };

  // Time groups for slider
  const timeGroups = [
    { label: "All Crashes", range: [0, 2359] },
    { label: "12:00 AM - 2:59 AM", range: [0, 259] },
    { label: "3:00 AM - 5:59 AM", range: [300, 559] },
    { label: "6:00 AM - 8:59 AM", range: [600, 859] },
    { label: "9:00 AM - 11:59 AM", range: [900, 1159] },
    { label: "12:00 PM - 2:59 PM", range: [1200, 1459] },
    { label: "3:00 PM - 5:59 PM", range: [1500, 1759] },
    { label: "6:00 PM - 8:59 PM", range: [1800, 2059] },
    { label: "9:00 PM - 11:59 PM", range: [2100, 2359] },
  ];

  // ------------------------------
  // DOM Elements & Dropdown Population
  // ------------------------------
  const dropdown = document.getElementById("collision-filter");
  const modeDropdown = document.getElementById("mode-filter");
  const slider = document.getElementById("slider-controls");
  const sliderLabel = document.getElementById("slider-label");

  // Populate the collision dropdown
  Object.entries(mannerOfCollisionMapping).forEach(([key, value]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = value;
    dropdown.appendChild(option);
  });

  // ------------------------------
  // Map Initialization
  // ------------------------------
  const mapOptions = {
    zoomSnap: 0.1,
    center: [37.839, -82.27],
    zoom: 14,
  };
  const map = L.map("map", mapOptions);
  // Create panes for ordering layers
  const setPanes = ["bottom", "middle", "top"];
  setPanes.forEach((pane, i) => {
    map.createPane(pane);
    map.getPane(pane).style.zIndex = 401 + i;
  });

  // Add base tile layers
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Imagery &copy; Esri",
      opacity: 0.8,
    }
  ).addTo(map);

  // label tiles
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PEC',
      pane: "top",
    }
  ).addTo(map);

  // add scale to map
  L.control.scale().addTo(map);

  // ------------------------------
  // Data Filtering and Rendering Functions
  // ------------------------------
  function timeFilter(filteredData, timeRange) {
    return filteredData.filter((row) => {
      const crashTime = parseInt(row.CollisionTime, 10);
      return crashTime >= timeRange[0] && crashTime <= timeRange[1];
    });
  }

  function renderCrashes(data, crashLayers, mannerFilter, modeFilter) {
    Object.values(crashLayers).forEach((layerGroup) =>
      layerGroup.clearLayers()
    );
    data.forEach((row) => {
      const lat = parseFloat(row.Latitude);
      const lng = parseFloat(row.Longitude);
      const kabco = row.KABCO;
      if (isNaN(lat) || isNaN(lng)) return;
      const layerProp = layerProps.find((p) => p.id === kabco);
      if (!layerProp) return;
      if (mannerFilter && row.MannerofCollision !== mannerFilter) return;
      if (
        modeFilter &&
        !modeMapping[modeFilter].some((factor) => row[factor] === "1")
      )
        return;

      const popupContent = `
          <u>KABCO</u>: ${layerProp.text}<br>
          <u>Manner of Collision</u>: ${
            mannerOfCollisionMapping[row.MannerofCollision]
          }<br>
        `;
      const marker = L.circleMarker([lat, lng], {
        radius: layerProp.size,
        fillColor: layerProp.color,
        color: "#444",
        weight: 0.5,
        opacity: 1,
        fillOpacity: 1,
        pane: "top",
      });
      marker.bindPopup(popupContent);
      marker.on("mouseover", function () {
        this.setStyle({
          color: "#00ffff",
          weight: 2,
          radius: layerProp.size + 2,
        });
      });
      marker.on("mouseout", function () {
        this.setStyle({ color: "#444", weight: 0.5, radius: layerProp.size });
      });
      crashLayers[kabco].addLayer(marker);
    });
  }

  // Helper function to animate number counting.
  function animateCount(element, start, end, duration) {
    let startTime = null;
    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const current = Math.floor(start + (end - start) * (progress / duration));
      element.textContent = current.toLocaleString();
      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = end.toLocaleString();
      }
    }
    requestAnimationFrame(animate);
  }

  // ------------------------------
  // Main Data Loading & Rendering
  // ------------------------------
  async function fetchData() {
    showSpinner();

    // Load crash CSV and various GeoJSON files using await
    const [crashData, county] = await Promise.all([
      d3.csv("data/crash-data-2020-2024.csv"),
      d3.json("data/campbell-co.geojson"),
    ]);

    // Filter crash data
    // const filteredData = crashData.filter(
    //   (row) => row.ParkingLotIndicator !== "Y" && row.CityCrash == 1
    // );
    const filteredData = crashData;

    // Initialize crashLayers and layersLabels for crash severities
    const crashLayers = {};
    const layersLabels = {};

    // define our county geojson and style it
    const countyLayer = L.geoJSON(county, {
      style: function (feature) {
        return { color: "#ffff00", weight: 4, fillOpacity: 0 };
      },
    }).addTo(map);

    // define the bounds to the county layer
    const bounds = countyLayer.getBounds();

    // set a maximum bounds to the bound variable
    // map.setMaxBounds(bounds);
    map.fitBounds(bounds, { padding: [25, 25] });

    // Process the data
    filteredData.forEach((row) => {
      if (!["K", "A", "B", "C", "O"].includes(row.KABCO)) {
        row.KABCO = "O";
      }
      if (
        !Object.keys(mannerOfCollisionMapping).includes(row.MannerofCollision)
      ) {
        row.MannerofCollision = "UNKNOWN";
      }
    });

    // Build crashLayers and legend labels for crash severities (with counts)
    layerProps.forEach((prop) => {
      crashLayers[prop.id] = L.layerGroup().addTo(map);
      const count = filteredData.filter((row) => row.KABCO === prop.id).length;
      const maxSize = Math.max(...layerProps.map((p) => p.size));
      const margin = maxSize - prop.size;
      const circleSymbol = `<span style="display:inline-block; width:${
        prop.size * 2
      }px; height:${prop.size * 2}px; background-color:${
        prop.color
      }; border: 0.1px solid #444; border-radius:50%; margin-left:${margin}px; margin-right:${
        margin + 5
      }px; vertical-align: middle; line-height: 0;"></span>`;
      // Notice the span with id is used for dynamic updates.
      const labelHTML = `<span class="legend-text" style="color:${
        prop.color
      }; display:inline-block;">
        ${circleSymbol}${prop.text} (<span id="count-${
        prop.id
      }">${count.toLocaleString()}</span>)
      </span>`;
      layersLabels[labelHTML] = crashLayers[prop.id];
    });

    // Render crashes initially and set currentFilteredData to full filteredData.
    currentFilteredData = filteredData;
    renderCrashes(currentFilteredData, crashLayers, null, null);

    // ------------------------------
    // Dynamic Legend Update Functions
    // ------------------------------

    // Function to update the KABCO counts for crashes dynamically.
    // Uses currentFilteredData instead of the full dataset.
    function updateCrashLegend() {
      layerProps.forEach((prop) => {
        const countElem = document.getElementById(`count-${prop.id}`);
        if (!countElem) return;
        const newCount = map.hasLayer(crashLayers[prop.id])
          ? currentFilteredData.filter((row) => row.KABCO === prop.id).length
          : 0;

        // Start the animation after a 300ms delay.
        setTimeout(() => {
          // Animate from 0 to newCount over 600ms.
          animateCount(countElem, 0, newCount, 300);
        }, 50);
      });
    }

    // ------------------------------
    // Legend Injection & Toggle Setup
    // ------------------------------
    const legendDiv = document.getElementById("legend");
    const legendKeys = Object.keys(layersLabels);
    let legendHTML = `<div class="legend-items" style="text-align: left;">`;
    legendKeys.forEach((key, i) => {
      if (layersLabels[key]) {
        legendHTML += `<div class="legend-item" data-index="${i}" style="margin: 5px 0; cursor: pointer;">
                          ${key}
                        </div>`;
      } else {
        legendHTML += `<div class="legend-item" style="margin: 5px 0;">
                          ${key}
                        </div>`;
      }
    });
    legendHTML += `</div>`;
    legendDiv.innerHTML = legendHTML;

    // Add toggle functionality for legend items that represent layers
    const legendItems = legendDiv.querySelectorAll(".legend-item[data-index]");
    legendItems.forEach((item) => {
      const index = item.getAttribute("data-index");
      const key = legendKeys[index];
      const layer = layersLabels[key];
      // Check if this legend item is for a crash layer (KABCO) by looking for "count-" in its HTML.
      const isCrashLayer = key.indexOf("count-") !== -1;

      if (!map.hasLayer(layer)) {
        item.style.opacity = "0.4";
      } else {
        item.style.opacity = "1";
      }
      item.addEventListener("click", function () {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
          item.style.opacity = "0.4";
          // If this is a crash layer, update its count immediately to 0.
          if (isCrashLayer) {
            // Extract the KABCO id using a regex.
            const match = key.match(/id="count-([^"]+)"/);
            if (match) {
              const crashId = match[1];
              const countElem = document.getElementById(`count-${crashId}`);
              if (countElem) countElem.textContent = "0";
            }
          }
        } else {
          map.addLayer(layer);
          item.style.opacity = "1";
          // Only animate the count for this crash layer.
          if (isCrashLayer) {
            const match = key.match(/id="count-([^"]+)"/);
            if (match) {
              const crashId = match[1];
              const countElem = document.getElementById(`count-${crashId}`);
              if (countElem) {
                const newCount = currentFilteredData.filter(
                  (row) => row.KABCO === crashId
                ).length;
                // Animate after a 300ms delay.
                setTimeout(() => {
                  animateCount(countElem, 0, newCount, 300);
                }, 50);
              }
            }
          }
        }
      });
    });

    // ------------------------------
    // Filter Event Listeners
    // ------------------------------

    // Slider event listener
    slider.addEventListener("input", function (e) {
      const index = e.target.value;
      currentTimeRange = timeGroups[index].range;
      sliderLabel.textContent = timeGroups[index].label;
      const filteredByTime = timeFilter(filteredData, currentTimeRange);
      const filtered = filteredByTime.filter((row) => {
        if (mannerFilter && row.MannerofCollision !== mannerFilter)
          return false;
        if (
          modeFilter &&
          !modeMapping[modeFilter].some((factor) => row[factor] === "1")
        )
          return false;
        return true;
      });
      currentFilteredData = filtered;
      renderCrashes(currentFilteredData, crashLayers);
      updateCrashLegend();
    });

    // Dropdown event listener (for collision filter)
    dropdown.addEventListener("change", (e) => {
      mannerFilter = e.target.value;
      const filteredByTime = timeFilter(filteredData, currentTimeRange);
      const filtered = filteredByTime.filter((row) => {
        return (
          (!mannerFilter || row.MannerofCollision === mannerFilter) &&
          (!modeFilter ||
            modeMapping[modeFilter].some((factor) => row[factor] === "1"))
        );
      });
      currentFilteredData = filtered;
      renderCrashes(currentFilteredData, crashLayers);
      updateCrashLegend();
    });

    // Mode dropdown event listener
    modeDropdown.addEventListener("change", (e) => {
      modeFilter = e.target.value;
      const filteredByTime = timeFilter(filteredData, currentTimeRange);
      const filtered = filteredByTime.filter((row) => {
        return (
          (!mannerFilter || row.MannerofCollision === mannerFilter) &&
          (!modeFilter ||
            modeMapping[modeFilter].some((factor) => row[factor] === "1"))
        );
      });
      currentFilteredData = filtered;
      renderCrashes(currentFilteredData, crashLayers);
      updateCrashLegend();
    });

    // Call updateCrashLegend once after initial load.
    updateCrashLegend();

    hideSpinner();
  }

  fetchData();
})();
