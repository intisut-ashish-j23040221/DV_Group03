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

  // set up scales for x-axis (year) and y-axis (total fines)
  // updateLinearScales creates linear scales suitable for line charts
  updateLinearScales(
    d3.extent(yearlyTotals, d => d.year),
    [0, d3.max(yearlyTotals, d => d.total) || 0]
  );

  // create svg container
  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%")
    .style("height", "auto");

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
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.total))
    .attr("r", 4)
    .attr("fill", "#1f77b4")
    .append("title")
    .text(d => `${d.year}\n${metricLabel}: ${d.total.toLocaleString()}`);

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
    .attr("y", -margin.left + 25)
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
};
