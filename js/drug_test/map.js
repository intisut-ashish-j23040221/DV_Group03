let australiaGeoJSON_DT = null;

const drawPositiveDrugBar = async (data) => {
    const container = d3.select("#positive-drug-bar");
    container.html("<div style='text-align:center; padding: 20px;'>Loading Map...</div>");

    if (data.length === 0) {
        container.html("");
        return;
    }

    container.attr("tabindex", "0"); // for keyboard accessibility

    // 1. Data Aggregation
    const jurisdictionData = Array.from(d3.rollups(
        data,
        v => d3.sum(v, d => d.positiveDrugCount),
        d => d.jurisdiction
    ), ([jurisdiction, positiveCount]) => ({ jurisdiction, positiveCount }));

    const totalPositive = d3.sum(jurisdictionData, d => d.positiveCount);
    jurisdictionData.forEach(d => {
        d.percentage = totalPositive > 0 ? (d.positiveCount / totalPositive) * 100 : 0;
    });

    // 2. Load GeoJSON if not already loaded
    if (!australiaGeoJSON_DT) {
        try {
            australiaGeoJSON_DT = await d3.json("data/australia.geojson");
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
    const colorScale = d3.scaleSequential(d3.interpolateReds)
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
        .data(australiaGeoJSON_DT.features)
        .enter().append("path")
        .attr("d", path)
        .attr("data-jurisdiction", d => jurMap[d.properties.STATE_NAME || d.properties.name])
        .attr("fill", d => {
            const stateName = d.properties.STATE_NAME || d.properties.name;
            const jurCode = jurMap[stateName];
            const dData = jurisdictionData.find(j => j.jurisdiction === jurCode);
            return dData ? colorScale(dData.positiveCount) : "#f8f9fa";
        })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", "1px")
        .style("cursor", "pointer");

    // 6. Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "map-tooltip-dt")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "white")
        .style("padding", "10px")
        .style("border-radius", "6px")
        .style("border", "2px solid #D32F2F")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("box-shadow", "0 4px 10px rgba(0,0,0,0.1)")
        .style("z-index", "10001");

    const handleHover = (e, d) => {
        const stateName = d.properties.STATE_NAME || d.properties.name;
        const jurCode = jurMap[stateName];
        const dData = jurisdictionData.find(j => j.jurisdiction === jurCode);
        if (!dData) return;

        d3.select(e.currentTarget).attr("stroke", "#333").attr("stroke-width", "2px");
        
        tooltip.html(`
            <strong style="color:#D32F2F">${stateName}</strong><br/>
            Positive Cases: ${d3.format(",")(dData.positiveCount)}<br/>
            Share: ${dData.percentage.toFixed(1)}%
        `)
        .style("visibility", "visible");

        const svgElement = e.currentTarget.closest("svg");
        let resp = svgElement.getBoundingClientRect();

        const [centroidX, centroidY] = path.centroid(d);

        const absoluteX = resp.left + window.scrollX + centroidX;
        const absoluteY = resp.top + window.scrollY + centroidY;

        tooltip
            .style("left", `${absoluteX}px`)
            .style("top", `${absoluteY - 20}px`) 
            .style("transform", "translateX(-50%)");
    }

    states
        .on("mouseover", handleHover)
        .on("focus", handleHover)
        .on("mousemove", (e) => tooltip.style("top", (e.pageY - 10) + "px").style("left", (e.pageX + 15) + "px"))
        .on("mouseout", (e) => {
            d3.select(e.currentTarget).attr("stroke", "#ffffff").attr("stroke-width", "1px");
            tooltip.style("visibility", "hidden");
        })
        .on("blur", (e) => {
            d3.select(e.currentTarget).attr("stroke", "#ffffff").attr("stroke-width", "1px");
            tooltip.style("visibility", "hidden");
        })
        .on("keydown", (e) => createDataPointMovement(e, states))
        .on("click", (e) => syncClicksBetweenDPs(e, states));
        

    // Legend
    const legendWidth = 120;
    const legend = svg.append("g")
        .attr("transform", `translate(${containerWidth - legendWidth - 10}, ${h - 40})`);

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient").attr("id", "legend-grad-dt");
    linearGradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateReds(0));
    linearGradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateReds(1));

    legend.append("rect").attr("width", legendWidth).attr("height", 8).style("fill", "url(#legend-grad-dt)");
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
        'Map showing the geographic distribution of positive drug test results. Darker red indicates higher volume of positive cases.',
        (row, clone) => {
            if (!row) {
                d3.select(clone).selectAll('path').style('fill-opacity', 1);
                return;
            }
            d3.select(clone).selectAll('path')
                .style('fill-opacity', function() {
                    const stateName = d3.select(this).attr('data-jurisdiction');
                    return stateName === row.Jurisdiction ? 1 : 0.2;
                });
        }
    );
};
