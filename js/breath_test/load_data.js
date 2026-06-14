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
    d3.csv("./data/breath_data.csv", d => ({
        year: +d.YEAR,                                          
        jurisdiction: d.JURISDICTION,                           
        totalConducted: +d.Total_Conducted,                     
        positiveBreathCount: +d.Positive_Breath_Count,          
        percentPositive: +d["% positive breath test results"],
        fines: +d["Sum(FINES)"],
        arrests: +d["Sum(ARRESTS)"],
        charges: +d["Sum(CHARGES)"]
    })),
    d3.csv("./data/license_data.csv", d => ({
        year: +d.Year,
        jurisdiction: normalizeJurisdiction(d.Jurisdiction),
        totalLicenses: +d.Total_License_Number
    })).then(licenseData => licenseData.filter(d => d.year !== 2025))
]).then(([breathData, licenseData]) => {
    // Create lookup map for license data
    const licenseMap = {};
    licenseData.forEach(d => {
        licenseMap[`${d.year}-${d.jurisdiction}`] = d.totalLicenses;
    });

    // Merge and calculate per 10,000 licenses
    const data = breathData.map(d => {
        const key = `${d.year}-${d.jurisdiction}`;
        const totalLicenses = licenseMap[key] || 0;
        const per10k = totalLicenses > 0 ? (d.totalConducted / totalLicenses) * 10000 : 0;
        return {
            ...d,
            totalLicenses,
            per10kLicenses: per10k
        };
    });

    console.log(data);

    let currentFilters = { year: 'All', jurisdiction: 'All' };
    const debounce = (fn, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    };

    const renderCharts = filters => {
        currentFilters = filters;
        // Filter based on Year and Jurisdiction selection
        const filtered = data.filter(d => {
            return (filters.year === 'All' || filters.year === 'all' || +filters.year === d.year)
                && (filters.jurisdiction === 'All' || filters.jurisdiction === 'all' || filters.jurisdiction === d.jurisdiction);
        });

        // Create benchmark historical data (ignores year selection)
        const comparisonData = data.filter(d => {
            return (filters.jurisdiction === 'All' || filters.jurisdiction === 'all' || filters.jurisdiction === d.jurisdiction);
        });

        drawKPIs(filtered, comparisonData);
        drawJurisdictionBreathBar(filtered);
        drawBreathTrendLine(filtered);
        drawPositiveBreathBar(filtered);
    };

    // Initial render
    renderCharts({ year: 'All', jurisdiction: 'All' });

    // Wire filters directly
    initFilters(data, filters => {
        renderCharts(filters);
    });

    const redrawCharts = debounce(() => {
        renderCharts(currentFilters);
    }, 120);

    window.addEventListener('resize', redrawCharts);
    
}).catch(error => {
    console.error("Error loading the CSV file:", error);
});