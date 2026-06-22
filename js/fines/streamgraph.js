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
    let xDomain = d3.extent(years);
    if (years.length === 1) {
        xDomain = [years[0] - 1, years[0] + 1];
    } else if (years.length === 0) {
        xDomain = [2018, 2022];
    }

    const xScale = d3.scaleLinear()
        .domain(xDomain)
        .range([0, w]);

    const stack = d3.stack()
        .keys(metrics)
        .offset(d3.stackOffsetNone);

    const layers = stack(stackedData);
    const keys = layers.map(l => l.key);

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
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    if (years.length > 0) {
        xAxis.tickValues(years);
    } else {
        xAxis.ticks(5);
    }

    chart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "11px");

    chart.append("g")
        .call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format("~s")))
        .selectAll("text")
        .style("font-size", "11px");

    const yearWidth = (xScale(years[1]) - xScale(years[0]));

    // invisible year points
    const yearTrackers = chart.append("g")
        .attr("class", "year-trackers")
        .selectAll("rect")
        .data(years)
        .join("rect")
        .attr("x", year => xScale(year) - yearWidth / 2)
        .attr("y", 0)
        .attr("width", yearWidth)
        .attr("height", innerHeight)
        .style("fill", "transparent") 
        .style("cursor", "pointer")
        .attr("tabindex", (d, i) => i === 0 ? "0" : "-1")

    const focusLine = chart.append("line")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .style("stroke", "#000") 
        .style("stroke-width", "2px")
        .style("stroke-dasharray", "4 4")
        .style("visibility", "hidden");


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

    const tooltip = chart.append("g")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("pointer-events", "none")
        .style("z-index", 9999);

    const tooltipShape = tooltip.append("rect")
        .attr("width", 225)
        .attr("height", metric === "All" ? 100 : 70)
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
        const mx = xScale(year);
        
        focusLine
            .attr("x1", mx)
            .attr("x2", mx)
            .style("visibility", "visible");

        const yearData = stackedData.find(sd => sd.year === year);
        
        tooltipText.selectAll("tspan").remove();
        
        tooltipText.append("tspan")
            .attr("x", 12)
            .attr("dy", 0)
            .text(`Year: ${year}`);
            
        let runningYOffset = 16;
        keys.forEach(key => {
            const fineVal = yearData ? (yearData[key] || 0) : 0;
            
            tooltipText.append("tspan")
                .attr("x", 12)
                .attr("dy", runningYOffset)
                .text(`${formatMetricLabel(key)}: $${fineVal.toLocaleString()}`);
                
            runningYOffset = 16; 
        });

        const tooltipWidth = 225;
        const tooltipHeight = 70;
        
        let tx = mx + 15;
        if (tx + tooltipWidth > w) tx = mx - tooltipWidth - 15; 
        
        let ty = innerHeight / 2 - tooltipHeight / 2; 

        tooltip
            .style("visibility", "visible")
            .style("opacity", 1)
            .attr("transform", `translate(${tx}, ${ty})`);
    };

    const handleYearBlur = () => {
        focusLine.style("visibility", "hidden");
        tooltip.style("visibility", "hidden");
    };

    yearTrackers
        .on("mouseenter", handleYearFocus)
        .on("focus", handleYearFocus)
        .on("mouseleave", handleYearBlur)
        .on("blur", handleYearBlur)
        .on("keydown", (event) => createDataPointMovement(event, yearTrackers))
        .on("click", (event) => syncClicksBetweenDPs(event, yearTrackers));

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
        (selectedRows, clone) => {
            const cloneChart = d3.select(clone).select("g");
            
            cloneChart.selectAll(".year-indicator").remove();

            if (!selectedRows || selectedRows.length === 0) {
                return;
            }

            selectedRows.forEach(row => {
                const xPos = xScale(row.Year);
                if (isNaN(xPos)) return;

                cloneChart.append("line")
                    .attr("class", "year-indicator")
                    .attr("x1", xPos)
                    .attr("y1", 0)
                    .attr("x2", xPos)
                    .attr("y2", innerHeight)
                    .attr("stroke", "#111827")
                    .attr("stroke-width", "2px")
                    .attr("stroke-dasharray", "4 4");

                cloneChart.append("text")
                    .attr("class", "year-indicator")
                    .attr("x", xPos)
                    .attr("y", -6)
                    .attr("text-anchor", "middle")
                    .style("font-size", "11px")
                    .style("font-weight", "bold")
                    .style("fill", "#111827")
                    .text(row.Year);
            });
        }
    );
};
