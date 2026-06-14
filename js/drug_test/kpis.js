const drawKPIs = (data, comparisonData = data) => {
    const containerMain = d3.select('#kpi-main');
    const containerCards = d3.select('#kpi-cards');

    // Clear previous
    containerMain.html('');
    containerCards.html('');

    if (data.length === 0) {
        containerMain.html('<p>No data available for the selected filters.</p>');
        return;
    }

    const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
    const comparisonYears = Array.from(new Set(comparisonData.map(d => d.year))).sort((a, b) => a - b);
    const latestYear = years[years.length - 1];
    
    const previousYearCandidates = comparisonYears.filter(year => year < latestYear);
    const previousYear = previousYearCandidates.length > 0
        ? previousYearCandidates[previousYearCandidates.length - 1]
        : null;

    const currentYearData = data.filter(d => d.year === latestYear);
    const previousYearData = previousYear === null ? [] : comparisonData.filter(d => d.year === previousYear);

    const totalConducted = d3.sum(currentYearData, d => d.totalConducted || 0);
    const previousTotalConducted = d3.sum(previousYearData, d => d.totalConducted || 0);

    const totalPositive = d3.sum(currentYearData, d => d.positiveDrugCount || 0);
    const totalPreviousPositive = d3.sum(previousYearData, d => d.positiveDrugCount || 0);
    
    const avgPercent = totalConducted > 0 ? ((totalPositive / totalConducted) * 100).toFixed(2) : 0;
    const previousAvgPercent = previousTotalConducted > 0 ? ((totalPreviousPositive / previousTotalConducted) * 100) : null;
    const positivePercentDelta = previousAvgPercent === null ? null : (avgPercent - previousAvgPercent);
    const positivePercentTrendText = previousAvgPercent === null
        ? 'N/A vs previous year'
        : `${positivePercentDelta >= 0 ? '▲' : '▼'} ${Math.abs(positivePercentDelta).toFixed(2)}% vs ${previousYear}`;
    const positivePercentTrendClass = positivePercentDelta === null
        ? 'kpi-change--flat'
        : positivePercentDelta > 0
            ? 'kpi-change--up'
            : positivePercentDelta < 0
                ? 'kpi-change--down'
                : 'kpi-change--flat';

    // sums for fines, arrests and charges (some years/jurisdictions may be zero)
    const totalFines = d3.sum(currentYearData, d => d.fines || 0);
    const totalArrests = d3.sum(currentYearData, d => d.arrests || 0);
    const totalCharges = d3.sum(currentYearData, d => d.charges || 0);

    const previousTotalFines = d3.sum(previousYearData, d => d.fines || 0);
    const previousTotalArrests = d3.sum(previousYearData, d => d.arrests || 0);
    const previousTotalCharges = d3.sum(previousYearData, d => d.charges || 0);

    const finesDelta = previousTotalFines > 0 ? ((totalFines - previousTotalFines) / previousTotalFines) * 100 : null;
    const arrestsDelta = previousTotalArrests > 0 ? ((totalArrests - previousTotalArrests) / previousTotalArrests) * 100 : null;
    const chargesDelta = previousTotalCharges > 0 ? ((totalCharges - previousTotalCharges) / previousTotalCharges) * 100 : null;

    const finesDeltaClass = finesDelta === null ? 'kpi-change--flat' : finesDelta > 0 ? 'kpi-change--up' : 'kpi-change--down';
    const arrestsDeltaClass = arrestsDelta === null ? 'kpi-change--flat' : arrestsDelta > 0 ? 'kpi-change--up' : 'kpi-change--down';
    const chargesDeltaClass = chargesDelta === null ? 'kpi-change--flat' : chargesDelta > 0 ? 'kpi-change--up' : 'kpi-change--down';

    const formatDeltaTrendText = (percentDelta, yearLabel) => {
        if (percentDelta === null) {
            return `N/A vs ${yearLabel}`;
        }
        return `${percentDelta >= 0 ? '▲' : '▼'} ${Math.abs(percentDelta).toFixed(2)}% vs ${yearLabel}`;
    };

    // Main KPI block - follow the same structure as the speeding/fines KPIs
    const trendHtml = previousYear !== null
        ? (function(){ return previousTotalConducted === 0 ? 'N/A vs previous year' : `${totalConducted - previousTotalConducted >= 0 ? '▲' : '▼'} ${Math.abs(((totalConducted - previousTotalConducted)/previousTotalConducted)*100).toFixed(2)}% vs ${previousYear}` })()
        : 'N/A vs previous year';

    // create main card using the same classes as other pages so CSS matches
    containerMain
        .append('div')
        .attr('class', 'kpi-main-card')
        .html(`
            <div class="kpi-value">${d3.format(",")(totalConducted)}</div>
            <div class="kpi-sub">Random breath tests conducted, ${latestYear}</div>
            <div class="kpi-trend">${trendHtml}</div>
        `);

    // Positive rate card on the right
    const positiveRate = containerCards.append('div').attr('class', 'kpi-card kpi-card-positive');
    positiveRate.html(`
        <div class="kpi-card-small">${avgPercent}%</div>
        <div class="kpi-card-label">Positive breath tests</div>
        <div class="kpi-card-sub">${latestYear}</div>
        <div class="kpi-card-trend ${positivePercentTrendClass}">${positivePercentTrendText}</div>
    `);

    // Summary card with fines, arrests, and charges
    const summaryCard = containerCards.append('div').attr('class', 'kpi-card kpi-summary-card');
    summaryCard.html(`
        <div class="kpi-summary-grid">
            <div class="kpi-summary-item">
                <div>
                    <div class="kpi-summary-value">${d3.format(",")(totalFines)}</div>
                    <div class="kpi-card-label">Fines</div>
                    <div class="kpi-card-trend ${finesDeltaClass}">${formatDeltaTrendText(finesDelta, previousYear)}</div>
                </div>
            </div>
            <div class="kpi-summary-item">
                <div>
                    <div class="kpi-summary-value">${d3.format(",")(totalArrests)}</div>
                    <div class="kpi-card-label">Arrests</div>
                    <div class="kpi-card-trend ${arrestsDeltaClass}">${formatDeltaTrendText(arrestsDelta, previousYear)}</div>
                </div>
            </div>
            <div class="kpi-summary-item">
                <div>
                    <div class="kpi-summary-value">${d3.format(",")(totalCharges)}</div>
                    <div class="kpi-card-label">Charges</div>
                    <div class="kpi-card-trend ${chargesDeltaClass}">${formatDeltaTrendText(chargesDelta, previousYear)}</div>
                </div>
            </div>
        </div>
    `);
};