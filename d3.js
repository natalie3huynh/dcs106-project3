// Ocean Surface Temperature Interactive Map
// CMIP6 MIROC6 Historical · 1990–2015 · Sea Surface Temperature (°C)

let _ctx, _width, _height, _projection;

const oceanData = {
  "Arctic Ocean": { mean: -0.49, min: -1.77, max: 9.12 },
  "Southern Ocean (West)": { mean: 3.14, min: -1.76, max: 9.07 },
  "Southern Ocean (East)": { mean: 2.32, min: -1.29, max: 7.76 },
  "Indian Ocean (West)": { mean: 20.64, min: 3.85, max: 30.14 },
  "Indian Ocean (East)": { mean: 21.79, min: 3.84, max: 31.04 },
  "Tropical Atlantic Ocean": { mean: 26.06, min: 19.73, max: 30.25 },
  "Northwest Atlantic Ocean": { mean: 13.63, min: -0.39, max: 27.53 },
  "Northeast Atlantic Ocean": { mean: 14.17, min: 0.23, max: 23.75 },
  "South Atlantic Ocean": { mean: 14.34, min: 4.23, max: 25.09 },
  "Northwest Pacific Ocean": { mean: 13.93, min: 2.74, max: 30.53 },
  "Northeast Pacific Ocean": { mean: 12.88, min: 0.34, max: 28.39 },
  "Tropical Pacific Ocean": { mean: 26.63, min: 20.34, max: 30.80 },
  "South Pacific Ocean": { mean: 15.00, min: 4.00, max: 25.00 },
};

const historicalData = {
  "Arctic Ocean": { min: -1.78, mean: -0.68, max: 8.67 },
  "Southern Ocean (West)": { mean: 3.24, min: -1.77, max: 9.18 },
  "Southern Ocean (East)": { mean: 2.27, min: -1.41, max: 7.70 },
  "Indian Ocean (West)": { mean: 20.42, min: 3.68, max: 29.92 },
  "Indian Ocean (East)": { mean: 21.52, min: 3.62, max: 30.98 },
  "Tropical Atlantic Ocean": { mean: 25.89, min: 19.54, max: 30.10 },
  "Northwest Atlantic Ocean": { mean: 13.12, min: -0.97, max: 27.31 },
  "Northeast Atlantic Ocean": { mean: 13.80, min: -0.04, max: 23.39 },
  "South Atlantic Ocean": { mean: 14.18, min: 4.18, max: 24.87 },
  "Northwest Pacific Ocean": { mean: 13.50, min: 13.50, max: 30.37 },
  "Northeast Pacific Ocean": { mean: 12.71, min: -0.13, max: 28.13 },
  "Tropical Pacific Ocean": { mean: 26.61, min: 20.41, max: 30.58 },
  "South Pacific Ocean": { mean: 14.89, min: 4.05, max: 25.02 },
};

const deltaColorScale = d3.scaleLinear()
  .domain([-0.1, 0, 0.51])
  .range(["#4a90d9", "#f5f5f5", "#d94a1e"])
  .clamp(true);

function classifyOcean(lat, lon) {

  if (lat > 66.5) return "Arctic Ocean";

  if (lat < -55) {
    if (lon >= 20 && lon < 160)
      return "Southern Ocean (East)";
    return "Southern Ocean (West)";
  }

  if (lat >= -55 && lat <= 23.5) {
    if (lon >= 20 && lon < 80)
      return "Indian Ocean (West)";
    if (lon >= 80 && lon < 120)
      return "Indian Ocean (East)";
  }

  if (
    lat >= -23.5 &&
    lat <= 23.5 &&
    lon >= -80 &&
    lon < 20
  ) {
    return "Tropical Atlantic Ocean";
  }

  if (lat > 23.5 && lon >= -80 && lon < -40)
    return "Northwest Atlantic Ocean";

  if (lat > 23.5 && lon >= -40 && lon < 20)
    return "Northeast Atlantic Ocean";

  if (
    lat >= -55 &&
    lat < -23.5 &&
    lon >= -80 &&
    lon < 20
  ) {
    return "South Atlantic Ocean";
  }

  if (lat > 23.5) {
    if (lon < -80 || lon >= 120)
      return "Northwest Pacific Ocean";

    return "Northeast Pacific Ocean";
  }

  if (lat >= -23.5 && lat <= 23.5)
    return "Tropical Pacific Ocean";

  if (lat >= -55 && lat < -23.5)
    return "South Pacific Ocean";

  return null;
}

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

function hexToRgb(color) {

  // supports rgb(...) returned by d3 scales
  if (color.startsWith("rgb")) {
    return color.match(/\d+/g).map(Number);
  }

  // supports hex colors
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16)
  ];
}

