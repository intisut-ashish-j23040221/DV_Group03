//take it from exercise 5 shared_constants.js
const margin = { top: 50, right: 30, bottom: 80, left: 160 };
const width = 1000;
const height = 450;
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// set up the scales (reusable by helper functions)
let xScale = d3.scaleLinear();
let yScale = d3.scaleLinear();

const formatMetricLabel = metric => {
	if (!metric || metric === 'All') {
		return 'All metrics';
	}

	if (typeof metric !== "string") return metric;

	return metric
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
};
