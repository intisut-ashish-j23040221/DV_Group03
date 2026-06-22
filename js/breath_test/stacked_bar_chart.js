const drawBreathTrendStackedBar = (data) => {
    const container = d3.select("#breath-trend-line");
    container.html("");
    container.attr("tabindex", "0")

    if (data.length === 0) return;

    // Aggregate by year - compute positive and non-positive counts
    const chartData = d3.rollups(
        data,
        v => {
            const conducted = d3.sum(v, d => d.totalConducted || 0);
            const positive = d3.sum(v, d => d.positiveBreathCount || 0);
            const other = Math.max(0, conducted - positive);
            const percent = conducted > 0 ? (positive / conducted) * 100 : 0;
            return { year: v[0].year, conducted, positive, other, percent };
        },
        d => d.year
    ).map(([year, vals]) => ({ year, ...vals }))
     .sort((a, b) => d3.ascending(a.year, b.year));

    if (chartData.length === 0) return;

    const containerWidth = container.node().getBoundingClientRect().width || width;
    // Increase right margin to 80 to make sure the right Y axis labels fit
    const currentInnerWidth = containerWidth - margin.left - 80; 
    const w = Math.max(currentInnerWidth, 100);

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${containerWidth} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = createBandScale(chartData.map(d => d.year), w, 0.2);
    const yScale = createLinearScaleY([0, d3.max(chartData, d => d.conducted)], innerHeight);
    const yScalePositive = createLinearScaleY([0, d3.max(chartData, d => d.positive)], innerHeight);

    const yAxisGroup = chart.append("g");
    const yAxisPositiveGroup = chart.append("g")
        .attr("transform", `translate(${w}, 0)`);

    const updateAxes = (showOther, showPositive) => {
        if (showOther && !showPositive) {
            yScale.domain([0, d3.max(chartData, d => d.other) || 10]);
            yAxisGroup.style("opacity", 1).call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(".2s")));
            yAxisPositiveGroup.style("opacity", 0);
        } else if (!showOther && showPositive) {
            yScale.domain([0, d3.max(chartData, d => d.positive) || 10]);
            yAxisGroup.style("opacity", 1).call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(".2s")));
            yAxisPositiveGroup.style("opacity", 0);
        } else {
            // Both shown: Dual Axis
            yScale.domain([0, d3.max(chartData, d => d.other) || 10]);
            yScalePositive.domain([0, d3.max(chartData, d => d.positive) || 10]);
            yAxisGroup.style("opacity", 1).call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(".2s")));
            
            yAxisPositiveGroup.style("opacity", 1)
                .call(d3.axisRight(yScalePositive).ticks(6).tickFormat(d3.format(".2s")));
            
            // Style right axis: #333 for text, Black for lines to link to data
            yAxisPositiveGroup.selectAll("text").style("fill", "#333").style("font-weight", "bold");
            yAxisPositiveGroup.selectAll("line, path").style("stroke", "#000000");
        }
        
        yAxisGroup.selectAll("text").style("font-size", "12px");
        yAxisPositiveGroup.selectAll("text").style("font-size", "12px");
    };

    // Bars for "Other" (Non-positive)
    const bars = chart.append("g")
        .selectAll("rect")
        .data(chartData)
        .join("rect")
        .attr("x", d => xScale(d.year))
        .attr("width", xScale.bandwidth())
        .attr("fill", "#004B87")
        .attr("data-year", d => d.year)
        .attr("data-key", "other")
        .attr("tabindex", (d, i) => i === 0 ? "0" : "-1"); // keyboard accessible

    // Line for "Positive"
    const lineGenerator = d3.line()
        .x(d => xScale(d.year) + xScale.bandwidth() / 2)
        .y(d => yScalePositive(d.positive));

    const positiveLine = chart.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", "#D32F2F")
        .attr("stroke-width", 3)
        .attr("d", lineGenerator);

    const positiveDots = chart.append("g")
        .selectAll("circle")
        .data(chartData)
        .join("circle")
        .attr("cx", d => xScale(d.year) + xScale.bandwidth() / 2)
        .attr("cy", d => yScalePositive(d.positive))
        .attr("r", 5)
        .attr("fill", "#D32F2F")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2)
        .attr("data-year", d => d.year)
        .attr("data-key", "positive")
        .attr("tabindex", (d, i) => i === 0 ? "0" : "-1"); // keyboard accessible

    const updateChartVisibility = (key) => {
        const showOther = !key || key === 'other';
        const showPositive = !key || key === 'positive';

        updateAxes(showOther, showPositive);

        bars
            .transition().duration(500)
            .attr('y', d => showOther ? yScale(d.other) : yScale(0))
            .attr('height', d => showOther ? yScale(0) - yScale(d.other) : 0)
            .attr('opacity', showOther ? 1 : 0);

        positiveLine
            .transition().duration(500)
            .attr("d", d3.line()
                .x(d => xScale(d.year) + xScale.bandwidth() / 2)
                .y(d => {
                    if (showOther && showPositive) return yScalePositive(d.positive);
                    if (showPositive) return yScale(d.positive);
                    return yScale(0);
                })
            )
            .attr('opacity', showPositive ? 1 : 0);

        positiveDots
            .transition().duration(500)
            .attr("cy", d => {
                if (showOther && showPositive) return yScalePositive(d.positive);
                if (showPositive) return yScale(d.positive);
                return yScale(0);
            })
            .attr('opacity', showPositive ? 1 : 0);
            
        // Update Y-axis labels
        chart.select(".y-label-left").text(showOther ? "Non-positive Cases" : "Positive Cases");
        chart.select(".y-label-right").style("opacity", (showOther && showPositive) ? 1 : 0);
    };

    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("font-size", "12px");

    chart.append("text")
        .attr("x", w / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("fill", "#333")
        .text("Year");

    chart.append("text")
        .attr("class", "y-label-left")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -78)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("fill", "#333")
        .text("Total Breath Tests Conducted");

    chart.append("text")
        .attr("class", "y-label-right")
        .attr("transform", "rotate(90)")
        .attr("x", innerHeight / 2)
        .attr("y", -w - 55) // Pushed labels further out to clear axis
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text("Positive Cases");

    const tooltip = chart
        .append("g")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("pointer-events", "none")
        .style("z-index", 9999);

    tooltip
        .append("rect")
        .attr("width", 300)
        .attr("height", 120)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", "#EBA746")
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
        tooltip.select('rect').attr('fill', rect.attr('fill') || '#004B87');
        
        const barX = xScale(d.year) + xScale.bandwidth() / 2;
        
        let barY;
        if (e.currentTarget.tagName === 'circle') {
             const showOther = !activeLegendKey || activeLegendKey === 'other';
             barY = (showOther && !activeLegendKey) ? yScalePositive(d.positive) : yScale(d.positive);
        } else {
             barY = yScale(d.other);
        }

        tooltipText.selectAll("tspan").remove();
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 0)
            .text(`Year: ${d.year}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Total conducted: ${d3.format(",.0f")(d.conducted)}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Non-positive: ${d3.format(",.0f")(d.other)}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Positive cases: ${d3.format(",.0f")(d.positive)}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Positive rate: ${d.percent.toFixed(2)}%`);

        const tooltipWidth = 300;
        const tooltipHeight = 120;
        let tooltipX = barX - tooltipWidth / 2;
        let tooltipY = barY > tooltipHeight + 20 ? barY - tooltipHeight - 10 : barY + 20;

        tooltipX = Math.max(5, Math.min(tooltipX, w - tooltipWidth - 5));
        tooltipY = Math.max(5, Math.min(tooltipY, innerHeight - tooltipHeight - 5));

        tooltip
            .style("opacity", 1)
            .attr("transform", `translate(${tooltipX}, ${tooltipY})`)
            .style("z-index", 9999);
    };

    // Add interactions for both keyboard and normal user
    bars
        .on("mouseenter", handleHover)
        .on("focus", handleHover)
        .on("mouseleave", () => tooltip.style("opacity", 0))
        .on("blur", () => tooltip.style("opacity", 0))
        .on("keydown", (e) => createDataPointMovement(e, bars))
        .on("click", () => syncClicksBetweenDPs(e, bars));

    positiveDots
        .on("mouseenter", handleHover)
        .on("focus", handleHover)
        .on("mouseleave", () => tooltip.style("opacity", 0))
        .on("blur", () => tooltip.style("opacity", 0))
        .on("keydown", (e) => createDataPointMovement(e, positiveDots))
        .on("click", () => syncClicksBetweenDPs(e, positiveDots));

    

    const legend = chart.append("g")
        .attr("transform", `translate(${w / 2 - 120}, ${innerHeight + 40})`);

    const legendItems = [
        { key: 'positive', label: 'Positive (Line)', color: "#D32F2F", type: 'line' },
        { key: 'other', label: 'Non-positive (Bar)', color: "#004B87", type: 'rect' }
    ];

    let activeLegendKey = null;

    const legendRows = legend.selectAll('g')
        .data(legendItems)
        .join('g')
        .attr('transform', (_, i) => `translate(${i * 150}, 0)`)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
            activeLegendKey = activeLegendKey === d.key ? null : d.key;
            
            legendRows.selectAll('text')
                .style('font-weight', item => item.key === activeLegendKey ? '700' : '400');
            
            legendRows.selectAll('.legend-mark')
                .attr('stroke', item => item.key === activeLegendKey ? '#000' : 'none')
                .attr('stroke-width', 2);

            updateChartVisibility(activeLegendKey);
        });

    legendRows.each(function(d) {
        const g = d3.select(this);
        if (d.type === 'rect') {
            g.append('rect')
                .attr('class', 'legend-mark')
                .attr('width', 14)
                .attr('height', 14)
                .attr('y', -10)
                .attr('fill', d.color);
        } else {
            g.append('line')
                .attr('x1', 0).attr('x2', 14)
                .attr('y1', -3).attr('y2', -3)
                .attr('stroke', d.color)
                .attr('stroke-width', 3);
            g.append('circle')
                .attr('class', 'legend-mark')
                .attr('cx', 7).attr('cy', -3)
                .attr('r', 4)
                .attr('fill', d.color);
        }
    });

    legendRows.append('text')
        .attr('x', 20)
        .attr('y', 0)
        .style('font-size', '12px')
        .attr('alignment-baseline', 'middle')
        .text(d => d.label);

    updateChartVisibility(null);

    addDataTableContextMenu(container.node(),
        () => chartData.map(d => ({
            Year: d.year,
            'Total Conducted': d.conducted.toLocaleString(),
            'Positive Cases': d.positive.toLocaleString(),
            'Non-positive Cases': d.other.toLocaleString(),
            'Positive Rate (%)': d.percent.toFixed(2) + '%'
        })),
        () => ['Year', 'Total Conducted', 'Positive Cases', 'Non-positive Cases', 'Positive Rate (%)'],
        'Breath Tests Conducted vs Positive Results',
        'Displays total breath tests conducted (bars) and positive results (line) by year. Uses dual axes to ensure the small positive counts are clearly visible. Formula: Positive Rate = (Positive Cases ÷ Total Conducted) × 100.',
        (selectedRows, clone) => {
            if (!selectedRows || selectedRows.length === 0) {
                d3.select(clone).selectAll('rect, circle').attr('opacity', 1);
                return;
            }
            const activeYears = selectedRows.map(r => String(r.Year));
            d3.select(clone).selectAll('rect, circle')
                .attr('opacity', function() {
                    return activeYears.includes(d3.select(this).attr('data-year')) ? 1 : 0.2;
                });
        }
    );
};
