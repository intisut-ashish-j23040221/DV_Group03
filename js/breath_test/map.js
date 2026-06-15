let australiaGeoJSON = null;

const drawPositiveBreathBar = async (data) => {
    const container = d3.select("#percent-breath-bar");
    container.html("<div style='text-align:center; padding: 20px;'>Loading Map...</div>");

    if (data.length === 0) {
        container.html("");
        return;
    }

    // 1. Data Aggregation
    const jurisdictionData = Array.from(d3.rollups(
        data,
        v => d3.sum(v, d => d.positiveBreathCount),
        d => d.jurisdiction
    ), ([jurisdiction, positiveCount]) => ({ jurisdiction, positiveCount }));

    const totalPositive = d3.sum(jurisdictionData, d => d.positiveCount);
    jurisdictionData.forEach(d => {
        d.percentage = totalPositive > 0 ? (d.positiveCount / totalPositive) * 100 : 0;
    });

    // 2. Load GeoJSON if not already loaded
    if (!australiaGeoJSON) {
        try {
            australiaGeoJSON = await d3.json("data/australia.geojson");
        } catch (e) {
            console.error("Failed to load map data", e);
            container.html("<div style='color:red;'>Error loading map.</div>");
            return;
        }
    }

    container.html(""); // Clear loading

    const containerWidth = container.node().getBoundingClientRect().width || 450;
    const h = 450; // Increased height to match CSS

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${containerWidth} ${h}`)
        .attr("width", "100%")
        .attr("height", "100%");

    // 3. Projection - Optimized for increased height
    const projection = d3.geoMercator()
        .center([133, -28])
        .scale(containerWidth * 1.05) 
        .translate([containerWidth / 2, h / 2.1]); // Slightly nudge up to clear legend

    const path = d3.geoPath().projection(projection);

    // 4. Color Scale
    const colorScale = d3.scaleSequential(d3.interpolateOranges)
        .domain([0, d3.max(jurisdictionData, d => d.positiveCount) || 1]);

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

    // 5. Draw Map
    const g = svg.append("g");

    const states = g.selectAll("path")
        .data(australiaGeoJSON.features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", d => {
            const jurCode = jurMap[d.properties.STATE_NAME];
            const dData = jurisdictionData.find(j => j.jurisdiction === jurCode);
            return dData ? colorScale(dData.positiveCount) : "#f8f9fa";
        })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", "1px")
        .style("cursor", "pointer");

    // 6. Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "map-tooltip-bt")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "white")
        .style("padding", "10px")
        .style("border-radius", "6px")
        .style("border", "2px solid #EBA746")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("box-shadow", "0 4px 10px rgba(0,0,0,0.1)")
        .style("z-index", "10001");

    states
        .on("mouseover", function(e, d) {
            const jurCode = jurMap[d.properties.STATE_NAME];
            const dData = jurisdictionData.find(j => j.jurisdiction === jurCode);
            if (!dData) return;

            d3.select(this).attr("stroke", "#333").attr("stroke-width", "2px");
            
            tooltip.html(`
                <strong style="color:#EBA746">${d.properties.STATE_NAME}</strong><br/>
                Positive Cases: ${d3.format(",")(dData.positiveCount)}<br/>
                Share: ${dData.percentage.toFixed(1)}%
            `)
            .style("visibility", "visible");
        })
        .on("mousemove", (e) => {
            tooltip.style("top", (e.pageY - 10) + "px").style("left", (e.pageX + 15) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke", "#ffffff").attr("stroke-width", "1px");
            tooltip.style("visibility", "hidden");
        });

    // Legend
    const legendWidth = 120;
    const legend = svg.append("g")
        .attr("transform", `translate(${containerWidth - legendWidth - 10}, ${h - 40})`);

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient").attr("id", "legend-grad-bt");
    linearGradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateOranges(0));
    linearGradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateOranges(1));

    legend.append("rect").attr("width", legendWidth).attr("height", 8).style("fill", "url(#legend-grad-bt)");
    legend.append("text").attr("y", -5).style("font-size", "9px").text("0");
    legend.append("text").attr("x", legendWidth).attr("y", -5).attr("text-anchor", "end").style("font-size", "9px").text(d3.format(".2s")(d3.max(jurisdictionData, d => d.positiveCount) || 0));

    // Data Table Context Menu
    addDataTableContextMenu(container.node(),
        () => jurisdictionData.map(d => ({
            'Jurisdiction': d.jurisdiction,
            'Positive cases': d.positiveCount.toLocaleString(),
            '% of total': d.percentage.toFixed(1) + '%'
        })),
        () => ['Jurisdiction', 'Positive cases', '% of total'],
        'Positive results by jurisdiction',
        'Map showing the geographic distribution of positive breath test results. Darker orange indicates higher volume of positive cases.',
        (row, clone) => {
            if (!row) {
                d3.select(clone).selectAll('path').style('fill-opacity', 1);
                return;
            }
            d3.select(clone).selectAll('path')
                .style('fill-opacity', function(d) {
                    return jurMap[d.properties.STATE_NAME] === row.Jurisdiction ? 1 : 0.2;
                });
        }
    );
};
