//take it from exercise 5 shared_constants.js
const margin = { top: 24, right: 24, bottom: 72, left: 70 };
const width = 1000;
const height = 380;
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

let xScale = d3.scaleLinear();
let yScale = d3.scaleLinear();

const formatMetricLabel = metric => {
	if (!metric || metric === 'All') {
		return 'All metrics';
	}

	return metric
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
};