function redrawCanvas(
  ctx,
  width,
  height,
  projection,
  useCompare
) {

  const imageData =
    ctx.createImageData(width, height);

  const data = imageData.data;

  const sphereSvgEl =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );

  sphereSvgEl.setAttribute("width", width);
  sphereSvgEl.setAttribute("height", height);

  const spherePathEl =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );

  const pathGen =
    d3.geoPath().projection(projection);

  spherePathEl.setAttribute(
    "d",
    pathGen({ type: "Sphere" })
  );

  sphereSvgEl.appendChild(spherePathEl);
  document.body.appendChild(sphereSvgEl);

  for (let px = 0; px < width; px++) {

    for (let py = 0; py < height; py++) {

      if (
        !spherePathEl.isPointInFill(
          DOMPointReadOnly.fromPoint({
            x: px,
            y: py
          })
        )
      ) continue;

      const coords =
        projection.invert([px, py]);

      if (!coords) continue;

      const [lon, lat] = coords;

      if (
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) continue;

      const region =
        classifyOcean(lat, lon);

      if (!region) continue;

      let color;

      if (
        useCompare &&
        oceanData[region] &&
        historicalData[region]
      ) {

        const delta =
          oceanData[region].mean -
          historicalData[region].mean;

        color = deltaColorScale(delta);

      } else {

        color = regionColors[region];
      }

      if (!color) continue;

      const [r, g, b] =
        hexToRgb(color);

      const idx =
        (py * width + px) * 4;

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 230;
    }
  }

  document.body.removeChild(sphereSvgEl);

  ctx.putImageData(imageData, 0, 0);
}

function drawMap() {

  const width = 960;
  const height = 550;

  _width = width;
  _height = height;

  const container =
    d3.select("#map-container");

  const canvas =
    container.append("canvas")
      .attr("width", width)
      .attr("height", height)
      .style("position", "absolute")
      .style("top", 0)
      .style("left", 0)
      .style("width", "100%");

  const svg =
    container.append("svg")
      .attr(
        "viewBox",
        `0 0 ${width} ${height}`
      )
      .attr("width", "100%")
      .style("position", "relative");

  const projection =
    d3.geoNaturalEarth1()
      .scale(153)
      .translate([
        width / 2,
        height / 2 + 25
      ]);

  _projection = projection;

  const pathGen =
    d3.geoPath().projection(projection);

  const ctx =
    canvas.node().getContext("2d");

  _ctx = ctx;

  let isCompareMode = false;

  // initial draw
  redrawCanvas(
    ctx,
    width,
    height,
    projection,
    false
  );

  // sphere border
  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("d", pathGen)
    .attr("fill", "none")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 1);

  // graticule
  svg.append("path")
    .datum(d3.geoGraticule()())
    .attr("d", pathGen)
    .attr("fill", "none")
    .attr("stroke", "#bcd")
    .attr("stroke-width", 0.3)
    .style("pointer-events", "none");

  // countries
  d3.json(
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
  ).then(world => {

    svg.append("g")
      .selectAll("path")
      .data(
        topojson.feature(
          world,
          world.objects.countries
        ).features
      )
      .join("path")
      .attr("d", pathGen)
      .attr("fill", "#f0ede8")
      .attr("stroke", "#bbb")
      .attr("stroke-width", 0.4)
      .style("pointer-events", "none");
  });

  const legendItems = [
    { label: "< 2°C", color: "#B5D4F4" },
    { label: "2–8°C", color: "#85B7EB" },
    { label: "8–15°C", color: "#9FE1CB" },
    { label: "15–20°C", color: "#5DCAA5" },
    { label: "20–24°C", color: "#FAC775" },
    { label: "24–27°C", color: "#EF9F27" },
    { label: "> 27°C", color: "#E85D24" },
  ];

  const deltaLegendItems = [
    { label: "−0.1°C", color: "#4a90d9" },
    { label: "0°C", color: "#f5f5f5" },
    { label: "+0.2°C", color: "#f0b48a" },
    { label: "+0.35°C", color: "#e07040" },
    { label: "+0.51°C", color: "#d94a1e" },
  ];

  const legend =
    svg.append("g")
      .attr(
        "transform",
        "translate(20, 540)"
      );

  const legendBg =
    legend.append("rect")
      .attr("x", -8)
      .attr("y", -16)
      .attr(
        "width",
        legendItems.length * 82 + 8
      )
      .attr("height", 30)
      .attr("rx", 5)
      .attr("fill", "white")
      .attr("opacity", 0.85)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 0.5);

  const legendSwatches =
    legend.append("g");

  function renderLegend(items) {

    legendSwatches.selectAll("*").remove();

    legendBg.attr(
      "width",
      items.length * 82 + 8
    );

    items.forEach(
      ({ label, color }, i) => {

        legendSwatches.append("rect")
          .attr("x", i * 82)
          .attr("y", -10)
          .attr("width", 14)
          .attr("height", 14)
          .attr("rx", 3)
          .attr("fill", color);

        legendSwatches.append("text")
          .attr("x", i * 82 + 18)
          .attr("y", 2)
          .style("font-size", "11px")
          .style("fill", "#555")
          .text(label);
      }
    );
  }

  renderLegend(legendItems);

