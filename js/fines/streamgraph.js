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
        .offset(d3.stackOffsetSilhouette);

    const layers = stack(stackedData);

    const yScale = d3.scaleLinear()
        .domain([
            d3.min(layers, l => d3.min(l, d => d[0])),
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

    // Hover / mousemove interaction
    streams.on("mouseover", function(event, d) {
        streams.attr("opacity", p => p.key === d.key ? 1 : 0.25);
        tooltip.style("opacity", 1);
        tooltip.select("rect").attr("fill", colorScale(d.key));
    })
    .on("mousemove", function(event, d) {
        const [mx, my] = d3.pointer(event);
        const year = Math.round(xScale.invert(mx));
        
        // Find value for the current year
        const yearData = stackedData.find(sd => sd.year === year);
        const fineVal = yearData ? (yearData[d.key] || 0) : 0;

        tooltipText.selectAll("tspan").remove();
        tooltipText.append("tspan")
            .attr("x", 12)
            .attr("dy", 0)
            .text(`Year: ${year}`);
        tooltipText.append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Metric: ${formatMetricLabel(d.key)}`);
        tooltipText.append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Fines: $${fineVal.toLocaleString()}`);

        const tooltipWidth = 225;
        const tooltipHeight = 70;
        let tx = mx + 15;
        if (tx + tooltipWidth > w) tx = mx - tooltipWidth - 15;
        let ty = my - tooltipHeight - 10;
        if (ty < 0) ty = my + 15;

        tooltip.attr("transform", `translate(${tx}, ${ty})`);
    })
    .on("mouseleave", function() {
        streams.attr("opacity", 1);
        tooltip.style("opacity", 0);
    });

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
                row[formatMetricLabel(m)] = sd[m].toLocaleString();
            });
            return row;
        }),
        () => ['Year', ...metrics.map(m => formatMetricLabel(m))],
        'Fines Trend by Metric',
        'Displays the yearly breakdown of fines across different enforcement categories in a table layout. Hover over any metric row in the chart streams to inspect specific values.',
        (row, clone) => {
            if (!row) {
                d3.select(clone).selectAll('.stream-path').attr('opacity', 1);
                return;
            }
        }
    );
};
