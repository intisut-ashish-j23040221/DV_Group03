const drawFinesStreamgraph = (data, metric = 'All') => {
    const container = d3.select("#fines-line-chart");
    if (container.empty()) {
        return;
    }

    container.selectAll("*").remove();
    container.attr("tabindex", "0");

    if (data.length === 0) return;

    const metricLabel = formatMetricLabel(metric);

    // Extract unique years and metrics dynamically
    const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
    const metrics = Array.from(new Set(data.map(d => d.metric))).sort();

    // Rollup fines by Year and Metric
    const yearsMap = d3.rollup(
        data,
        v => d3.rollup(v, vv => d3.sum(vv, d => d.fines || 0), d => d.metric),
        d => d.year
    );

    // Construct dataset for d3.stack
    const stackedData = years.map(year => {
        const obj = { year: year };
        const metricMap = yearsMap.get(year);
        metrics.forEach(m => {
            obj[m] = metricMap ? (metricMap.get(m) || 0) : 0;
        });
        return obj;
    });

    const containerWidth = container.node().getBoundingClientRect().width || width;
    const currentInnerWidth = containerWidth - margin.left - margin.right;
    const w = Math.max(currentInnerWidth, 100);

    // Set up scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, w]);

    const stack = d3.stack()
        .keys(metrics)
        .offset(d3.stackOffsetNone);

    const layers = stack(stackedData);
    layers.map(l => l.key);

    const yScale = d3.scaleLinear()
        .domain([
            0,
            d3.max(layers, l => d3.max(l, d => d[1]))
        ])
        .range([innerHeight, 0])
        .nice();

    // Curated premium color scheme
    const colorMap = {
        'speed_fines': '#ff6b6b',
        'mobile_phone_use': '#4dabf7',
        'non_wearing_seatbelts': '#51cf66',
        'unlicensed_driving': '#fcc419',
        'toll_fines': '#cc5de8',
        'red_light_camera': '#ff922b'
    };

    const fallbackPalette = d3.schemeTableau10;
    const colorScale = d3.scaleOrdinal()
        .domain(metrics)
        .range(metrics.map((m, idx) => colorMap[m] || fallbackPalette[idx % 10]));

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${containerWidth} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const area = d3.area()
        .x(d => xScale(d.data.year))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveMonotoneX);

    // Render layers
    const streams = chart.selectAll(".stream-path")
        .data(layers)
        .join("path")
        .attr("class", "stream-path")
        .attr("data-metric", d => formatMetricLabel(d.key))
        .attr("d", area)
        .attr("fill", d => colorScale(d.key))
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.5)
        .attr("opacity", 1);

    // Draw axes
    chart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(years.length))
        .selectAll("text")
        .style("font-size", "11px");

    chart.append("g")
        .call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format("~s")))
        .selectAll("text")
        .style("font-size", "11px");

    // invisible year points
    const yearTrackers = chart.append("g")
        .attr("class", "year-trackers")
        .selectAll("rect")
        .data(years)
        .join("rect")
        .attr("x", year => xScale(year) - (xScale.step ? xScale.step() / 2 : 10)) // center it over the year
        .attr("y", 0)
        .attr("width", xScale.step ? xScale.step() : 20)
        .attr("height", innerHeight)
        .style("fill", "transparent") // Invisible to the eye!
        .style("cursor", "pointer")
        .attr("tabindex", (d, i) => i === 0 ? "0" : "-1")

    const focusLine = chart.append("line")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .style("stroke", "#ff9800") 
        .style("stroke-width", "2px")
        .style("stroke-dasharray", "4 4")
        .style("visibility", "hidden");


    // Labels
    chart.append("text")
        .attr("x", w / 2)
        .attr("y", innerHeight + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Year");

    chart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -margin.left + 50)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Stacked Fines");

    chart.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-size", "13px")
        .style("font-weight", "600")
        .text(`Fines Trend by Metric Over Time (${metricLabel})`);

    // Tooltip creation at the very end to guarantee correct layering
    const tooltip = chart.append("g")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("pointer-events", "none")
        .style("z-index", 9999);

    tooltip.append("rect")
        .attr("width", 225)
        .attr("height", 70)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", "#333")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);

    const tooltipText = tooltip.append("text")
        .attr("x", 12)
        .attr("y", 18)
        .attr("fill", "white")
        .style("font-weight", "bold")
        .style("font-size", "12px");

    const handleHover = (e, d) => {
        streams.attr("opacity", p => p.key === d.key ? 1 : 0.25);
        tooltip.style("opacity", 1);
        tooltip.select("rect").attr("fill", colorScale(d.key));

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

    const handleYearFocus = (e, year) => {
        // 1. Highlight the current stream layers based on selection
        // Note: If you're tracking by year, you can choose to highlight all streams 
        // or keep your specific layer highlight if 'd' is passed.
        // streams.attr("opacity", p => p.key === d.key ? 1 : 0.25);

        // 2. Calculate 'mx' mathematically based on the year being focused
        const mx = xScale(year);
        
        // Move your vertical focus guide line to this position
        focusLine
            .attr("x1", mx)
            .attr("x2", mx)
            .style("visibility", "visible");

        // 3. Find the dataset row for the currently focused year
        // (Translating your commented out mousemove logic)
        const yearData = stackedData.find(sd => sd.year === year);
        
        // 4. Update your SVG internal tooltip tspans safely
        tooltipText.selectAll("tspan").remove();
        
        tooltipText.append("tspan")
            .attr("x", 12)
            .attr("dy", 0)
            .text(`Year: ${year}`);
            
        // You can iterate over your layer keys to show all metrics for that year, 
        // or target a specific one. Here is how to list the metrics for that year:
        let runningYOffset = 16;
        keys.forEach(key => {
            const fineVal = yearData ? (yearData[key] || 0) : 0;
            
            tooltipText.append("tspan")
                .attr("x", 12)
                .attr("dy", runningYOffset)
                .text(`${formatMetricLabel(key)}: $${fineVal.toLocaleString()}`);
                
            // Reset offset for subsequent lines so they space out correctly
            runningYOffset = 16; 
        });

        // 5. Position the tooltip utilizing your bounding logic
        // Using the calculated 'mx' instead of a physical mouse pointer!
        const tooltipWidth = 225;
        const tooltipHeight = 70;
        
        let tx = mx + 15;
        // 'w' is your chart width boundary
        if (tx + tooltipWidth > w) tx = mx - tooltipWidth - 15; 
        
        // We can anchor 'ty' to a stable mid-point height of your stream chart
        let ty = innerHeight / 2 - tooltipHeight / 2; 

        // Smoothly transform your SVG tooltip container to the correct coordinate slot
        tooltip
            .style("visibility", "visible")
            .attr("transform", `translate(${tx}, ${ty})`);
    };

    const handleYearBlur = () => {
        focusLine.style("visibility", "hidden");
        tooltip.style("visibility", "hidden");
    };

    // Hover / mousemove interaction
    // streams
    //     .on("mouseover", handleHover)
    //     .on("focus", handleHover)
    //     .on("mousemove", function(event, d) {
    //         const [mx, my] = d3.pointer(event);
    //         const year = Math.round(xScale.invert(mx));
            
    //         // Find value for the current year
    //         const yearData = stackedData.find(sd => sd.year === year);
    //         const fineVal = yearData ? (yearData[d.key] || 0) : 0;

    //         tooltipText.selectAll("tspan").remove();
    //         tooltipText.append("tspan")
    //             .attr("x", 12)
    //             .attr("dy", 0)
    //             .text(`Year: ${year}`);
    //         tooltipText.append("tspan")
    //             .attr("x", 12)
    //             .attr("dy", 16)
    //             .text(`Metric: ${formatMetricLabel(d.key)}`);
    //         tooltipText.append("tspan")
    //             .attr("x", 12)
    //             .attr("dy", 16)
    //             .text(`Fines: $${fineVal.toLocaleString()}`);

    //         const tooltipWidth = 225;
    //         const tooltipHeight = 70;
    //         let tx = mx + 15;
    //         if (tx + tooltipWidth > w) tx = mx - tooltipWidth - 15;
    //         let ty = my - tooltipHeight - 10;
    //         if (ty < 0) ty = my + 15;

    //         tooltip.attr("transform", `translate(${tx}, ${ty})`);
    //     })
    //     .on("mouseleave", () => {
    //         streams.attr("opacity", 1);
    //         tooltip.style("opacity", 0);
    //     })
    //     .on("blur", () => {
    //         streams.attr("opacity", 1);
    //         tooltip.style("opacity", 0);
    //     })
    //     .on("keydown", (e) => createDataPointMovement(e, streams))
    //     .on("click", (e) => syncClicksBetweenDPs(e, streams));

    yearTrackers
        .on("mouseenter", handleYearFocus)
        .on("focus", handleYearFocus)
        .on("mouseleave", handleYearBlur)
        .on("blur", handleYearBlur)
        .on("keydown", (event) => createDataPointMovement(event, yearTrackers))
        .on("click", (event) => syncClicksBetweenDPs(event, yearTrackers));

    // Interactive Legend (horizontal layout at the bottom)
    if (metrics.length > 1) {
        const legendX = Math.max(10, w / 2 - (metrics.length * 80));
        const legend = chart.append("g")
            .attr("transform", `translate(${legendX}, ${innerHeight + 48})`);

        const legendItems = legend.selectAll("g")
            .data(metrics)
            .join("g")
            .attr("transform", (d, i) => `translate(${i * 165}, 0)`)
            .style("cursor", "pointer")
            .on("mouseover", (event, key) => {
                streams.attr("opacity", p => p.key === key ? 1 : 0.25);
            })
            .on("mouseleave", () => {
                streams.attr("opacity", 1);
            });

        legendItems.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("y", -10)
            .attr("fill", d => colorScale(d));

        legendItems.append("text")
            .attr("x", 16)
            .attr("y", 0)
            .style("font-size", "11px")
            .attr("alignment-baseline", "middle")
            .text(d => formatMetricLabel(d));
    }

    // Attach right-click context menu
    addDataTableContextMenu(container.node(),
        () => stackedData.map(sd => {
            const row = { 'Year': sd.year };
            metrics.forEach(m => {
                row[formatMetricLabel(m)] = '$' + sd[m].toLocaleString();
            });
            return row;
        }),
        () => ['Year', ...metrics.map(m => formatMetricLabel(m))],
        'Fines Trend by Metric',
        'Displays the yearly breakdown of fines across different enforcement categories in a table layout. Click a year row to display a vertical timeline indicator on the chart.',
        (row, clone) => {
            const cloneChart = d3.select(clone).select("g");
            
            // Remove existing indicator elements
            cloneChart.selectAll(".year-indicator").remove();

            if (!row) {
                return;
            }

            const xPos = xScale(row.Year);

            // Draw vertical dashed line marker at the selected year
            cloneChart.append("line")
                .attr("class", "year-indicator")
                .attr("x1", xPos)
                .attr("y1", 0)
                .attr("x2", xPos)
                .attr("y2", innerHeight)
                .attr("stroke", "#111827")
                .attr("stroke-width", "2px")
                .attr("stroke-dasharray", "4 4");

            // Add text year label at the top of the line
            cloneChart.append("text")
                .attr("class", "year-indicator")
                .attr("x", xPos)
                .attr("y", -6)
                .attr("text-anchor", "middle")
                .style("font-size", "11px")
                .style("font-weight", "bold")
                .style("fill", "#111827")
                .text(row.Year);
        }
    );
};
