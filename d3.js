// Ocean Surface Temperature Interactive Map
// CMIP6 MIROC6 Historical · 1990–2015 · Sea Surface Temperature (°C)

const oceanData = {
  "Arctic Ocean": { mean: -0.49, min: -1.77, max:  9.12 },
  "Southern Ocean (West)": { mean:  3.14, min: -1.76, max:  9.07 },
  "Southern Ocean (East)": { mean:  2.32, min: -1.29, max:  7.76 },
  "Indian Ocean (West)": { mean: 20.64, min:  3.85, max: 30.14 },
  "Indian Ocean (East)": { mean: 21.79, min:  3.84, max: 31.04 },
  "Tropical Atlantic Ocean": { mean: 26.06, min: 19.73, max: 30.25 },
  "Northwest Atlantic Ocean": { mean: 13.63, min: -0.39, max: 27.53 },
  "Northeast Atlantic Ocean": { mean: 14.17, min:  0.23, max: 23.75 },
  "South Atlantic Ocean": { mean: 14.34, min:  4.23, max: 25.09 },
  "Northwest Pacific Ocean": { mean: 13.93, min:  2.74, max: 30.53 },
  "Northeast Pacific Ocean": { mean: 12.88, min:  0.34, max: 28.39 },
  "Tropical Pacific Ocean": { mean: 26.63, min: 20.34, max: 30.80 },
  "South Pacific Ocean": { mean: 15.00, min:  4.00, max: 25.00 },
};

// Fixed classify_ocean — adds longitude bounds to Atlantic blocks
// so Pacific regions are no longer unreachable (bug in natalie.ipynb)
function classifyOcean(lat, lon) {
  if (lat > 66.5) return "Arctic Ocean";

  if (lat < -55) {
    if (lon >= 20 && lon < 160) return "Southern Ocean (East)";
    return "Southern Ocean (West)";
  }

  if (lat >= -55 && lat <= 23.5) {
    if (lon >= 20 && lon < 80)  return "Indian Ocean (West)";
    if (lon >= 80 && lon < 120) return "Indian Ocean (East)";
  }

  // Atlantic: lon -80 to 20 only (was missing lon bounds — caused Pacific to be unreachable)
  if (lat >= -23.5 && lat <= 23.5 && lon >= -80 && lon < 20) return "Tropical Atlantic Ocean";
  if (lat > 23.5 && lon >= -80 && lon < -40) return "Northwest Atlantic Ocean";
  if (lat > 23.5 && lon >= -40 && lon < 20)  return "Northeast Atlantic Ocean";
  if (lat >= -55 && lat < -23.5 && lon >= -80 && lon < 20) return "South Atlantic Ocean";

  // Pacific (now reachable)
  if (lat > 23.5) {
    if (lon < -80 || lon >= 120) return "Northwest Pacific Ocean";
    return "Northeast Pacific Ocean";
  }
  if (lat >= -23.5 && lat <= 23.5) return "Tropical Pacific Ocean";
  if (lat >= -55 && lat < -23.5)   return "South Pacific Ocean";

  return null;
}

// Region color map
const regionColors = {
  "Arctic Ocean": "#B5D4F4",
  "Southern Ocean (West)": "#85B7EB",
  "Southern Ocean (East)": "#85B7EB",
  "Indian Ocean (West)": "#EF9F27",
  "Indian Ocean (East)": "#E85D24",
  "Tropical Atlantic Ocean": "#E85D24",
  "Northwest Atlantic Ocean": "#9FE1CB",
  "Northeast Atlantic Ocean": "#9FE1CB",
  "South Atlantic Ocean": "#FAC775",
  "Northwest Pacific Ocean": "#5DCAA5",
  "Northeast Pacific Ocean": "#9FE1CB",
  "Tropical Pacific Ocean": "#E85D24",
  "South Pacific Ocean": "#FAC775",
};

//parsing the hex color to rgb
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r, g, b];
}