const boxPadding = 40;
const boxWidth = width - boxPadding * 2;
const boxHeight = 58;

const titleBox = svg.append("rect")
  .attr("x", boxPadding)
  .attr("y", 6)
  .attr("width", boxWidth)
  .attr("height", boxHeight)
  .attr("rx", 12)
  .attr("ry", 12) // helps enforce rounding in all browsers
  .style("fill", "black")
  .style("stroke", "#333")
  .style("stroke-width", 1);
const compareTitle = svg.append("text")
  .attr("x", width / 2)
  .attr("y", 28)
  .attr("text-anchor", "middle")
  .style("font-size", "18px")
  .style("fill", "white")
  .style("display", "none");

compareTitle.append("tspan")
  .attr("x", width / 2)
  .text("Difference in Mean Sea Temperature (°C): 1990–2015, a major warming period, ");

compareTitle.append("tspan")
  .attr("x", width / 2)
  .attr("dy", "1.2em")
  .text(" vs. 1950–1989, the beginning of modern ocean temperature recording.");

const mainTitle = svg.append("text")
  .attr("x", width / 2)
  .attr("y", 28)
  .attr("text-anchor", "middle")
  .style("font-size", "18px")
  .style("fill", "white")
  .text("Sea Surface Temperature (°C): 1990–2015 Mean");

  document
    .getElementById("toggle-btn")
    .addEventListener("click", () => {

      isCompareMode =
        !isCompareMode;

      document.getElementById(
        "toggle-btn"
      ).textContent =
        isCompareMode
          ? "Show Present"
          : "Show Δ Change";
          redrawCanvas(_ctx, _width, _height, _projection, isCompareMode);
  renderLegend(isCompareMode ? deltaLegendItems : legendItems);
  compareTitle.style("display", isCompareMode ? null : "none");
  mainTitle.style("display", isCompareMode ? "none" : null); 

      redrawCanvas(
        _ctx,
        _width,
        _height,
        _projection,
        isCompareMode
      );

      renderLegend(
        isCompareMode
          ? deltaLegendItems
          : legendItems
      );
    });

  const tooltip =
    d3.select("#tooltip");

  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("d", pathGen)
    .attr("fill", "transparent")
    .attr("stroke", "none")
    .style("cursor", "crosshair")

    .on("mousemove", function(event) {

      const [mx, my] =
        d3.pointer(event);

      const coords =
        projection.invert([mx, my]);

      if (!coords) {
        tooltip.style("display", "none");
        return;
      }

      const [lon, lat] = coords;

      const region =
        classifyOcean(lat, lon);

      if (
        !region ||
        !oceanData[region]
      ) {
        tooltip.style("display", "none");
        return;
      }

      const present =
        oceanData[region];

      let html;

      if (
        isCompareMode &&
        historicalData[region]
      ) {

        const hist =
          historicalData[region].mean;

        const mod =
          present.mean;

        const delta =
          mod - hist;

        const sign =
          delta >= 0 ? "+" : "";

        const color =
          delta >= 0
            ? "#e85d24"
            : "#85b7eb";

        const arrow =
          delta >= 0
            ? "▲"
            : "▼";

        html = `
          <div class="tooltip-title">
            ${region}
          </div>

          <div class="tooltip-row">
            <span class="label">
              Historical mean
            </span>

            <span class="value">
              ${hist.toFixed(2)}°C
            </span>
          </div>

          <div class="tooltip-row">
            <span class="label">
              Present mean
            </span>

            <span class="value">
              ${mod.toFixed(2)}°C
            </span>
          </div>

          <div class="tooltip-row">
            <span class="label">
              Change
            </span>

            <span
              class="value"
              style="
                color:${color};
                font-weight:600
              "
            >
              ${arrow}
              ${sign}${delta.toFixed(2)}°C
            </span>
          </div>
        `;

      } else {

        html = `
          <div class="tooltip-title">
            ${region}
          </div>

          <div class="tooltip-row">
            <span class="label">
              Mean
            </span>

            <span class="value mean">
              ${present.mean.toFixed(1)}°C
            </span>
          </div>

          <div class="tooltip-row">
            <span class="label">
              Min
            </span>

            <span class="value cold">
              ${present.min.toFixed(1)}°C
            </span>
          </div>

          <div class="tooltip-row">
            <span class="label">
              Max
            </span>

            <span class="value hot">
              ${present.max.toFixed(1)}°C
            </span>
          </div>
        `;
      }

      tooltip
        .style("display", "block")
        .html(html);

      const [bmx, bmy] =
        d3.pointer(
          event,
          document.body
        );

      const tx =
        bmx + 16 + 180 >
        window.innerWidth
          ? bmx - 196
          : bmx + 16;

      const ty =
        Math.max(bmy - 20, 8);

      tooltip
        .style("left", tx + "px")
        .style("top", ty + "px");
    })

    .on("mouseleave", () => {
      tooltip.style("display", "none");
    });
}

document.addEventListener(
  "DOMContentLoaded",
  drawMap
);