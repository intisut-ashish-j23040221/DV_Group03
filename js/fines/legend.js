function createHorizontalLegend(container, scale, x, y, itemSpacing = 120) {
  const itemWidth = 12; //size of the color box in the legend

  const legend = container
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${x}, ${y})`); 

  const item = legend
    .selectAll("g")
    .data(scale.domain())
    .join("g")
    .attr("transform", (d, i) => `translate(${i * itemSpacing}, 0)`); 

  //color box for each legend item 
  item
    .append("rect")
    .attr("width", itemWidth)
    .attr("height", itemWidth)
    .attr("fill", d => scale(d));

  item
    .append("text")
    .attr("x", itemWidth + 6)
    .attr("y", itemWidth - 2)
    .style("font-size", "11px")
    .text(d => d.replace(/_/g, " ")); 
}

