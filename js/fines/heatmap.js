const drawLocationHeatmap = data => {
    const container = d3.select("#location-heatmap");

    if (container.empty()) {
        return;
    }

    container.selectAll("*").remove();

    const monthDomain = d3.range(1, 13);
    const locationDomain = Array.from(new Set(data.map(d => d.location))).sort(d3.ascending);

    locationDomain.shift();

    const finesByCell = new Map();

    data.forEach(d => {
        const key = `${d.location}|${d.month}`;
        finesByCell.set(key, (finesByCell.get(key) || 0) + (d.fines || 0));
    });

    const cells = [];
    locationDomain.forEach(location => {
        monthDomain.forEach(month => {
            const key = `${location}|${month}`;
            cells.push({
                location,
                month,
                value: finesByCell.get(key) || 0
            });
        });
    });

    const maxValue = d3.max(cells, d => d.value) || 0;

    updateHeatmapScales(monthDomain, locationDomain);

    const heatmapColorScale = d3.scaleSequential()
        .domain([0, maxValue])
        .interpolator(d3.interpolateYlOrRd);

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto");

    const chart = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    chart
        .selectAll("rect")
        .data(cells)
        .join("rect")
        .attr("x", d => xScale(d.month))
        .attr("y", d => yScale(d.location))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("rx", 2)
        .attr("fill", d => heatmapColorScale(d.value))
        .append("title")
        .text(d => `Location: ${d.location}\nMonth: ${d.month}\nFines: ${d.value.toLocaleString()}`);

    chart
        .append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale));

    chart
        .append("g")
        .call(d3.axisLeft(yScale));

    chart
        .append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Month");

    chart
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -margin.left + 25)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Location");

    const legendWidth = Math.min(260, innerWidth);
    const legendHeight = 10;
    const legendX = innerWidth - legendWidth;
    const legendY = -15;

    const defs = svg.append("defs");
    const gradientId = "heatmap-gradient";

    const gradient = defs
        .append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    const gradientStops = d3.range(0, 1.01, 0.1);
    gradientStops.forEach(stop => {
        gradient
            .append("stop")
            .attr("offset", `${stop * 100}%`)
            .attr("stop-color", heatmapColorScale(stop * maxValue));
    });

    chart
        .append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("fill", `url(#${gradientId})`);

    const legendScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, legendWidth]);

    chart
        .append("g")
        .attr("transform", `translate(${legendX}, ${legendY + legendHeight})`)
        .call(d3.axisBottom(legendScale).ticks(4).tickFormat(d3.format("~s")))
        .select(".domain")
        .remove();

    chart
        .append("text")
        .attr("x", legendX)
        .attr("y", legendY - 4)
        .style("font-size", "11px")
        .text("Fines");
};
