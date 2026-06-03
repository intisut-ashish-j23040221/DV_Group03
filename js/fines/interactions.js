const populateFilters = (data) => {

//create a list of filters with id, label and active status.
const filters_screen = [
    { id: "all", label: "All", isActive: true },
    { id: "LED", label: "LED", isActive: false },
    { id: "LCD", label: "LCD", isActive: false },
    { id: "OLED", label: "OLED", isActive: false }
];

d3.select("#filters_screen")
    .selectAll(".filter")
    .data(filters_screen)
    .join("button") 
        .attr("class", d => `filter ${d.id} ${d.isActive ? "active" : ""}`) //eg. "filter LED active"
        .text(d => d.label)
        .on("click", (e, d) => {
            //When a filter button is clicked, it added a log to the console 
            //to show which filter was clicked and its data.
            console.log("Clicked filter:", e);
            console.log("Clicked filter data:", d);
        if (!d.isActive) { //only update if the clicked filter is not have't been clicked (active) yet
            //it go through the filters_screen array and see which filter is clicked (d.id) 
            // if d.id = filter.id, set its isActive to true, 
            // else isActive to false.
            filters_screen.forEach(filter => {
            filter.isActive = d.id === filter.id ? true : false;
        });
            
        // update the filter buttons class based on the active status of each filter
        d3.selectAll("#filters_screen .filter")
            .classed("active", filter => filter.id === d.id ? true : false); 
        updateHistogram(d.id, data);
        }
    });

    const updateHistogram = (filterId, data) => {
        // create a variable to store the filtered data based on the selected filterId,
        // else : store the entire dataset
        const updatedData = filterId === "all"
            ? data
            : data.filter(tv => tv.screenTech === filterId);

        // generate new bins based on the updated data after filter is applied
        const updatedBins = binGenerator(updatedData);

        // update the scales with the new bins to reflect the changes in the data distribution
        updateScales(updatedBins);

        const bottomAxis = d3.axisBottom(xScale);
        const leftAxis = d3.axisLeft(yScale).ticks(5);

        const fillColor = filterId === "all"
            ? barColor
            : filterId === "OLED"
                ? oledColor
                : filterId === "LCD"
                    ? lcdColor
                    : filterId === "LED"
                        ? ledColor
                        : barColor;

        const chart = d3.select("#histogram").select(".histogram-chart");
        const bars = chart
            .selectAll("rect")
            .data(updatedBins, d => `${d.x0}-${d.x1}`);

        bars.join(
            enter => enter.append("rect")
                .attr("x", d => xScale(d.x0))
                .attr("width", d => xScale(d.x1) - xScale(d.x0))
                .attr("y", innerHeight)
                .attr("height", 0)
                .attr("fill", fillColor)
                .attr("stroke", bodyBackgroundColor)
                .attr("stroke-width", 2)
                .call(sel => sel.transition().duration(600)
                    .attr("y", d => yScale(d.length))
                    .attr("height", d => innerHeight - yScale(d.length))
                ),
            update => update.call(sel => sel.transition().duration(600)
                    .attr("x", d => xScale(d.x0))
                    .attr("width", d => xScale(d.x1) - xScale(d.x0))
                    .attr("y", d => yScale(d.length))
                    .attr("height", d => innerHeight - yScale(d.length))
                    .attr("fill", fillColor)
                ),
            exit => exit.call(sel => sel.transition().duration(300)
                    .attr("height", 0)
                    .attr("y", innerHeight)
                    .remove()
                )
        );

        chart.select(".x-axis")
            .call(bottomAxis);

        chart.select(".y-axis")
            .call(leftAxis);
        
        // also update scatterplot to reflect the same filter
        updateScatterPlot(filterId, data);
    };
}

