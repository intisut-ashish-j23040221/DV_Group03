//Load exercise 6 data and call the functions
d3.csv("data/fines.csv", d => ({
    year: +d.YEAR,
    jurisdiction: d.JURISDICTION,
    location: d.LOCATION,
    ageGroup: d.AGE_GROUP,
    metric: d.METRIC,
    detectionMethod: d.DETECTION_METHOD,
    fines: +d.FINES,
    arrests: +d.ARRESTS,
    charges: +d.CHARGES,
    month: +d.MONTH
})).then(data => {
    console.log(data);
    const renderCharts = filters => {
        const selectedMetric = filters.metric || 'All';

        const filtered = data.filter(d => {
            return (filters.year === 'All' || +filters.year === d.year)
                && (filters.jurisdiction === 'All' || filters.jurisdiction === d.jurisdiction)
                && (selectedMetric === 'All' || selectedMetric === d.metric);
        });

        const comparisonData = data.filter(d => {
            return (filters.jurisdiction === 'All' || filters.jurisdiction === d.jurisdiction)
                && (selectedMetric === 'All' || selectedMetric === d.metric);
        });

        if (typeof drawKPIs === 'function') drawKPIs(filtered, comparisonData, selectedMetric);
        drawJurisdictionSpeedingBar(filtered, selectedMetric);
        drawCameraSpeedingBar(filtered, selectedMetric);
        drawFinesLineChart(filtered, selectedMetric);
        drawLocationStackedBar(filtered, selectedMetric);
        drawLocationHeatmap(filtered, selectedMetric);
    };

    // initial render
    renderCharts({ year: 'All', jurisdiction: 'All', metric: 'All' });

    // wire filters
    if (typeof initFilters === 'function'){
        initFilters(data, filters => {
            renderCharts(filters);
        });
    }

    // Call functions after data is loaded
    // drawHistogram(data);
    // populateFilters (data);
    // createScatterPlot(data); 

    // createTooltip();
    // handleMouseEvents();
    
}).catch(error => {
    console.error("Error loading the CSV file:", error);
});
