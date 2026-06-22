let australiaGeoJSON_FN = null;

const drawJurisdictionSpeedingMap = async (data, metric = 'All') => {
    const container = d3.select("#jurisdiction-speeding-bar");
    container.html("<div style='text-align:center; padding: 20px;'>Loading Map...</div>");
    container.attr("tabindex", "0");

    if (data.length === 0) {
        container.html("");
        return;
    }

    const metricLabel = formatMetricLabel(metric);

    // 1. Data Aggregation
    const jurisdictionData = Array.from(d3.rollups(
        data,
        v => d3.sum(v, d => d.fines || 0),
        d => d.jurisdiction
    ), ([jurisdiction, totalFines]) => ({ jurisdiction, totalFines }));

    const totalFinesSum = d3.sum(jurisdictionData, d => d.totalFines);
    jurisdictionData.forEach(d => {
        d.percentage = totalFinesSum > 0 ? (d.totalFines / totalFinesSum) * 100 : 0;
    });

    // 2. Load GeoJSON if not already loaded
    if (!australiaGeoJSON_FN) {
        try {
            australiaGeoJSON_FN = await d3.json("data/australia.geojson");
        } catch (e) {
            console.error("Failed to load map data", e);
            container.html("<div style='color:red;'>Error loading map.</div>");
            return;
        }
    }

    container.html(""); // Clear loading

    const containerWidth = container.node().getBoundingClientRect().width || 450;
    const h = 450; 

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${containerWidth} ${h}`)
        .attr("width", "100%")
        .attr("height", "100%");

    // 3. Projection 
    const projection = d3.geoMercator()
        .center([133, -28])
        .scale(containerWidth * 1.05) 
        .translate([containerWidth / 2, h / 2.1]); 

    const path = d3.geoPath().projection(projection);

    // 4. Color Scale - Using Blues to match Fines theme
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(jurisdictionData, d => d.totalFines) || 1]);

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
        .data(australiaGeoJSON_FN.features)
        .enter().append("path")
        .attr("d", path)
        .attr("data-jurisdiction", d => jurMap[d.properties.STATE_NAME || d.properties.name])
        .attr("fill", d => {
            const stateName = d.properties.STATE_NAME || d.properties.name;
            const jurCode = jurMap[stateName];
            const dData = jurisdictionData.find(j => j.jurisdiction === jurCode);
            return dData ? colorScale(dData.totalFines) : "#f8f9fa";
        })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", "1px")
        .style("cursor", "pointer")
        .attr("tabindex", (d, i) => i === 0 ? "0" : "-1");

    // 6. Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "map-tooltip-fn")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "white")
        .style("padding", "10px")
        .style("border-radius", "6px")
        .style("border", "2px solid #004B87")
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
            <strong style="color:#004B87">${stateName}</strong><br/>
            Fines: $${d3.format(",")(dData.totalFines)}<br/>
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
        .on("mousemove", (e) => {
            tooltip.style("top", (e.pageY - 10) + "px").style("left", (e.pageX + 15) + "px");
        })
        .on("mouseout", (e) => {
            d3.select(e.currentTarget).attr("stroke", "#ffffff").attr("stroke-width", "1px");
            tooltip.style("visibility", "hidden");
        })
        .on("blur", (e) => {
            d3.select(e.currentTarget).attr("stroke", "#ffffff").attr("stroke-width", "1px");
            tooltip.style("visibility", "hidden");
        })
        .on("keydown", (e) => { if(typeof createDataPointMovement === 'function') createDataPointMovement(e, states); })
        .on("click", (e) => { if(typeof syncClicksBetweenDPs === 'function') syncClicksBetweenDPs(e, states); });

    // Legend
    const legendWidth = 120;
    const legend = svg.append("g")
        .attr("transform", `translate(${containerWidth - legendWidth - 10}, ${h - 40})`);

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient").attr("id", "legend-grad-fn");
    linearGradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateBlues(0));
    linearGradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateBlues(1));

    legend.append("rect").attr("width", legendWidth).attr("height", 8).style("fill", "url(#legend-grad-fn)");
    legend.append("text").attr("y", -5).style("font-size", "9px").text("$0");
    legend.append("text").attr("x", legendWidth).attr("y", -5).attr("text-anchor", "end").style("font-size", "9px").text("$" + d3.format(".2s")(d3.max(jurisdictionData, d => d.totalFines) || 0));

    // Data Table Context Menu
    if (typeof addDataTableContextMenu === 'function') {
        addDataTableContextMenu(container.node(),
            () => jurisdictionData.map(d => ({
                'Jurisdiction': d.jurisdiction,
                'Total Fines': '$' + d.totalFines.toLocaleString(),
                '% of total': d.percentage.toFixed(1) + '%'
            })),
            () => ['Jurisdiction', 'Total Fines', '% of total'],
            'Total Fines by Jurisdiction',
            'Map displaying the distribution of traffic fines across states. Darker blue regions indicate higher overall fines.',
            (selectedRows, clone) => {
                if (!selectedRows || selectedRows.length === 0) {
                    d3.select(clone).selectAll('path').style('fill-opacity', 1);
                    return;
                }
                const activeJurs = selectedRows.map(r => r.Jurisdiction);
                d3.select(clone).selectAll('path')
                    .style('fill-opacity', function() {
                        const jurCode = d3.select(this).attr('data-jurisdiction');
                        return activeJurs.includes(jurCode) ? 1 : 0.2;
                    });
            }
        );
    }
};