// Update scatterplot when a filter is applied. Uses local scales so it
// doesn't interfere with the histogram's global scales.
function updateScatterPlot(filterId, data) {
    console.log('updateScatterPlot called, filterId=', filterId);
    // create a variable to store the filtered data based on the selected filterId, if 'all' is selected, use the entire dataset
    const updatedData = filterId === "all"
        ? data
        : data.filter(tv => tv.screenTech === filterId);

    // update the scales with the new data 
    const xScatter = d3.scaleLinear()
        .domain([0, d3.max(updatedData, d => d.star) || 1]) //replace max with 1 if the max is 0 to avoid error
        .range([0, innerWidth])
        .nice();

    const yScatter = d3.scaleLinear()
        .domain([0, d3.max(updatedData, d => d.energyConsumption) || 1])
        .range([innerHeight, 0])
        .nice();

    //draw x and y axis
    const bottomAxis = d3.axisBottom(xScatter);
    const leftAxis = d3.axisLeft(yScatter).ticks(5);

    const chart = d3.select('#scatterplot').select('.scatterplot-chart');

    // link the updated data to the circles : 
    // to know which circles need to be updated, added or removed based on the new data after filter is applied

    // -> use a key function to match existing circles with data points (using a primary key)
    // -> if the data point doesn't have a primary key,create one by combining multiple attributes (e.g., star, energyConsumption, screenTech)
    const circles = chart.selectAll('circle').data(updatedData, d => d ? d.id || `${d.star}-${d.energyConsumption}-${d.screenTech}` : Math.random());

    //it tell the D3 how to update the circles when the filter is applied
    // for the enter selection, append new circles for new data points;
    // for the update selection, update the position and color of existing circles;
    // for the exit selection, remove circles that no longer have corresponding data points.
    circles.join(
        enter => enter.append('circle')
            .attr('cx', d => xScatter(d.star))
            .attr('cy', d => yScatter(d.energyConsumption))
            .attr('r', 0)
            .attr('fill', d => colorScale(d.screenTech))
            .attr('opacity', 0)
            .call(sel => sel.transition().duration(500)
                .attr('r', 4)
                .attr('opacity', 0.75)
            ),
        update => update.call(sel => sel.transition().duration(600)
                .attr('cx', d => xScatter(d.star))
                .attr('cy', d => yScatter(d.energyConsumption))
                .attr('fill', d => colorScale(d.screenTech))
                .attr('opacity', 0.75)
            ),
        exit => exit.call(sel => sel.transition().duration(300)
                .attr('r', 0)
                .attr('opacity', 0)
                .remove()
            )
    );

    // refresh axes (axes are within the chart group)
    chart.select('.x-axis').call(bottomAxis);
    chart.select('.y-axis').call(leftAxis);

    // rebind hover events after the circles are updated
    handleMouseEvents();
}

//store tooltip group
let scatterTooltip = null;

const createTooltip = () => {
    const innerChartS = d3.select("#scatterplot").select(".scatterplot-chart");

    //default: tooltip is hidden (opacity 0) and positioned outside of the visible area (translate(0, 500))
    scatterTooltip = innerChartS
        .append("g")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("pointer-events", "none");

    //background rectangle for the tooltip with rounded corners and semi-transparent fill
    scatterTooltip
        .append("rect")
        .attr("width", 180)
        .attr("height", 54)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", allColor)
        .attr("fill-opacity", 0.75);

    //tooltip text
    scatterTooltip
        .append("text")
        .attr("x", 10)
        .attr("y", 16)
        .attr("alignment-baseline", "middle")
        .attr("fill", "white")
        .style("font-weight", 900)
        .style("font-size", "11px");
};

const handleMouseEvents = () => {
    const innerChartS = d3.select("#scatterplot").select(".scatterplot-chart");

    //don't run this if scatterplot or tooltip is not available yet
    if (innerChartS.empty() || !scatterTooltip) return;

    innerChartS.selectAll("circle")
        .on("mouseenter", (e, d) => { 
            //when mouse enter a circle, 
            // it will log the event and data to the console, 
            // then show the tooltip with the corresponding information of that circle (tv).
            console.log("Mouse entered circle", d);
            const circle = d3.select(e.currentTarget); 
            const cx = +circle.attr("cx");
            const cy = +circle.attr("cy");  

            //change fill colour of the tooltip's background rectangle
            scatterTooltip
                .select("rect")
                .attr("fill", colorScale(d.screenTech));

            //place the tooltip near the hovered circle
            scatterTooltip
                .style("opacity", 1)
                .attr("transform", `translate(${cx + 10}, ${cy - 62})`);

            const tooltipText = scatterTooltip.select("text");
            tooltipText.selectAll("tspan").remove(); //remove existing tspans before adding new ones
            //include brand, model and screen size in the tooltip
            tooltipText
                .append("tspan")
                .attr("x", 10)
                .attr("dy", 0)
                .text(`Brand: ${d.brand}`);
            tooltipText
                .append("tspan")
                .attr("x", 10)
                .attr("dy", 16)
                .text(`Model: ${d.model}`);
            tooltipText
                .append("tspan")
                .attr("x", 10)
                .attr("dy", 16)
                .text(`Screen Size: ${d.screenSize}`);
        })
        .on("mouseleave", (e, d) => {
            console.log("Mouse left circle", d);
            scatterTooltip
                //tooltip is hidden again (opacity 0) and moved outside of the visible area (translate(0, 500))                .style("opacity", 0)
                .attr("transform", "translate(0, 500)");
        });
};