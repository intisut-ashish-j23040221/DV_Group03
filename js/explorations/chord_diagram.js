async function drawChordDiagram() {
    const container = d3.select("#chord-diagram");
    container.html("");

    // 1. Load Dataset
    const data = await d3.csv("data/fines.csv");

    // 2. Data Processing - Aggregate Detection Methods to Outcomes
    const normalizeMethod = (m) => {
        const lower = (m || "").toLowerCase();
        if (lower.includes("camera")) return "Camera";
        if (lower.includes("police")) return "Police";
        return "Other";
    };

    const outcomes = ["Fines", "Arrests", "Charges"];
    const methods = ["Police", "Camera"];
    const names = [...methods, ...outcomes]; // Order for matrix indices: 0:Police, 1:Camera, 2:Fines, 3:Arrests, 4:Charges

    // Create 5x5 matrix
    const matrix = Array.from({ length: 5 }, () => Array(5).fill(0));

    data.forEach(d => {
        const method = normalizeMethod(d.DETECTION_METHOD);
        const mIdx = methods.indexOf(method);
        if (mIdx === -1) return;

        // Flow from Method (mIdx) to Outcome (2, 3, 4)
        matrix[mIdx][2] += +d.FINES || 0;
        matrix[mIdx][3] += +d.ARRESTS || 0;
        matrix[mIdx][4] += +d.CHARGES || 0;

        // Symmetrical for Chord (Outcomes back to Methods)
        matrix[2][mIdx] += +d.FINES || 0;
        matrix[3][mIdx] += +d.ARRESTS || 0;
        matrix[4][mIdx] += +d.CHARGES || 0;
    });

    // 3. Dimensions
    const width = 650, height = 650;
    const outerRadius = Math.min(width, height) * 0.5 - 60;
    const innerRadius = outerRadius - 20;

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending)(matrix);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const ribbon = d3.ribbon()
        .radius(innerRadius);

    const colorScale = d3.scaleOrdinal()
        .domain(names)
        .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"]);

    // 4. Draw Arcs (Outer segments)
    const groups = svg.append("g")
        .selectAll("g")
        .data(chord.groups)
        .enter().append("g");

    groups.append("path")
        .attr("d", arc)
        .style("fill", d => colorScale(names[d.index]))
        .style("stroke", d => d3.rgb(colorScale(names[d.index])).darker());

    // 5. Draw Labels
    groups.append("text")
        .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", ".35em")
        .attr("class", "titles")
        .attr("transform", d => `
            rotate(${(d.angle * 180 / Math.PI - 90)})
            translate(${outerRadius + 10})
            ${d.angle > Math.PI ? "rotate(180)" : ""}
        `)
        .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(d => names[d.index]);

    // 6. Draw Ribbons (Connections)
    svg.append("g")
        .attr("class", "ribbons")
        .selectAll("path")
        .data(chord)
        .enter().append("path")
        .attr("d", ribbon)
        .style("fill", d => colorScale(names[d.source.index]))
        .style("stroke", d => d3.rgb(colorScale(names[d.source.index])).darker())
        .style("fill-opacity", 0.6)
        .on("mouseover", function(e, d) {
            d3.selectAll(".ribbons path").style("fill-opacity", 0.1);
            d3.select(this).style("fill-opacity", 0.9);
            showTooltip(e, d);
        })
        .on("mouseout", function() {
            d3.selectAll(".ribbons path").style("fill-opacity", 0.6);
            hideTooltip();
        });

    // Tooltip Logic
    const tooltip = d3.select("body").append("div")
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
        const source = names[d.source.index];
        const target = names[d.target.index];
        const value = d.source.value;
        
        tooltip.html(`<strong>Enforcement Flow</strong><br/>
            ${source} → ${target}: ${d3.format(",")(value)} cases`)
            .style("visibility", "visible")
            .style("top", (e.pageY - 10) + "px")
            .style("left", (e.pageX + 10) + "px");
    }

    function hideTooltip() {
        tooltip.style("visibility", "hidden");
    }
}
