const drawFinesLineChart = (data, metric = 'All') => {
  const container = d3.select("#fines-line-chart");

  // early exit if container doesn't exist
  if (container.empty()) {
    return;
  }

  container.selectAll("*").remove();

  const metricLabel = formatMetricLabel(metric);

  // aggregate fines by year
  const yearlyTotals = d3.rollups(
    data,
    values => d3.sum(values, d => d.fines || 0),
    d => d.year
  )
    .map(([year, total]) => ({ year: +year, total }))
    .sort((a, b) => d3.ascending(a.year, b.year));

  const containerWidth = container.node().getBoundingClientRect().width || width;
  const currentInnerWidth = containerWidth - margin.left - margin.right;
  const w = Math.max(currentInnerWidth, 400);

  const xScale = d3.scaleLinear()
    .domain(d3.extent(yearlyTotals, d => d.year))
    .range([0, w]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(yearlyTotals, d => d.total) || 0])
    .range([innerHeight, 0])
    .nice();

  // create svg container
  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${containerWidth} ${height}`)
    .attr("width", "100%")
    .attr("height", "100%");

  // create chart group and move to top-left
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // line generator: converts data points to SVG path
  const lineGenerator = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.total))
    .curve(d3.curveMonotoneX); // smooth curve without overshoot

  // draw the line path
  chart
    .append("path")
    .datum(yearlyTotals)
    .attr("fill", "none")
    .attr("stroke", "#1f77b4")
    .attr("stroke-width", 3)
    .attr("d", lineGenerator);

  // draw data points as circles
  chart
    .selectAll("circle")
    .data(yearlyTotals)
    .join("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.total))
    .attr("r", 4)
    .attr("fill", "#1f77b4");

  // Rich tooltip
  const tooltip = chart
      .append("g")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("pointer-events", "none")
      .style("z-index", 9999);

  tooltip
      .append("rect")
      .attr("width", 200)
      .attr("height", 65)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", "#1f77b4")
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

  chart.selectAll(".dot")
      .on("mouseenter", (e, d) => {
          const dot = d3.select(e.currentTarget);
          tooltip.style("opacity", 1);
          tooltip.select('rect').attr('fill', dot.attr('fill') || "#1f77b4");
          
          const barX = xScale(d.year);
          const barY = yScale(d.total);

          tooltipText.selectAll("tspan").remove();
          tooltipText
              .append("tspan")
              .attr("x", 12)
              .attr("dy", 0)
              .text(`Year: ${d.year}`);
          tooltipText
              .append("tspan")
              .attr("x", 12)
              .attr("dy", 18)
              .text(`${metricLabel}: ${d.total.toLocaleString()}`);

          const tooltipWidth = 200;
          const tooltipHeight = 65;
          let tooltipX = barX + 10;
          if (tooltipX + tooltipWidth > w) tooltipX = barX - tooltipWidth - 10;
          let tooltipY = barY - tooltipHeight - 10;
          if (tooltipY < 0) tooltipY = barY + 10;

          tooltip.attr("transform", `translate(${tooltipX}, ${tooltipY})`);
          d3.select(e.currentTarget).attr("r", 7);
      })
      .on("mouseleave", (e) => {
          tooltip.style("opacity", 0);
          d3.select(e.currentTarget).attr("r", 4);
      });

  // draw axes
  chart
    .append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
    .selectAll("text")
    .style("font-size", "11px");

  chart
    .append("g")
    .call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format("~s")))
    .selectAll("text")
    .style("font-size", "11px");

  // x-axis label
  chart
    .append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 45)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Year");

  // y-axis label
  chart
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -margin.left + 50)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Total Fines");

  // chart title
  chart
    .append("text")
    .attr("x", 0)
    .attr("y", -10)
    .style("font-size", "13px")
    .style("font-weight", "600")
    .text(`Yearly ${metricLabel.toLowerCase()}`);

  // Right-click support
  addDataTableContextMenu(container.node(),
    () => yearlyTotals.map(d => ({
        'Year': d.year,
        [`Total ${metricLabel}`]: d.total.toLocaleString()
    })),
    () => ['Year', `Total ${metricLabel}`],
    'Fines Trend Over Time',
    `Displays the yearly progression of total ${metricLabel.toLowerCase()} in Australia. Hover over a row to highlight that year's data point on the chart.`,
    (row, clone) => {
        if (!row) {
            d3.select(clone).selectAll('circle').attr('r', 4).attr('opacity', 1);
            return;
        }
        d3.select(clone).selectAll('circle')
            .attr('opacity', d => d.year === row.Year ? 1 : 0.2)
            .attr('r', d => d.year === row.Year ? 8 : 4);
    }
  );
};
