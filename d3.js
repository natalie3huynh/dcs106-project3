
const oceanData = {
    "Arctic Ocean":{mean: -0.49, min: -1.77, max:9.12},
    "Southern Ocean (West)":{mean: 3.14, min: -1.76, max: 9.07},
    "Southern Ocean (East)":{mean: 2.32, min: -1.29, max: 7.76},
    "Indian Ocean (West)":{mean: 20.64, min: 3.85, max: 30.14},
    "Indian Ocean (East)":{mean: 21.79, min: 3.84, max: 31.04},
    "Tropical Atlantic Ocean":{mean: 26.47, min: 19.73, max: 30.80},
    "Northwest Atlantic Ocean":{mean: 13.14, min: -0.39, max: 28.39},
    "Northeast Atlantic Ocean":{mean: 14.05, min:0.23, max: 30.53},
    "South Atlantic Ocean":{mean: 14.34, min: 4.23, max: 25.09},
  };
  
  // Temperature color scale
  function tempColor(mean) {
    if (mean < 2) return "#B5D4F4";
    if (mean < 8) return "#85B7EB";
    if (mean < 15) return "#9FE1CB";
    if (mean < 20) return "#5DCAA5";
    if (mean < 24) return "#FAC775";
    if (mean < 27) return "#EF9F27";
    return "#E85D24";
  }
  
  // Region classifier (natalies logic)
  function classifyOcean(lat, lon) {
    if (lon > 180) lon -= 360;
    if (lat > 66.5) return "Arctic Ocean";
    if (lat < -55) {
      if (lon >= 20 && lon < 160) return "Southern Ocean (East)";
      return "Southern Ocean (West)";
    }
    if (lat >= -55 && lat <= 23.5 && lon >= 20 && lon < 80) return "Indian Ocean (West)";
    if (lat >= -55 && lat <= 23.5 && lon >= 80 && lon < 120) return "Indian Ocean (East)";
    if (lat >= -23.5 && lat <= 23.5) {
      if (lon >= -80 && lon < 20)
        return "Tropical Atlantic Ocean";
      if (lon >= 120 || lon < -80)
        return "Tropical Pacific Ocean";
    }
    if (lat > 23.5) {
      if (lon >= -100 && lon < -40)
        return "Northwest Atlantic Ocean";
      if (lon >= -40  && lon <  20)
        return "Northeast Atlantic Ocean";
      if (lon < -100)
        return "Northeast Pacific Ocean";
      return "Northwest Pacific Ocean";
    }
    if (lat < -23.5 && lat >= -55) {
      if (lon >= -80 && lon < 20)
        return "South Atlantic Ocean";
      if (lon >= 20  && lon < 120)
        return "Indian Ocean (West)";
      return "South Pacific Ocean";
    }
    return null;
  }
  
  //main draw function
  function drawMap() {
    const width = 960;
    const height = 500;
  
    const svg = d3.select("#map")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%");
  
    const projection = d3.geoNaturalEarth1()
      .scale(153)
      .translate([width / 2, height / 2]);
  
    const pathGen = d3.geoPath().projection(projection);
  
    //sphere background
    svg.append("path")
      .datum({ type: "Sphere" })
      .attr("d", pathGen)
      .attr("fill", "#dce9f5")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 0.5);
  
    // Graticule
    const graticule = d3.geoGraticule()();
    svg.append("path")
      .datum(graticule)
      .attr("d", pathGen)
      .attr("fill", "none")
      .attr("stroke", "#bcd")
      .attr("stroke-width", 0.3);
  
    //ocean region cells
    const gridStep = 2;
    const regionGroups = {};
  
    for (let lat = -88; lat <= 88; lat += gridStep) {
      for (let lon = -178; lon <= 178; lon += gridStep) {
        const region = classifyOcean(lat, lon);
        if (!region || !oceanData[region]) continue;
        console.log(region, lat, lon);
        if (!regionGroups[region]) regionGroups[region] = [];
        regionGroups[region].push([lon, lat]);
      }
    }
  
    const tooltip = d3.select("#tooltip");
  
    Object.entries(regionGroups).forEach(([region, points]) => {
      const color = tempColor(oceanData[region].mean);
      const g = svg.append("g")
        .attr("class", "ocean-region")
        .style("cursor", "pointer");
  
      points.forEach(([lon, lat]) => {
        const cellFeature = {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [lon, lat],
              [lon + gridStep, lat],
              [lon + gridStep, lat + gridStep],
              [lon, lat + gridStep],
              [lon, lat]
            ]]
          }
        };
  
        g.append("path")
          .datum(cellFeature)
          .attr("d", pathGen)
          .attr("fill", color)
          .attr("stroke", "none")
          .attr("opacity", 0.82)
          .on("mousemove", function (event) {
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
            const [mx, my] = d3.pointer(event, document.body);
            const tw = 180;
            const tx = mx + 16 + tw > window.innerWidth ? mx - tw - 12 : mx + 16;
            const ty = Math.max(my - 20, 8);
            tooltip.style("left", tx + "px").style("top", ty + "px");
          })
          .on("mouseleave", function () {
            tooltip.style("display", "none");
          });
      });
  
    });
  
    // country outilnes
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(world => {
        const countries = topojson.feature(world, world.objects.countries);
        svg.append("g")
          .selectAll("path")
          .data(countries.features)
          .join("path")
          .attr("d", pathGen)
          .attr("fill", "#f0ede8")
          .attr("stroke", "#bbb")
          .attr("stroke-width", 0.4)
          .style("pointer-events", "none"); // let mouse events pass through to ocean layer below
  
        //ivisible ocean hit areas (drawn on top of countries for correct hover)
        const overlayGroup = svg.append("g").attr("class", "hover-overlay");
  
        Object.entries(regionGroups).forEach(([region, points]) => {
          if (!oceanData[region]) return;
          const g = overlayGroup.append("g").style("cursor", "pointer");
  
          points.forEach(([lon, lat]) => {
            const cellFeature = {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [[
                  [lon, lat],
                  [lon + gridStep, lat],
                  [lon + gridStep, lat + gridStep],
                  [lon, lat + gridStep],
                  [lon, lat]
                ]]
              }
            };
            g.append("path")
              .datum(cellFeature)
              .attr("d", pathGen)
              .attr("fill", "transparent")
              .attr("stroke", "none");
          });
  
          g.on("mousemove", function (event) {
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
            const [mx, my] = d3.pointer(event, document.body);
            const tw = 180;
            const tx = mx + 16 + tw > window.innerWidth ? mx - tw - 12 : mx + 16;
            const ty = Math.max(my - 20, 8);
            tooltip.style("left", tx + "px").style("top", ty + "px");
          })
          .on("mouseleave", function () {
            tooltip.style("display", "none");
          });
        });
      });
  
    //legend
    const legendItems = [
      {label: "< 2°C", color: "#B5D4F4"},
      {label: "2–8°C", color: "#85B7EB"},
      {label: "8–15°C", color: "#9FE1CB"},
      {label: "15–20°C", color: "#5DCAA5"},
      {label: "20–24°C", color: "#FAC775"},
      {label: "24–27°C", color: "#EF9F27"},
      {label: "> 27°C", color: "#E85D24"},
    ];
  
    const legend = svg.append("g").attr("transform", "translate(20, 420)");
  
    legend.append("rect")
      .attr("x", -8).attr("y", -16)
      .attr("width", legendItems.length * 82 + 8)
      .attr("height", 30)
      .attr("rx", 5)
      .attr("fill", "white")
      .attr("opacity", 0.85)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 0.5);
  
    legendItems.forEach((item, i) => {
      const gx = i * 82;
      legend.append("rect")
        .attr("x", gx).attr("y", -10)
        .attr("width", 14).attr("height", 14)
        .attr("rx", 3)
        .attr("fill", item.color);
      legend.append("text")
        .attr("x", gx + 18).attr("y", 2)
        .style("font-size", "11px")
        .style("fill", "#555")
        .text(item.label);
    });
  }
  
  //init
  drawMap();