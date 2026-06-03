const binGenerator = d3.bin()
    .value(d => d.energyConsumption); 
    //it will look at its energyConsumption value 
    //determine which bin it belongs to

const drawHistogram = (data) => {
    const section = d3.select("#histogram");

    // create svg container
    const svg = section
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto");

    // create chart group and move to top left
    const chart = svg
        .append("g")
        .attr("class", "histogram-chart")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const bins = binGenerator(data); //get the data and sort it into several ranges

    // pass the data to the scales 
    updateScales(bins);

    const bars = chart
        .selectAll("rect")
        .data(bins)  //if it got 10 ranges, it will create 10 rects for the 10 ranges
        .join("rect") 
        .attr("x", d => xScale(d.x0))
        .attr("width", d => xScale(d.x1) - xScale(d.x0))
        .attr("y", innerHeight)
        .attr("height", 0)
        .attr("fill", allColor)
        .attr("stroke", bodyBackgroundColor)
        .attr("stroke-width", 2)
        .call(sel => sel.transition().duration(700)
            .attr("y", d => yScale(d.length))
            .attr("height", d => innerHeight - yScale(d.length))
        );

    bars.append("title").text(d => `Frequency: ${d.length}`); //tooltip to show frequency on hover

    chart
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("font-size", "11px");

    chart
        .append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll("text")
        .style("font-size", "11px");

    chart
        .append("text")
        .attr("x", innerWidth / 2) //make it centered
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Energy Consumption (kWh/year)");

    chart
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2) //after rotate, y control the horizontal position (left/right), why negative it -> so it start from bottom, /2 to make middle
        .attr("y", -50) //place it to the left of the y-axis, 0 is the y-axis
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Frequency");
}