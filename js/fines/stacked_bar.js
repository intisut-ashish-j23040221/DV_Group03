const drawLocationStackedBar = data => {
    const container = d3.select("#location-stacked-bar");

    if (container.empty()) {
        return;
    }

    container.selectAll("*").remove();

    const normalizeDetectionMethod = method => {
        const lower = (method || "").toLowerCase();
        return lower.includes("camera") ? "Camera" : method;
    };

    const grouped = d3.rollups(
        data,
        values => d3.sum(values, d => d.fines || 0),
        d => d.location,
        d => normalizeDetectionMethod(d.detectionMethod)
    );

    const chartData = grouped.map(([location, methodRows]) => {
        const row = { location };

        methodRows.forEach(([method, total]) => {
            row[method] = total;
        });

        return row;
    });

    const keys = Array.from(new Set(data.map(d => normalizeDetectionMethod(d.detectionMethod))))
        .sort(d3.ascending);

    chartData.sort((a, b) => {
        const totalA = d3.sum(keys, key => a[key] || 0);
        const totalB = d3.sum(keys, key => b[key] || 0);
        return d3.descending(totalA, totalB);
    });

    updateBandScales(
        chartData.map(d => d.location),
        [0, d3.max(chartData, d => d3.sum(keys, key => d[key] || 0)) || 0]
    );

    const colorScaleTab = d3.scaleOrdinal()
        .domain(keys)
        .range(d3.schemeTableau10);

    const stack = d3.stack().keys(keys);
    const layers = stack(chartData);

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    chart
        .append("g")
        .selectAll("g")
        .data(layers)
        .join("g")
        .attr("fill", d => colorScaleTab(d.key))
        .selectAll("rect")
        .data(layer => layer.map(segment => ({ ...segment, key: layer.key })))
        .join("rect")
        .attr("x", d => xScale(d.data.location))
        .attr("y", d => yScale(d[1]))
        .attr("height", d => yScale(d[0]) - yScale(d[1]))
        .attr("width", xScale.bandwidth())
        .append("title")
        .text(d => `${d.data.location}\n${d.key}: ${(d[1] - d[0]).toLocaleString()} fines`);

    const locationTooltipText = row => {
        const total = d3.sum(keys, key => row[key] || 0);
        const distribution = keys
            .map(key => ({ key, value: row[key] || 0 }))
            .filter(item => item.value > 0)
            .sort((a, b) => d3.descending(a.value, b.value))
            .map(item => {
                const share = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
                return `${item.key}: ${item.value.toLocaleString()} (${share}%)`;
            });

        return [
            row.location,
            `Total fines: ${total.toLocaleString()}`,
            "",
            ...distribution
        ].join("\n");
    };

    chart
        .append("g")
        .selectAll("rect")
        .data(chartData)
        .join("rect")
        .attr("x", d => xScale(d.location))
        .attr("y", 0)
        .attr("width", xScale.bandwidth())
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .append("title")
        .text(d => locationTooltipText(d));

    chart
        .append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.6em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-30)");

    chart
        .append("g")
        .call(d3.axisLeft(yScale).ticks(8).tickFormat(d3.format("~s")));

    chart
        .append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 95)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("LOCATION");

    chart
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -margin.left + 25)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Total Fines");

    const legend = chart
        .append("g")
        .attr("transform", `translate(${innerWidth + 20}, 10)`);

    const legendRows = legend
        .selectAll("g")
        .data(keys)
        .join("g")
        .attr("transform", (_, i) => `translate(0, ${i * 22})`);

    legendRows
        .append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", d => colorScaleTab(d));

    legendRows
        .append("text")
        .attr("x", 20)
        .attr("y", 11)
        .style("font-size", "12px")
        .text(d => d);
};
