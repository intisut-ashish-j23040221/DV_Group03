const drawCameraSpeedingBar = (data, metric = 'All') => {
    const container = d3.select("#camera-speeding-bar");

    if (container.empty()) {
        return;
    }

    container.selectAll("*").remove();

    const metricLabel = formatMetricLabel(metric);

    // Sum of all fines in the active dataset
    const totalFinesAll = d3.sum(data, d => d.fines || 0);

    // Group by detectionMethod across all enforcement data and calculate percentage shares
    const totals = d3.rollups(
        data,
        values => d3.sum(values, d => d.fines || 0),
        d => d.detectionMethod
    )
        .map(([detectionMethod, totalFines]) => {
            const percentage = totalFinesAll > 0 ? (totalFines / totalFinesAll) * 100 : 0;
            return { detectionMethod, totalFines, percentage };
        })
        .sort((a, b) => d3.descending(a.percentage, b.percentage));

    if (totals.length === 0) return;

    const containerWidth = container.node().getBoundingClientRect().width || width;
    const w = containerWidth;
    const h = height;

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${containerWidth} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%");

    const chart = svg.append("g");

    // 1. Radar Geometry Configuration
    const cx = w / 2;
    const cy = h / 2 + 10;
    const r = Math.min(w, h) / 2 - 50; // Radius leaving margins for labels
    const angleSlice = (Math.PI * 2) / totals.length;

    // Use a Square Root scale on percentages to handle the outlier (large values) without clustering
    const maxPercent = d3.max(totals, d => d.percentage) || 100;
    const rScale = d3.scaleSqrt()
        .domain([0, maxPercent])
        .range([0, r])
        .nice();

    // 2. Draw Concentric Grid Web (Concentric Polygons) with Percentage Scales
    const levels = 4;
    const gridValues = rScale.ticks(levels);
    const gridGroup = chart.append("g").attr("class", "grid-group");

    gridValues.forEach(levelVal => {
        if (levelVal === 0) return;
        const gridPoints = totals.map((d, i) => {
            const angle = i * angleSlice;
            const x = cx + rScale(levelVal) * Math.sin(angle);
            const y = cy - rScale(levelVal) * Math.cos(angle);
            return `${x},${y}`;
        }).join(" ");

        gridGroup.append("polygon")
            .attr("points", gridPoints)
            .attr("fill", "none")
            .attr("stroke", "#f3f4f6") // Muted grid color
            .attr("stroke-width", "1px");

        // Scale numerical labels shifted further right (cx + 12) with a white legibility halo
        gridGroup.append("text")
            .attr("x", cx + 12)
            .attr("y", cy - rScale(levelVal) + 3)
            .style("font-size", "9px")
            .style("fill", "#4b5563")
            .style("font-weight", "600")
            .style("stroke", "#ffffff")
            .style("stroke-width", "3px")
            .style("paint-order", "stroke fill")
            .text(levelVal.toFixed(0) + "%");
    });

    // 3. Draw Axis Lines and Category Labels
    const axisGroup = chart.append("g").attr("class", "axis-group");
    totals.forEach((d, i) => {
        const angle = i * angleSlice;
        const xOuter = cx + r * Math.sin(angle);
        const yOuter = cy - r * Math.cos(angle);

        // Draw axis line from center to edge
        axisGroup.append("line")
            .attr("x1", cx)
            .attr("y1", cy)
            .attr("x2", xOuter)
            .attr("y2", yOuter)
            .attr("stroke", "#d1d5db")
            .attr("stroke-width", "1px");

        // Smart text anchors and dy offsets to prevent overlap
        let textAnchor = "middle";
        let dy = "0.35em";
        const labelX = cx + (r + 15) * Math.sin(angle);
        const labelY = cy - (r + 15) * Math.cos(angle);

        if (Math.sin(angle) > 0.1) {
            textAnchor = "start";
        } else if (Math.sin(angle) < -0.1) {
            textAnchor = "end";
        }
        if (Math.cos(angle) > 0.9) {
            dy = "0em"; // top axis label
        } else if (Math.cos(angle) < -0.9) {
            dy = "1.1em"; // bottom axis label
        }

        axisGroup.append("text")
            .attr("x", labelX)
            .attr("y", labelY)
            .attr("dy", dy)
            .attr("text-anchor", textAnchor)
            .style("font-size", "10px")
            .style("fill", "#374151")
            .text(d.detectionMethod);
    });

    // 4. Draw Radial Path Area using Percentage rates
    const radarLine = d3.lineRadial()
        .radius(d => rScale(d.percentage))
        .angle((d, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

    const pathGroup = chart.append("g").attr("class", "path-group");
    pathGroup.append("path")
        .datum(totals)
        .attr("d", radarLine)
        .attr("transform", `translate(${cx}, ${cy})`)
        .attr("fill", "#ff6b6b")
        .attr("fill-opacity", 0.35)
        .attr("stroke", "#ff6b6b")
        .attr("stroke-width", "2.5px");

    // 5. Draw Interactive Nodes at Vertices
    const nodesGroup = chart.append("g").attr("class", "nodes-group");
    const dots = nodesGroup.selectAll("circle")
        .data(totals)
        .join("circle")
        .attr("class", "bar") // matches existing interactions
        .attr("data-method", d => d.detectionMethod)
        .attr("tabindex", (d, i) => i === 0 ? "0" : "-1")
        .attr("cx", (d, i) => cx + rScale(d.percentage) * Math.sin(i * angleSlice))
        .attr("cy", (d, i) => cy - rScale(d.percentage) * Math.cos(i * angleSlice))
        .attr("r", 6)
        .attr("fill", "#ff6b6b")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", "2px")
        .style("cursor", "pointer");

    // Header title text
    chart
        .append("text")
        .attr("x", 15)
        .attr("y", 25)
        .style("font-size", "13px")
        .style("font-weight", "600")
        .text(`Fines Captured by Detection Method (%) (${metricLabel})`);

    // Rich Tooltip
    const tooltip = chart
        .append("g")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("pointer-events", "none")
        .style("z-index", 9999);

    tooltip
        .append("rect")
        .attr("width", 280)
        .attr("height", 90)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", "#ff6b6b")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);

    const tooltipText = tooltip
        .append("text")
        .attr("x", 12)
        .attr("y", 18)
        .attr("fill", "white")
        .style("font-weight", "bold")
        .style("font-size", "12px");

    const handleHover = (e, d) => {
        const circle = d3.select(e.currentTarget);
        circle.transition().duration(150)
            .attr("r", 9)
            .attr("fill", "#ff6b6b");
        
        tooltip.style("opacity", 1);
        const dotX = +circle.attr("cx");
        const dotY = +circle.attr("cy");

        tooltipText.selectAll("tspan").remove();
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 0)
            .text(`Method: ${d.detectionMethod}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 18)
            .text(`Share of Fines: ${d.percentage.toFixed(2)}%`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 18)
            .text(`Total Fines: $${d.totalFines.toLocaleString()}`);

        const tooltipWidth = 280;
        const tooltipHeight = 90;
        let tooltipX = dotX + 10;
        if (tooltipX + tooltipWidth > w) tooltipX = dotX - tooltipWidth - 10;
        let tooltipY = dotY - tooltipHeight / 2;

        tooltip.attr("transform", `translate(${tooltipX}, ${tooltipY})`);
    };

    const handleMouseLeave = (e) => {
        d3.select(e.currentTarget).transition().duration(150)
            .attr("r", 6)
            .attr("fill", "#ff6b6b");
        tooltip.style("opacity", 0);
    };

    dots
        .on("mouseenter", handleHover)
        .on("focus", handleHover)
        .on("mouseleave", handleMouseLeave)
        .on("blur", handleMouseLeave)
        .on("keydown", (e) => { if(typeof createDataPointMovement === 'function') createDataPointMovement(e, dots); })
        .on("click", (e) => { if(typeof syncClicksBetweenDPs === 'function') syncClicksBetweenDPs(e, dots); });

    // Right-click support
    addDataTableContextMenu(container.node(),
        () => totals.map(d => ({
            'Enforcement Method': d.detectionMethod,
            'Share of Fines': d.percentage.toFixed(2) + '%',
            [`Total Fines (${metricLabel})`]: '$' + d.totalFines.toLocaleString()
        })),
        () => ['Enforcement Method', 'Share of Fines', `Total Fines (${metricLabel})`],
        'Fines Captured by Detection Method',
        `An analysis of traffic fine enforcement methods showing percentage share of total revenue. Hover over a row to highlight that method on the chart.`,
        (selectedRows, clone) => {
            if (!selectedRows || selectedRows.length === 0) {
                d3.select(clone).selectAll('circle').attr('opacity', 1);
                return;
            }
            const activeMethods = selectedRows.map(r => r['Enforcement Method']);
            d3.select(clone).selectAll('circle')
                .attr('opacity', function() {
                    return activeMethods.includes(d3.select(this).attr('data-method')) ? 1 : 0.2;
                });
        }
    );
};
