const drawCameraSpeedingBar = (data, metric = 'All') => {
    const container = d3.select("#camera-speeding-bar");

    if (container.empty()) {
        return;
    }

    container.selectAll("*").remove();

    const metricLabel = formatMetricLabel(metric);
    const cameraData = data.filter(d => {
        const method = (d.detectionMethod || "").toLowerCase();
        return method.includes("camera");
    });

        const totals = d3.rollups(
        cameraData,
        values => d3.sum(values, d => d.fines || 0),
        d => d.detectionMethod
    )
        .map(([detectionMethod, total]) => ({ detectionMethod, total }))
        .sort((a, b) => d3.descending(a.total, b.total));

    updateHorizontalBarScales(
        [0, d3.max(totals, d => d.total) || 0],
        totals.map(d => d.detectionMethod)
    );

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    chart
        .selectAll("rect")
        .data(totals)
        .join("rect")
        .attr("x", 0)
        .attr("y", d => yScale(d.detectionMethod))
        .attr("width", d => xScale(d.total))
        .attr("height", yScale.bandwidth())
        .attr("fill", "#ff6b6b")
        .append("title")
        .text(d => `${d.detectionMethod}\n${metricLabel}: ${d.total.toLocaleString()}`);

    chart
        .selectAll(".bar-label")
        .data(totals)
        .join("text")
        .attr("class", "bar-label")
        .attr("x", d => xScale(d.total) + 5)
        .attr("y", d => yScale(d.detectionMethod) + yScale.bandwidth() / 2)
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
        .attr("y", -margin.left + 25)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Camera type");

    chart
        .append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-size", "13px")
        .style("font-weight", "600")
        .text(`Camera type with the highest ${metricLabel.toLowerCase()}`);
};
