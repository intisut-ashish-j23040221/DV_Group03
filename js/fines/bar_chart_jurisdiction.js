const drawJurisdictionSpeedingBar = (data, metric = 'All') => {
    const container = d3.select("#jurisdiction-speeding-bar");

    if (container.empty())
        return;

    container.selectAll("*").remove();
    container.attr("tabindex", "0")

    const metricLabel = formatMetricLabel(metric);

    const totals = d3.rollups(
        data,
        values => d3.sum(values, d => d.fines || 0),
        d => d.jurisdiction
    )
        .map(([jurisdiction, total]) => ({ jurisdiction, total }))
        .sort((a, b) => d3.descending(a.total, b.total));

    const containerWidth = container.node().getBoundingClientRect().width || width;
    const currentInnerWidth = containerWidth - margin.left - margin.right;
    const w = Math.max(currentInnerWidth, 400);

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(totals, d => d.total) || 0])
        .range([0, w])
        .nice();

    const yScale = d3.scaleBand()
        .domain(totals.map(d => d.jurisdiction))
        .range([0, innerHeight])
        .padding(0.2);

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${containerWidth} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    chart
        .selectAll("rect")
        .data(totals)
        .join("rect")
        .attr("class", "bar")
        .attr("data-jurisdiction", d => d.jurisdiction)
        .attr("tabindex", (d, i) => i === 0 ? "0" : "-1")
        .attr("x", 0)
        .attr("y", d => yScale(d.jurisdiction))
        .attr("width", d => xScale(d.total))
        .attr("height", yScale.bandwidth())
        .attr("fill", "#0f2a45");

    // Rich tooltip
    const tooltip = chart
        .append("g")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("pointer-events", "none")
        .style("z-index", 9999);

    tooltip
        .append("rect")
        .attr("width", 240)
        .attr("height", 65)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", "#0f2a45")
        .attr("fill-opacity", 0.95)
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
        const rect = d3.select(e.currentTarget);
        tooltip.style("opacity", 1);
        tooltip.select('rect').attr('fill', rect.attr('fill') || "#0f2a45");
        
        const barX = xScale(d.total);
        const barY = yScale(d.jurisdiction) + yScale.bandwidth() / 2;

        tooltipText.selectAll("tspan").remove();
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 0)
            .text(`State: ${d.jurisdiction}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 18)
            .text(`${metricLabel}: ${d.total.toLocaleString()}`);

        const tooltipWidth = 240;
        const tooltipHeight = 65;
        let tooltipX = barX + 10;
        if (tooltipX + tooltipWidth > w) tooltipX = barX - tooltipWidth - 10;
        let tooltipY = barY - tooltipHeight / 2;

        tooltip.attr("transform", `translate(${tooltipX}, ${tooltipY})`);
    };

    const bars = chart.selectAll(".bar");
    bars
        .on("mouseenter", handleHover)
        .on("focus", handleHover)
        .on("mouseleave", () => tooltip.style("opacity", 0))
        .on("blur", () => tooltip.style("opacity", 0))
        .on("keydown", (e) => { if(typeof createDataPointMovement === 'function') createDataPointMovement(e, bars); })
        .on("click", (e) => { if(typeof syncClicksBetweenDPs === 'function') syncClicksBetweenDPs(e, bars); });

    chart
        .selectAll(".bar-label")
        .data(totals)
        .join("text")
        .attr("class", "bar-label")
        .attr("x", d => xScale(d.total) + 5)
        .attr("y", d => yScale(d.jurisdiction) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", "#333")
        .text(d => d.total.toLocaleString());

    chart
        .append("g")
        .call(d3.axisLeft(yScale));

    chart
        .append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format("~s")));

    chart
        .append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 44)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(`Total ${metricLabel.toLowerCase()}`);

    chart
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -margin.left + 50)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Jurisdiction");

    chart
        .append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-size", "13px")
        .style("font-weight", "600")
        .text(`States with the highest ${metricLabel.toLowerCase()} in Australia`);

    // Right-click support
    addDataTableContextMenu(container.node(),
        () => totals.map(d => ({
            'Jurisdiction': d.jurisdiction,
            [`Total ${metricLabel}`]: d.total.toLocaleString()
        })),
        () => ['Jurisdiction', `Total ${metricLabel}`],
        'States with the Highest Fines',
        `A comparison of total ${metricLabel.toLowerCase()} across different Australian states. Hover over a row to highlight that state on the bar chart.`,
        (row, clone) => {
            if (!row) {
                d3.select(clone).selectAll('.bar').attr('opacity', 1);
                return;
            }
            d3.select(clone).selectAll('.bar')
                .attr('opacity', function() {
                    return d3.select(this).attr('data-jurisdiction') === row.Jurisdiction ? 1 : 0.2;
                });
        }
    );
};
