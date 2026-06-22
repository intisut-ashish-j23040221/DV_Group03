const drawJurisdictionBreathBar = (data) => {
    const container = d3.select("#jurisdiction-breath-bar");
    if (container.empty()) {
        console.warn("Jurisdiction breath bar container not found");
        return;
    }

    container.html(""); // Clear previous
    container.attr("tabindex", "0"); // for keyboard accessibility

    if (data.length === 0) return;

    const totals = d3.rollups(
        data,
        v => ({
            rate: d3.mean(v, d => d.per10kLicenses || 0),
            totalConducted: d3.sum(v, d => d.totalConducted || 0),
            totalLicenses: d3.sum(v, d => d.totalLicenses || 0)
        }),
        d => d.jurisdiction
    ).map(([jurisdiction, values]) => ({
        jurisdiction,
        rate: values.rate,
        totalConducted: values.totalConducted,
        totalLicenses: values.totalLicenses
    }))
     .sort((a, b) => d3.descending(a.rate, b.rate));

    const containerWidth = container.node().getBoundingClientRect().width || width;
    const currentInnerWidth = containerWidth - margin.left - margin.right;
    const w = Math.max(currentInnerWidth, 100);

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${containerWidth} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = createLinearScale([0, d3.max(totals, d => d.rate)], w);
    const yScale = createVerticalBandScale(totals.map(d => d.jurisdiction), innerHeight, 0.2);

    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d.toFixed(0)))
        .selectAll("text")
        .style("font-size", "12px");

    chart.append("text")
        .attr("x", w / 2)
        .attr("y", innerHeight + 38)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#333")
        .text("Per 10,000 licenses");

    chart.append("g")
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("font-size", "12px");

    chart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -52)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#333")
        .text("Jurisdiction");

    const bars = chart.selectAll(".bar")
        .data(totals)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("data-jurisdiction", d => d.jurisdiction)
        .attr("x", 0)
        .attr("y", d => yScale(d.jurisdiction))
        .attr("height", yScale.bandwidth())
        .attr("width", d => xScale(d.rate))
        .attr("fill", "#004B87")
        .attr("tabindex", (d, i) => i === 0 ? "0" : "-1"); 

    chart.selectAll(".label")
        .data(totals)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => xScale(d.rate) + 5)
        .attr("y", d => yScale(d.jurisdiction) + yScale.bandwidth() / 2 + 4)
        .text(d => d.rate.toFixed(1))
        .style("font-size", "11px")
        .attr("fill", "#333");

    // Create tooltip AFTER labels so it appears on top
    const tooltip = chart
        .append("g")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("pointer-events", "none")
        .style("z-index", 9999);

    // Tooltip background rectangle
    tooltip
        .append("rect")
        .attr("width", 300)
        .attr("height", 110)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", "#EBA746")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);

    // Tooltip text
    const tooltipText = tooltip
        .append("text")
        .attr("x", 12)
        .attr("y", 18)
        .attr("fill", "white")
        .style("font-weight", "bold")
        .style("font-size", "12px");

    const handleHover = (e, d) => {
        const rect = d3.select(e.currentTarget);
        tooltip.select('rect').attr('fill', rect.attr('fill') || '#004B87');
        const barX = +rect.attr("x") + +rect.attr("width");
        const barY = +rect.attr("y") + yScale.bandwidth() / 2;

        tooltipText.selectAll("tspan").remove();
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 0)
            .text(`Jurisdiction: ${d.jurisdiction}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Total Breath Tests Conducted: ${d3.format(",.0f")(d.totalConducted)}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Total Licenses: ${d3.format(",.0f")(d.totalLicenses)}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Tests per 10,000 Licenses: ${d.rate.toFixed(1)}`);

        const tooltipWidth = 300;
        const tooltipHeight = 110;
        const spaceRight = w - barX;

        let tooltipX, tooltipY;
        if (spaceRight > tooltipWidth + 20) {
            tooltipX = barX + 10;
        } else {
            tooltipX = barX - tooltipWidth - 10;
        }
        tooltipY = barY - tooltipHeight / 2;

        tooltipX = Math.max(25, Math.min(tooltipX, w - tooltipWidth - 5));
        tooltipY = Math.max(25, Math.min(tooltipY, innerHeight - tooltipHeight - 5));

        tooltip
            .style("opacity", 1)
            .attr("transform", `translate(${tooltipX}, ${tooltipY})`)
            .style("z-index", 9999);
    }

    // Add hover events to bars
    chart.selectAll(".bar")
        .on("mouseenter", handleHover)
        .on("focus", handleHover)
        .on("mouseleave", () => tooltip.style("opacity", 0).attr("transform", "translate(0, 500)").style("z-index", 100))
        .on("blur", () => tooltip.style("opacity", 0).attr("transform", "translate(0, 500)").style("z-index", 100))
        .on("keydown", (e) => createDataPointMovement(e, bars))
        .on("click", (e) => syncClicksBetweenDPs(e, bars));

    // Attach right-click context menu
    addDataTableContextMenu(container.node(),
        () => totals.map(d => ({
            Jurisdiction: d.jurisdiction,
            'Total Breath Tests Conducted': d.totalConducted,
            'Total Licenses': d.totalLicenses,
            'Tests per 10,000 Licenses': d.rate.toFixed(2)
        })),
        () => ['Jurisdiction', 'Total Breath Tests Conducted', 'Total Licenses', 'Tests per 10,000 Licenses'],
        'Breath Tests per 10,000 Licenses by Jurisdiction',
        'Normalizes the number of breath tests conducted by the number of active licenses in each jurisdiction. Formula: (Total Breath Tests Conducted ÷ Total Licenses) × 10,000. Higher values indicate more intensive testing relative to the licensed driver population.',
        (row, clone) => {
            if (!row) {
                d3.select(clone).selectAll('.bar').attr('opacity', 1);
                return;
            }
            const activeJurs = Array.isArray(row)
                ? row.map(r => r.Jurisdiction)
                : [row.Jurisdiction];
            d3.select(clone).selectAll('.bar')
                .attr('opacity', function() {
                    return activeJurs.includes(d3.select(this).attr('data-jurisdiction')) ? 1 : 0.2;
                });
        }
    );
};
