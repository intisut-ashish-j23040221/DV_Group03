const drawDrugTrendStackedBar = (data, isInt = false) => {
    const container = d3.select("#drug-trend-line");
    container.html("");
    container.attr("tabindex", "0"); // for keyboard accessibility

    if (data.length === 0) return;

    const chartData = d3.rollups(
        data,
        v => {
            const conducted = d3.sum(v, d => d.totalConducted || 0);
            const positive = d3.sum(v, d => d.positiveDrugCount || 0);
            const negative = Math.max(0, conducted - positive);
            const percent = conducted > 0 ? (positive / conducted) * 100 : 0;
            return { year: v[0].year, conducted, positive, negative, percent };
        },
        d => d.year
    ).map(([year, vals]) => ({ year, ...vals }))
     .sort((a, b) => d3.ascending(a.year, b.year));

    if (chartData.length === 0) return;

    const containerWidth = container.node().getBoundingClientRect().width || width;
    const currentInnerWidth = containerWidth - margin.left - margin.right;
    const w = isInt ? height : Math.max(currentInnerWidth, 100);

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${containerWidth} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const keys = ["positive", "negative"];
    const colorScale = d3.scaleOrdinal()
        .domain(keys)
        .range(["#D32F2F", "#004B87"]);

    const stack = d3.stack().keys(keys);
    const layers = stack(chartData);

    const xScale = createBandScale(chartData.map(d => d.year), w, 0.2);
    const yScale = createLinearScaleY([0, d3.max(chartData, d => d.conducted)], innerHeight);

    const yAxisGroup = chart.append("g");
    const updateYAxis = (maxValue) => {
        yScale.domain([0, maxValue]);
        yAxisGroup
            .call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(".2s")))
            .selectAll("text")
            .style("font-size", "12px");
    };

    const stackedSegments = layers.flatMap(layer => layer.map(segment => ({ ...segment, key: layer.key })));

    const bars = chart.append("g")
        .selectAll("g")
        .data(layers)
        .join("g")
        .attr("fill", d => colorScale(d.key))
        .selectAll("rect")
        .data(layer => layer.map(segment => ({ ...segment, key: layer.key })))
        .join("rect")
        .attr("x", d => xScale(d.data.year))
        .attr("y", d => yScale(d[1]))
        .attr("height", d => yScale(d[0]) - yScale(d[1]))
        .attr("width", xScale.bandwidth())
        .attr("data-year", d => d.data.year)
        .attr("data-key", d => d.key)
        .attr("fill", d => colorScale(d.key))
        .attr("tabindex", (d, i) => i === 0 ? "0" : "-1"); // keyboard accessible;

    const labels = chart.append("g")
        .selectAll("text")
        .data(stackedSegments)
        .join("text")
        .attr("x", d => xScale(d.data.year) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d[0]) - (yScale(d[0]) - yScale(d[1])) / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "11px")
        .style("fill", "white")
        .style("pointer-events", "none")
        .attr("class", "text-value-label")
        .text(d => {
            const value = d[1] - d[0];
            return value > 0 ? d3.format(".2s")(value) : "";
        });

    const updateChartVisibility = (key) => {
        const maxValue = key ? d3.max(chartData, d => d[key]) : d3.max(chartData, d => d.conducted);
        updateYAxis(maxValue);

        bars
            .attr('y', d => {
                if (!key || d.key === key) return yScale(d[1]);
                return yScale(0);
            })
            .attr('height', d => {
                if (!key || d.key === key) return yScale(d[0]) - yScale(d[1]);
                return 0;
            })
            .attr('opacity', d => !key || d.key === key ? 1 : 0);

        labels
            .attr('y', d => {
                if (!key || d.key === key) return yScale(d[0]) - (yScale(d[0]) - yScale(d[1])) / 2;
                return yScale(0);
            })
            .attr('opacity', d => {
                if (!key || d.key === key) return ((yScale(d[0]) - yScale(d[1])) > 18 ? 1 : 0);
                return 0;
            });
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

    updateYAxis(d3.max(chartData, d => d.conducted));

    chart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -margin.left + 10)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("fill", "#333")
        .text("Total Drug Tests Conducted");

    // Legend for stacked segments (horizontal under x-axis)
    const legend = chart.append("g")
        .attr("transform", `translate(${w / 2 - 100}, ${innerHeight + 40})`);

    const legendItems = [
        { key: 'positive', label: 'Positive' },
        { key: 'negative', label: 'Non-positive' }
    ];

    let activeLegendKey = null;

    const updateLegendHighlight = (key) => {
        chart.selectAll('rect')
            .filter(function() { return d3.select(this).attr('data-key'); })
            .attr('opacity', d => {
                if (!key) return 1;
                return d.key === key ? 1 : 0.2;
            });

        legendRows.selectAll('rect')
            .attr('stroke', d => d.key === key ? '#000' : 'none')
            .attr('stroke-width', d => d.key === key ? 2 : 0);

        legendRows.selectAll('text')
            .style('font-weight', d => d.key === key ? '700' : '400');
    };

    const legendRows = legend.selectAll('g')
        .data(legendItems)
        .join('g')
        .attr('transform', (_, i) => `translate(${i * 140}, 0)`)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
            activeLegendKey = activeLegendKey === d.key ? null : d.key;
            updateLegendHighlight(activeLegendKey);
            updateChartVisibility(activeLegendKey);
        });

    legendRows.append('rect')
        .attr('width', 14)
        .attr('height', 14)
        .attr('y', -10)
        .attr('fill', d => colorScale(d.key));

    legendRows.append('text')
        .attr('x', 20)
        .attr('y', 0)
        .style('font-size', '12px')
        .attr('alignment-baseline', 'middle')
        .text(d => d.label);

    updateLegendHighlight(activeLegendKey);
    updateChartVisibility(activeLegendKey);

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
        const barX = +rect.attr("x") + xScale.bandwidth() / 2;
        const barY = +rect.attr("y");
        const row = d.data;

        tooltipText.selectAll("tspan").remove();
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 0)
            .text(`Year: ${row.year}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Segment: ${d.key === 'positive' ? 'Positive' : 'Non-positive'}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Total tests: ${d3.format(",.0f")(row.conducted)}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Positive cases: ${d3.format(",.0f")(row.positive)}`);
        tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", 16)
            .text(`Positive rate (%): ${row.percent.toFixed(2)}%`);

        const tooltipWidth = 300;
        const tooltipHeight = 120;
        const spaceAbove = barY;

        let tooltipX = barX - tooltipWidth / 2;
        let tooltipY = spaceAbove > tooltipHeight + 20 ? barY - tooltipHeight - 10 : barY + 20;

        tooltipX = Math.max(5, Math.min(tooltipX, w - tooltipWidth - 5));
        tooltipY = Math.max(5, Math.min(tooltipY, innerHeight - tooltipHeight - 5));

        tooltip
            .style("opacity", 1)
            .attr("transform", `translate(${tooltipX}, ${tooltipY})`)
            .style("z-index", 9999);
    }


    let chartType = chart.selectAll("rect")
        .filter(function() { return d3.select(this).attr("data-key"); })
    
    chartType
        .on("mouseenter", handleHover)
        .on("focus", handleHover)
        .on("mouseleave", tooltip.style("opacity", 0).attr("transform", "translate(0, 500)").style("z-index", 100))
        .on("blur", tooltip.style("opacity", 0).attr("transform", "translate(0, 500)").style("z-index", 100))
        .on("keydown", (e) => createDataPointMovement(e, chartType))
        .on("click", (e) => syncClicksBetweenDPs(e, chartType));

    // (Removed) summary-percent text display — not needed in this chart layout

    addDataTableContextMenu(container.node(),
        () => chartData.map(d => ({
            Year: d.year,
            'Total Drug Tests Conducted': d.conducted.toLocaleString(),
            'Positive Cases': d.positive.toLocaleString(),
            'Non-positive Cases': d.negative.toLocaleString(),
            'Positive Rate (%)': d.percent.toFixed(2) + '%'
        })),
        () => ['Year', 'Total Drug Tests Conducted', 'Positive Cases', 'Non-positive Cases', 'Positive Rate (%)'],
        'Drug Tests Conducted vs Positive Results',
        'Displays drug tests conducted by year with positive and non-positive segments stacked together. Positive Rate (%) is calculated as (Positive Cases ÷ Total Drug Tests Conducted) × 100.',
        (row, clone) => {
            if (!row) {
                d3.select(clone).selectAll('rect').attr('opacity', 1);
                return;
            }
            d3.select(clone).selectAll('rect')
                .attr('opacity', function() {
                    return d3.select(this).attr('data-year') === String(row.Year) ? 1 : 0.2;
                });
        }
    );
};