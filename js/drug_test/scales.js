const createLinearScale = (domain, width) => {
    return d3.scaleLinear()
        .domain(domain)
        .range([0, width])
        .nice();
};

const createLinearScaleY = (domain, height) => {
    return d3.scaleLinear()
        .domain(domain)
        .range([height, 0])
        .nice();
};

const createBandScale = (domain, width, padding = 0.2) => {
    return d3.scaleBand()
        .domain(domain)
        .range([0, width])
        .padding(padding);
};

const createVerticalBandScale = (domain, height, padding = 0.2) => {
    return d3.scaleBand()
        .domain(domain)
        .range([0, height])
        .padding(padding);
};