function drawMap() {
  const width = 960, height = 550;

  const container = d3.select("#map-container");

  // Canvas for ocean colors 
  const canvas = container.append("canvas")
    .attr("width", width)
    .attr("height", height)
    .style("position", "absolute")
    .style("top", 0).style("left", 0)
    .style("width", "100%");

  // SVG on top for countries, graticule, legend
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .style("position", "relative");
  const projection = d3.geoNaturalEarth1()
    .scale(153)
    .translate([width / 2, height / 2 + 25]);

  const pathGen = d3.geoPath().projection(projection);

  //draw ocean colors onto canvas pixel by pixel
  const ctx = canvas.node().getContext("2d");
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Build a graticule path to test if a pixel is inside the sphere
  const spherePath = pathGen({ type: "Sphere" });
  const sphereSvgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  sphereSvgEl.setAttribute("width", width);
  sphereSvgEl.setAttribute("height", height);
  const spherePathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
  spherePathEl.setAttribute("d", spherePath);
  sphereSvgEl.appendChild(spherePathEl);
  document.body.appendChild(sphereSvgEl);

  for (let px = 0; px < width; px++) {
    for (let py = 0; py < height; py++) {
      // Only paint pixels inside the globe sphere
      if (!spherePathEl.isPointInFill(DOMPointReadOnly.fromPoint({ x: px, y: py }))) continue;

      const coords = projection.invert([px, py]);
      if (!coords) continue;
      const [lon, lat] = coords;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

      const region = classifyOcean(lat, lon);
      if (!region || !regionColors[region]) continue;

      const [r, g, b] = hexToRgb(regionColors[region]);
      const idx = (py * width + px) * 4;
      data[idx]   = r;
      data[idx+1] = g;
      data[idx+2] = b;
      data[idx+3] = 180;
    }
  }

  document.body.removeChild(sphereSvgEl);
  ctx.putImageData(imageData, 0, 0);

  //svg layers
  // Sphere outline
  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("d", pathGen)
    .attr("fill", "none")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 1);

  svg.append("path")
    .datum(d3.geoGraticule()())
    .attr("d", pathGen)
    .attr("fill", "none")
    .attr("stroke", "#bcd")
    .attr("stroke-width", 0.3)
    .style("pointer-events", "none");

  const tooltip = d3.select("#tooltip");

  // countries + hover detection
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then(world => {
      svg.append("g")
        .selectAll("path")
        .data(topojson.feature(world, world.objects.countries).features)
        .join("path")
        .attr("d", pathGen)
        .attr("fill", "#f0ede8")
        .attr("stroke", "#bbb")
        .attr("stroke-width", 0.4)
        .style("pointer-events", "none");
    });

  // invisible sphere overlay for mouse tracking
  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("d", pathGen)
    .attr("fill", "transparent")
    .attr("stroke", "none")
    .style("cursor", "crosshair")
    .on("mousemove", function(event) {
      const [mx, my] = d3.pointer(event);
      const coords = projection.invert([mx, my]);
      if (!coords) { tooltip.style("display", "none"); return; }

      const [lon, lat] = coords;
      const region = classifyOcean(lat, lon);
      if (!region || !oceanData[region]) { tooltip.style("display", "none"); return; }

      const d = oceanData[region];
      tooltip
        .style("display", "block")
        .html(`
          <div class="tooltip-title">${region}</div>
          <div class="tooltip-row">
            <span class="label">Mean</span>
            <span class="value mean">${d.mean.toFixed(1)}°C</span>
          </div>
          <div class="tooltip-row">
            <span class="label">Min</span>
            <span class="value cold">${d.min.toFixed(1)}°C</span>
          </div>
          <div class="tooltip-row">
            <span class="label">Max</span>
            <span class="value hot">${d.max.toFixed(1)}°C</span>
          </div>
        `);

      const [bmx, bmy] = d3.pointer(event, document.body);
      const tx = bmx + 16 + 180 > window.innerWidth ? bmx - 196 : bmx + 16;
      const ty = Math.max(bmy - 20, 8);
      tooltip.style("left", tx + "px").style("top", ty + "px");
    })
    .on("mouseleave", () => tooltip.style("display", "none"));

  // legend
  const legendItems = [
    { label: "< 2°C",    color: "#B5D4F4" },
    { label: "2–8°C",    color: "#85B7EB" },
    { label: "8–15°C",   color: "#9FE1CB" },
    { label: "15–20°C",  color: "#5DCAA5" },
    { label: "20–24°C",  color: "#FAC775" },
    { label: "24–27°C",  color: "#EF9F27" },
    { label: "> 27°C",   color: "#E85D24" },
  ];

  const legend = svg.append("g").attr("transform", "translate(20, 540)");
  legend.append("rect")
    .attr("x", -8).attr("y", -16)
    .attr("width", legendItems.length * 82 + 8).attr("height", 30)
    .attr("rx", 5).attr("fill", "white").attr("opacity", 0.85)
    .attr("stroke", "#ccc").attr("stroke-width", 0.5);

  legendItems.forEach(({ label, color }, i) => {
    legend.append("rect").attr("x", i*82).attr("y", -10).attr("width", 14).attr("height", 14).attr("rx", 3).attr("fill", color);
    legend.append("text").attr("x", i*82+18).attr("y", 2).style("font-size", "11px").style("fill", "#555").text(label);
  });
}

drawMap();