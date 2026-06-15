async function drawRadarChart() {
    const container = d3.select("#radar-chart");
    container.html("");

    // 1. Load All Datasets
    const [fines, breath, drug] = await Promise.all([
        d3.csv("data/fines.csv"),
        d3.csv("data/breath_data.csv"),
        d3.csv("data/drug_data.csv")
    ]);

    // 2. Data Processing - Aggregate by Jurisdiction
    const jurisdictions = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
    
    const radarData = jurisdictions.map(jur => {
        const jurisFines = fines.filter(d => d.JURISDICTION === jur);
        const jurisBreath = breath.filter(d => d.JURISDICTION === jur);
        const jurisDrug = drug.filter(d => d.JURISDICTION === jur);

        return {
            jurisdiction: jur,
            axes: [
                { axis: "Total Fines", value: d3.sum(jurisFines, d => +d.FINES || 0) },
                { axis: "Arrests", value: d3.sum(jurisFines, d => +d.ARRESTS || 0) },
                { axis: "Charges", value: d3.sum(jurisFines, d => +d.CHARGES || 0) },
                { axis: "Breath Pos Rate", value: d3.mean(jurisBreath, d => +d["% positive breath test results"] || 0) },
                { axis: "Drug Pos Rate", value: d3.mean(jurisDrug, d => +d["% positive drug test results"] || 0) }
            ]
        };
    });

    // 3. Normalization (Radar needs relative scales 0-1)
    const axesNames = radarData[0].axes.map(a => a.axis);
    const maxValues = {};
    axesNames.forEach(axis => {
        maxValues[axis] = d3.max(radarData, d => d.axes.find(a => a.axis === axis).value) || 1;
    });

    radarData.forEach(d => {
        d.axes.forEach(a => {
            a.normalized = a.value / maxValues[a.axis];
        });
    });

    // 4. Chart Dimensions
    const width = 600, height = 600;
    const margin = 100;
    const radius = Math.min(width, height) / 2 - margin;
    const angleSlice = (Math.PI * 2) / axesNames.length;

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // 5. Draw the Circular Grid (Web) with Labels
    const levels = 5;
    for (let j = 0; j < levels; j++) {
        const r = (radius / levels) * (j + 1);
        svg.append("circle")
            .attr("cx", 0).attr("cy", 0).attr("r", r)
            .style("fill", "none").style("stroke", "#CDCDCD")
            .style("stroke-dasharray", "4,4");
        
        // Add percentage labels to the grid
        svg.append("text")
            .attr("x", 5)
            .attr("y", -r)
            .attr("dy", "0.4em")
            .style("font-size", "10px")
            .attr("fill", "#737373")
            .text(`${(j + 1) * 20}%`);
    }

    // 6. Draw Axes
    const axis = svg.selectAll(".axis")
        .data(axesNames)
        .enter().append("g")
        .attr("class", "axis");

    axis.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", (d, i) => radius * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y2", (d, i) => radius * Math.sin(angleSlice * i - Math.PI / 2))
        .style("stroke", "#CDCDCD").style("stroke-width", "1px");

    axis.append("text")
        .attr("class", "legend")
        .style("font-size", "14px").style("font-weight", "bold")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("x", (d, i) => (radius + 40) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y", (d, i) => (radius + 40) * Math.sin(angleSlice * i - Math.PI / 2))
        .text(d => d);

    // 7. Render Blobs
    const radarLine = d3.lineRadial()
        .radius(d => d.normalized * radius)
        .angle((d, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    const blobGroup = svg.append("g").attr("class", "blobs");

    let activeJurisdictions = [];

    const updateChart = () => {
        const selectedData = radarData.filter(d => activeJurisdictions.includes(d.jurisdiction));
        
        const blobs = blobGroup.selectAll(".radar-blob")
            .data(selectedData, d => d.jurisdiction);

        const enter = blobs.enter().append("g")
            .attr("class", "radar-blob");

        enter.append("path")
            .attr("d", d => radarLine(d.axes))
            .style("fill", d => colorScale(jurisdictions.indexOf(d.jurisdiction)))
            .style("fill-opacity", 0)
            .style("stroke", d => colorScale(jurisdictions.indexOf(d.jurisdiction)))
            .style("stroke-width", "3px")
            .transition().duration(500)
            .style("fill-opacity", 0.3);

        blobs.exit().transition().duration(300).style("fill-opacity", 0).remove();
        
        // Tooltip interaction
        blobGroup.selectAll("path")
            .on("mouseover", function(e, d) {
                d3.selectAll(".radar-blob path").style("fill-opacity", 0.1);
                d3.select(this).style("fill-opacity", 0.6);
                showTooltip(e, d);
            })
            .on("mouseout", function() {
                d3.selectAll(".radar-blob path").style("fill-opacity", 0.3);
                hideTooltip();
            });
    };

    // 8. Dropdown & Controls Integration
    const select = d3.select("#radar-state-select");
    select.html("");
    select.append("option").text("Choose a state...").attr("value", "");
    jurisdictions.forEach(j => select.append("option").text(j).attr("value", j));

    select.on("change", function() {
        const val = this.value;
        if (val && !activeJurisdictions.includes(val)) {
            activeJurisdictions.push(val);
            updateChart();
        }
        this.value = ""; // Reset dropdown
    });

    d3.select("#radar-reset-btn").on("click", () => {
        activeJurisdictions = [];
        updateChart();
    });

    // Initial state: Show NSW so it's not empty
    activeJurisdictions = ["NSW"];
    updateChart();

    // Tooltip Logic
    const tooltip = d3.select("body").append("div")
        .attr("class", "radar-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(0,0,0,0.85)")
        .style("color", "white")
        .style("padding", "12px")
        .style("border-radius", "8px")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("z-index", "10001")
        .style("box-shadow", "0 4px 15px rgba(0,0,0,0.3)");

    function showTooltip(e, d) {
        let html = `<strong style="font-size: 14px; color: ${colorScale(jurisdictions.indexOf(d.jurisdiction))}">${d.jurisdiction} Profile</strong><hr style="margin: 8px 0; border: 0; border-top: 1px solid rgba(255,255,255,0.2)"/>`;
        d.axes.forEach(a => {
            html += `<div style="display: flex; justify-content: space-between; gap: 20px;">
                <span>${a.axis}:</span>
                <span style="font-weight: bold;">${d3.format(",.2s")(a.value)}</span>
            </div>`;
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

drawRadarChart();
