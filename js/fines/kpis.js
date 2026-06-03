const drawKPIs = (data, comparisonData = data, metric = 'All') => {
    const containerMain = d3.select('#kpi-main');
    const containerCards = d3.select('#kpi-cards');
    if (containerMain.empty() || containerCards.empty()) return;

    containerMain.selectAll('*').remove();
    containerCards.selectAll('*').remove();

    const metricLabel = formatMetricLabel(metric);
    const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
    const comparisonYears = Array.from(new Set(comparisonData.map(d => d.year))).sort((a, b) => a - b);
    const latestYear = years[years.length - 1];
    const previousYearCandidates = comparisonYears.filter(year => year < latestYear);
    const previousYear = previousYearCandidates.length > 0
        ? previousYearCandidates[previousYearCandidates.length - 1]
        : null;

    const currentYearData = data.filter(d => d.year === latestYear);
    const previousYearData = previousYear === null ? [] : comparisonData.filter(d => d.year === previousYear);

    const totalInfringements = d3.sum(currentYearData, d => d.fines || 0);
    const previousTotalInfringements = d3.sum(previousYearData, d => d.fines || 0);

    const formatTrendText = (delta, yearLabel) => {
        if (delta === null) {
            return `N/A ${yearLabel === null ? 'vs previous year' : `vs ${yearLabel}`}`;
        }

        return `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(2)}% ${yearLabel === null ? 'vs previous year' : `vs ${yearLabel}`}`;
    };

    const changeValue = totalInfringements - previousTotalInfringements;
    const hasComparison = previousYear !== null && previousTotalInfringements > 0;
    const changePercent = hasComparison
        ? (changeValue / previousTotalInfringements) * 100
        : null;
    const isIncrease = changeValue > 0;
    const changeClass = isIncrease ? 'kpi-change--up' : changeValue < 0 ? 'kpi-change--down' : 'kpi-change--flat';
    const changeArrow = changeValue > 0 ? '▲' : changeValue < 0 ? '▼' : '•';

    const normalizeDetectionMethod = method => {
        const lower = (method || '').toLowerCase();
        return lower.includes('camera') ? 'Camera' : method;
    };

    const policeFines = d3.sum(currentYearData.filter(d => (normalizeDetectionMethod(d.detectionMethod) || '').toLowerCase() === 'police issued'), d => d.fines || 0);
    const cameraFines = d3.sum(currentYearData.filter(d => normalizeDetectionMethod(d.detectionMethod) === 'Camera'), d => d.fines || 0);

    const previousPoliceFines = d3.sum(previousYearData.filter(d => (normalizeDetectionMethod(d.detectionMethod) || '').toLowerCase() === 'police issued'), d => d.fines || 0);
    const previousCameraFines = d3.sum(previousYearData.filter(d => normalizeDetectionMethod(d.detectionMethod) === 'Camera'), d => d.fines || 0);

    const policeDelta = previousPoliceFines > 0 ? ((policeFines - previousPoliceFines) / previousPoliceFines) * 100 : null;
    const cameraDelta = previousCameraFines > 0 ? ((cameraFines - previousCameraFines) / previousCameraFines) * 100 : null;

    const arrests = d3.sum(currentYearData, d => d.arrests || 0);
    const charges = d3.sum(currentYearData, d => d.charges || 0);

    // Main KPI block
    containerMain
        .append('div')
        .attr('class', 'kpi-main-card')
        .html(`
            <div class="kpi-value">${totalInfringements.toLocaleString()}</div>
            <div class="kpi-sub">${metricLabel}, ${latestYear}</div>
            <div class="kpi-trend ${changeClass}">${changePercent === null ? 'N/A' : `${changeArrow} ${Math.abs(changePercent).toFixed(2)}%`} ${previousYear === null ? 'vs previous year' : `vs ${previousYear}`}</div>
        `);

    // Cards: Police fines, Camera fines, Arrests/Charges
    const policeCard = containerCards.append('div').attr('class', 'kpi-card');
    policeCard.html(`
        <div class="kpi-card-value">${policeFines.toLocaleString()}</div>
        <div class="kpi-card-label">Police fines</div>
        <div class="kpi-card-trend ${policeDelta === null ? 'kpi-change--flat' : (policeDelta >= 0 ? 'kpi-change--up' : 'kpi-change--down')}">${formatTrendText(policeDelta, previousYear)}</div>
    `);

    const cameraCard = containerCards.append('div').attr('class', 'kpi-card');
    cameraCard.html(`
        <div class="kpi-card-value">${cameraFines.toLocaleString()}</div>
        <div class="kpi-card-label">Camera fines</div>
        <div class="kpi-card-trend ${cameraDelta === null ? 'kpi-change--flat' : (cameraDelta >= 0 ? 'kpi-change--up' : 'kpi-change--down')}">${formatTrendText(cameraDelta, previousYear)}</div>
    `);

    const miscCard = containerCards.append('div').attr('class', 'kpi-card');
    miscCard.html(`<div class="kpi-card-small">${arrests.toLocaleString()}</div><div class="kpi-card-sub">Arrests</div><div class="kpi-card-small">${charges.toLocaleString()}</div><div class="kpi-card-sub">Charges</div>`);
};
