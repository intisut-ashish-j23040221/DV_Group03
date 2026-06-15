async function drawMapChart() {
    const container = d3.select("#map-chart");
    container.html("<div class='loading-msg' style='text-align:center; padding: 50px;'>Generating Australia Map...</div>");

    try {
        // 1. Load Datasets
        // Using the locally downloaded GeoJSON for reliability
        const [geoData, finesData] = await Promise.all([
            d3.json("data/australia.geojson"),
            d3.csv("data/fines.csv")
        ]);

        container.html(""); // Clear loading message

        // 2. Data Processing - Aggregate Fines by Jurisdiction
        const totals = d3.rollups(
            finesData,
            v => ({
                fines: d3.sum(v, d => +d.FINES || 0),
                arrests: d3.sum(v, d => +d.ARRESTS || 0),
                charges: d3.sum(v, d => +d.CHARGES || 0)
            }),
            d => d.JURISDICTION
        ).map(([jur, val]) => ({ jur, ...val }));

        // Mapping for GeoJSON state names to our CSV codes
        const jurMap = {
            "New South Wales": "NSW",
            "Victoria": "VIC",
            "Queensland": "QLD",
            "South Australia": "SA",
            "Western Australia": "WA",
            "Tasmania": "TAS",
            "Northern Territory": "NT",
            "Australian Capital Territory": "ACT"
        };

        // 3. Dimensions
        const width = 900, height = 700;
        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("width", "100%")
            .attr("height", "100%");

        // 4. Projection - Optimized for Australia
        const projection = d3.geoMercator()
            .center([133, -28]) 
            .scale(900)
            .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);

        // 5. Color Scale
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, d3.max(totals, d => d.fines) || 1]);

        // 6. Draw Map
        const g = svg.append("g");

        g.selectAll("path")
            .data(geoData.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", d => {
                const stateName = d.properties.STATE_NAME || d.properties.name;
                const jurCode = jurMap[stateName];
                const data = totals.find(t => t.jur === jurCode);
                return data ? colorScale(data.fines) : "#f8f9fa";
            })
            .attr("stroke", "#ffffff")
            .attr("stroke-width", "1.5px")
            .style("cursor", "pointer")
            .on("mouseover", function(e, d) {
                d3.select(this)
                    .transition().duration(200)
                    .attr("stroke", "#062f56")
                    .attr("stroke-width", "3px")
                    .style("filter", "brightness(0.9)");
                showTooltip(e, d);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition().duration(200)
                    .attr("stroke", "#ffffff")
                    .attr("stroke-width", "1.5px")
                    .style("filter", "none");
                hideTooltip();
            });

        // 7. Gradient Legend
        const legendWidth = 250;
        const legendHeight = 15;
        const legend = svg.append("g")
            .attr("transform", `translate(${width - legendWidth - 40}, ${height - 60})`);

        const defs = svg.append("defs");
        const linearGradient = defs.append("linearGradient")
            .attr("id", "map-gradient-fill");

        linearGradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateBlues(0));
        linearGradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateBlues(1));

        legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#map-gradient-fill)")
            .style("stroke", "#ccc");

        legend.append("text").attr("y", -8).style("font-size", "12px").style("fill", "#666").text("Lower Fines");
        legend.append("text").attr("x", legendWidth).attr("y", -8).attr("text-anchor", "end").style("font-size", "12px").style("fill", "#666").text("Higher Fines");

        // Tooltip Logic
        const tooltip = d3.select("body").append("div")
            .attr("class", "map-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "white")
            .style("padding", "15px")
            .style("border-radius", "8px")
            .style("border", "2px solid #062f56")
            .style("pointer-events", "none")
            .style("box-shadow", "0 10px 25px rgba(0,0,0,0.15)")
            .style("z-index", "10001");

        function showTooltip(e, d) {
            const stateName = d.properties.STATE_NAME || d.properties.name;
            const jurCode = jurMap[stateName];
            const data = totals.find(t => t.jur === jurCode);
            
            if (!data) return;

            let html = `<div style="font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #062f56;">${stateName} (${jurCode})</div>`;
            html += `<div style="display: grid; grid-template-columns: 1fr auto; gap: 15px; font-size: 14px;">
                <span>Total Fines:</span> <span style="font-weight: bold;">$${d3.format(",")(data.fines)}</span>
                <span>Arrests:</span> <span style="font-weight: bold;">${d3.format(",")(data.arrests)}</span>
                <span>Charges:</span> <span style="font-weight: bold;">${d3.format(",")(data.charges)}</span>
            </div>`;

            tooltip.html(html)
                .style("visibility", "visible")
                .style("top", (e.pageY - 10) + "px")
                .style("left", (e.pageX + 20) + "px");
        }

        function hideTooltip() {
            tooltip.style("visibility", "hidden");
        }

    } catch (err) {
        console.error("Map Error:", err);
        container.html(`<div style='color:red; padding: 50px; text-align:center;'>
            Error generating map.<br/>
            <small style='color:#666'>Details: ${err.message}</small>
        </div>`);
    }
}
