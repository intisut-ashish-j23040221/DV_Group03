function updateScales(bins) {
    const maxEng = bins[bins.length - 1].x1; // to get the maximum number for last range
    const binsMaxLength = d3.max(bins, d => d.length); // Get the maximum length of the bins

    xScale = d3.scaleLinear()
        .domain([0, maxEng])
        .range([0, innerWidth]);

    yScale = d3.scaleLinear()
        .domain([0, binsMaxLength])
        .range([innerHeight, 0])
        .nice(); // Use the nice() method to round the y-axis values
}

const updateLinearScales = (xDomain, yDomain) => {
    xScale = d3.scaleLinear()
        .domain(xDomain)
        .range([0, innerWidth]);
    
    yScale = d3.scaleLinear()
        .domain(yDomain)
        .range([innerHeight, 0])
        .nice();
};

const updateBandScales = (xDomain, yDomain) => {
    xScale = d3.scaleBand()
        .domain(xDomain)
        .range([0, innerWidth])
        .padding(0.2);
    
    yScale = d3.scaleLinear()
        .domain(yDomain)
        .range([innerHeight, 0])
        .nice();
};

const updateHorizontalBarScales = (xDomain, yDomain) => {
    xScale = d3.scaleLinear()
        .domain(xDomain)
        .range([0, innerWidth])
        .nice();
    
    yScale = d3.scaleBand()
        .domain(yDomain)
        .range([0, innerHeight])
        .padding(0.2);
};

const updateHeatmapScales = (xDomain, yDomain) => {
    xScale = d3.scaleBand()
        .domain(xDomain)
        .range([0, innerWidth])
        .padding(0.06);
    
    yScale = d3.scaleBand()
        .domain(yDomain)
        .range([0, innerHeight])
        .padding(0.06);
};