const drawPositiveBreathBar = (data) => {
    const container = d3.select("#percent-breath-bar");
    container.html("");

    if (data.length === 0) return;

    const jurisdictionData = Array.from(d3.rollups(
        data,
        v => d3.sum(v, d => d.positiveBreathCount),
        d => d.jurisdiction
    ), ([jurisdiction, positiveCount]) => ({ jurisdiction, positiveCount }))
    .sort((a, b) => b.positiveCount - a.positiveCount);

    if (!jurisdictionData.length) return;

    // Calculate totals and percentages
    const totalPositive = d3.sum(jurisdictionData, d => d.positiveCount);
    jurisdictionData.forEach((d, idx) => {
        d.percentage = (d.positiveCount / totalPositive) * 100;
        d.rank = idx + 1;
    });

    const containerWidth = container.node().getBoundingClientRect().width || width;
    const currentInnerWidth = containerWidth - margin.left - margin.right;
    const w = Math.max(currentInnerWidth, 400);

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${containerWidth} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = createBandScale(jurisdictionData.map(d => d.jurisdiction), w, 0.25);
    const yScale = createLinearScaleY([0, d3.max(jurisdictionData, d => d.positiveCount)], innerHeight);

    const bars = chart.selectAll("rect.bar")
        .data(jurisdictionData)
        .join("rect")
        .attr("class", "bar")
        .attr("data-jurisdiction", d => d.jurisdiction)
        .attr("x", d => xScale(d.jurisdiction))
        .attr("y", d => yScale(d.positiveCount))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d.positiveCount))
        .attr("fill", "#EBA746")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1);

    chart.selectAll("text.bar-label")
        .data(jurisdictionData)
        .join("text")
        .attr("class", "bar-label")
        .attr("x", d => xScale(d.jurisdiction) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.positiveCount) - 6)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#333")
        .text(d => d3.format(",.0f")(d.positiveCount));

    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("font-size", "12px")
        .attr("text-anchor", "middle");

    chart.append("g")
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll("text")
        .style("font-size", "12px");

    chart.append("text")
        .attr("x", w / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Jurisdiction");

    chart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -42)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Positive cases");

    // Create tooltip AFTER all other elements so it appears on top
    const tooltip = chart
        .append("g")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("pointer-events", "none")
        .style("z-index", 9999);

    // Tooltip background rectangle
    tooltip
        .append("rect")
        .attr("width", 220)
        .attr("height", 85)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", "#EBA746")
        .attr("fill-opacity", 0.95)
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

    // Add hover events to bars
    bars
        .on("mouseenter", (e, d) => {
            // Get bar position
            const rect = d3.select(e.currentTarget);
            const barX = +rect.attr("x") + xScale.bandwidth() / 2;
            const barY = +rect.attr("y");

            // Update tooltip text with multiple lines
            tooltipText.selectAll("tspan").remove();
            tooltip.select('rect').attr('fill', rect.attr('fill') || '#EBA746');
            tooltipText
                .append("tspan")
                .attr("x", 12)
                .attr("dy", 0)
                .text(`${d.jurisdiction}`);
            tooltipText
                .append("tspan")
                .attr("x", 12)
                .attr("dy", 16)
                .text(`Cases: ${d3.format(",.0f")(d.positiveCount)}`);
            tooltipText
                .append("tspan")
                .attr("x", 12)
                .attr("dy", 16)
                .text(`${d.percentage.toFixed(1)}% of total`);
            tooltipText
                .append("tspan")
                .attr("x", 12)
                .attr("dy", 16)
                .text(`Rank: #${d.rank}`);

            // Smart positioning: try above first, then right if not enough space
            const tooltipWidth = 220;
            const tooltipHeight = 85;
            const spaceAbove = barY;
            const spaceBelow = innerHeight - barY;
            const spaceLeft = barX;
            const spaceRight = w - barX;

            let tooltipX, tooltipY;

            // Try positioning above
            if (spaceAbove > tooltipHeight + 20) {
                tooltipX = barX - tooltipWidth / 2;
                tooltipY = barY - tooltipHeight - 10;
            }
            // If not enough space above, try right
            else if (spaceRight > tooltipWidth + 20) {
                tooltipX = barX + 15;
                tooltipY = barY - tooltipHeight / 2;
            }
            // Fall back to left
            else if (spaceLeft > tooltipWidth + 20) {
                tooltipX = barX - tooltipWidth - 15;
                tooltipY = barY - tooltipHeight / 2;
            }
            // Fall back to below
            else {
                tooltipX = barX - tooltipWidth / 2;
                tooltipY = barY + 50;
            }

            // Clamp to visible area
            tooltipX = Math.max(5, Math.min(tooltipX, w - tooltipWidth - 5));
            tooltipY = Math.max(5, Math.min(tooltipY, innerHeight - tooltipHeight - 5));

            // Show and position tooltip
            tooltip
                .style("opacity", 1)
                .attr("transform", `translate(${tooltipX}, ${tooltipY})`)
                .style("z-index", 9999);
        })
        .on("mouseleave", () => {
            tooltip
                .style("opacity", 0)
                .attr("transform", "translate(0, 500)")
                .style("z-index", 100);
        });

    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("font-size", "12px")
        .attr("text-anchor", "middle");

    chart.append("g")
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll("text")
        .style("font-size", "12px");

    chart.append("text")
        .attr("x", w / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Jurisdiction");

    chart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -42)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Positive cases");

    addDataTableContextMenu(container.node(),
        () => jurisdictionData.map(d => ({
            'Jurisdiction': d.jurisdiction,
            'Positive cases': d.positiveCount,
            '% of total': d.percentage.toFixed(1) + '%',
            'Rank': '#' + d.rank
        })),
        () => ['Jurisdiction', 'Positive cases', '% of total', 'Rank'],
        'Positive results by jurisdiction',
        'Bar chart showing the total positive breath test cases for each jurisdiction in the current filter selection. Hover over bars to see percentage of total cases and rank. Higher ranked jurisdictions have more positive results.',
        (row, clone) => {
            if (!row) {
                d3.select(clone).selectAll('rect.bar').attr('opacity', 1);
                return;
            }
            d3.select(clone).selectAll('rect.bar')
                .attr('opacity', function() {
                    return d3.select(this).attr('data-jurisdiction') === row.Jurisdiction ? 1 : 0.2;
                });
        }
    );
};
