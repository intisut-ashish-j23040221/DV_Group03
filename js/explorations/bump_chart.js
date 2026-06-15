async function drawBumpChart() {
    const container = d3.select("#bump-chart");
    container.html("");

    // 1. Load Dataset
    const data = await d3.csv("data/breath_data.csv");

    // 2. Data Processing - Rank states by safety (lowest % positive) per year
    const years = Array.from(new Set(data.map(d => +d.YEAR))).sort(d3.ascending);
    const jurisdictions = Array.from(new Set(data.map(d => d.JURISDICTION)));

    // Create a structured data array for ranking
    const bumpData = years.map(year => {
        const yearData = data.filter(d => +d.YEAR === year)
            .map(d => ({
                jurisdiction: d.JURISDICTION,
                rate: +d["% positive breath test results"] || 0
            }))
            .sort((a, b) => d3.ascending(a.rate, b.rate)); // Lowest rate = Rank 1

        // Assign ranks (1-based)
        yearData.forEach((d, i) => d.rank = i + 1);
        
        return { year, ranks: yearData };
    });

    // Flatten data for D3 line generator
    const series = jurisdictions.map(jur => {
        return {
            jurisdiction: jur,
            values: bumpData.map(d => {
                const jurRank = d.ranks.find(r => r.jurisdiction === jur);
                return { year: d.year, rank: jurRank ? jurRank.rank : null };
            }).filter(v => v.rank !== null)
        };
    });

    // 3. Chart Dimensions
    const margin = { top: 40, right: 100, bottom: 50, left: 60 };
    const width = container.node().getBoundingClientRect().width || 1000;
    const height = 550;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 4. Scales
    const xScale = d3.scalePoint()
        .domain(years)
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([1, jurisdictions.length])
        .range([0, innerHeight]); // Note: Rank 1 is at top (0px)

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // 5. Line Generator
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.rank))
        .curve(d3.curveMonotoneX);

    // 6. Draw Lines (Ribbons)
    const lines = chart.selectAll(".bump-line")
        .data(series)
        .enter().append("path")
        .attr("class", "bump-line")
        .attr("d", d => line(d.values))
        .style("fill", "none")
        .style("stroke", d => colorScale(d.jurisdiction))
        .style("stroke-width", "4px")
        .style("stroke-opacity", 0.7)
        .style("cursor", "pointer")
        .on("mouseover", function(e, d) {
            d3.selectAll(".bump-line").style("stroke-opacity", 0.1);
            d3.select(this).style("stroke-opacity", 1).style("stroke-width", "6px");
            showTooltip(e, d);
        })
        .on("mouseout", function() {
            d3.selectAll(".bump-line").style("stroke-opacity", 0.7).style("stroke-width", "4px");
            hideTooltip();
        });

    // 7. Add Year Labels (Axes)
    chart.append("g")
        .attr("transform", `translate(0, ${innerHeight + 20})`)
        .call(d3.axisBottom(xScale).tickSize(0))
        .select(".domain").remove();

    // 8. Add End Labels (State Names)
    chart.selectAll(".end-label")
        .data(series)
        .enter().append("text")
        .attr("class", "end-label")
        .attr("x", innerWidth + 10)
        .attr("y", d => yScale(d.values[d.values.length-1].rank))
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", d => colorScale(d.jurisdiction))
        .text(d => d.jurisdiction);

    // 9. Add Ranking Dots
    series.forEach(jurSeries => {
        chart.selectAll(`.dot-${jurSeries.jurisdiction}`)
            .data(jurSeries.values)
            .enter().append("circle")
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.rank))
            .attr("r", 5)
            .style("fill", colorScale(jurSeries.jurisdiction))
            .style("stroke", "white")
            .style("stroke-width", "2px");
    });

    // Tooltip Logic
    const tooltip = d3.select("body").append("div")
        .attr("class", "bump-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "white")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("z-index", "10001");

    function showTooltip(e, d) {
        let html = `<strong>${d.jurisdiction} Ranking History</strong><br/><br/>`;
        d.values.forEach(v => {
            html += `${v.year}: Rank ${v.rank}<br/>`;
        });
        tooltip.html(html)
            .style("visibility", "visible")
            .style("top", (e.pageY - 10) + "px")
            .style("left", (e.pageX + 10) + "px");
    }

    function hideTooltip() {
        tooltip.style("visibility", "hidden");
    }
}
