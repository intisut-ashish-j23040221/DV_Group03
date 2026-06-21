// Normalize jurisdiction names for merging
const normalizeJurisdiction = (name) => {
    const map = {
        'New South Wales': 'NSW',
        'Northern Territory': 'NT',
        'South Australia': 'SA',
        'Western Australia': 'WA',
        'Australian Capital Territory': 'ACT',
        'Tasmania': 'TAS',
        'Queensland': 'QLD',
        'Victoria': 'VIC'
    };
    return map[name.trim()] || name;
};

// Load both datasets and merge
Promise.all([
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
    })),
    d3.csv("data/license_data.csv", d => ({
        year: +d.Year,
        jurisdiction: normalizeJurisdiction(d.Jurisdiction),
        totalLicenses: +d.Total_License_Number
    }))
]).then(([finesData, licenseData]) => {
    // Create lookup map for license data
    const licenseMap = {};
    licenseData.forEach(d => {
        licenseMap[`${d.year}-${d.jurisdiction}`] = d.totalLicenses;
    });

    // Merge total licenses into each fine record
    const data = finesData.map(d => {
        const key = `${d.year}-${d.jurisdiction}`;
        const totalLicenses = licenseMap[key] || 0;
        return {
            ...d,
            totalLicenses
        };
    });

    console.log(data);
    let currentFilters = { year: 'All', jurisdiction: 'All', metric: 'All' };
    const renderCharts = filters => {
        currentFilters = filters;
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
        drawJurisdictionSpeedingMap(filtered, selectedMetric);
        drawCameraSpeedingBar(filtered, selectedMetric);
        drawFinesStreamgraph(filtered, selectedMetric);
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

    const debounce = (fn, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    };

    const redrawCharts = debounce(() => {
        renderCharts(currentFilters);
    }, 120);

    window.addEventListener('resize', redrawCharts);

    // Call functions after data is loaded
    // drawHistogram(data);
    // populateFilters (data);
    // createScatterPlot(data); 

    // createTooltip();
    // handleMouseEvents();
    
}).catch(error => {
    console.error("Error loading the CSV file:", error);
});
