// Show a right-click modal that includes the visualization and a data table
const showChartDataTable = (event, chartContainer, data, columns, title, explanation, onRowClick) => {
    event.preventDefault();

    const modal = document.createElement('div');
    modal.className = 'chart-modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 12px;
        width: 95%;
        max-width: 1300px;
        height: 95vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 16px 40px rgba(0,0,0,0.18);
    `;
    
    content.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    const leftPane = document.createElement('div');
    leftPane.style.cssText = `
        height: 60%;
        width: 100%;
        padding: 20px 24px;
        border-bottom: 1px solid #ebedf0;
        overflow: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #fafafa;
    `;

    const rightPane = document.createElement('div');
    rightPane.style.cssText = `
        flex: 1;
        width: 100%;
        padding: 24px;
        overflow: auto;
    `;

    const clone = chartContainer.cloneNode(true);
    clone.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;';
    clone.querySelectorAll('.tooltip').forEach(el => el.remove());
    clone.querySelectorAll('rect, circle').forEach(el => {
        el.style.pointerEvents = 'none';
    });
    
    clone.querySelectorAll('svg').forEach(sv => {
        try {
            sv.setAttribute('width', '100%');
            sv.setAttribute('height', '100%');
            sv.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            sv.style.display = 'block';
            sv.style.width = '100%';
            sv.style.height = '100%';
            
            sv.querySelectorAll('text').forEach(t => {
                t.style.fontWeight = '500';
                const currentFontSize = window.getComputedStyle(t).fontSize;
                const fs = parseFloat(currentFontSize);
                if (fs && fs < 14) {
                    t.style.fontSize = '14px';
                }
                if (t.style.fill === 'rgb(51, 51, 51)' || t.getAttribute('fill') === '#333') {
                    t.style.fill = '#111';
                }
            });
        } catch (e) {}
    });

    const chartCloneWrapper = document.createElement('div');
    chartCloneWrapper.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;';
    chartCloneWrapper.appendChild(clone);
    leftPane.appendChild(chartCloneWrapper);

    const titleEl = document.createElement('h2');
    titleEl.innerText = title;
    titleEl.style.cssText = 'margin: 0 0 8px 0; font-size: 20px; color: #062f56;';
    
    const explanationEl = document.createElement('p');
    explanationEl.innerText = explanation;
    explanationEl.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: #666; line-height: 1.5;';

    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';
    
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    columns.forEach(col => {
        const th = document.createElement('th');
        th.innerText = col;
        th.style.cssText = 'text-align: left; padding: 12px 8px; border-bottom: 2px solid #ebedf0; background: #f8f9fa; position: sticky; top: 0;';
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    data.forEach(rowData => {
        const row = tbody.insertRow();
        row.style.cursor = 'pointer';
        row.style.transition = 'background 0.2s';
        
        row.addEventListener('mouseenter', () => {
            row.style.background = '#f0f4f8';
            if (onRowClick) onRowClick(rowData, clone);
        });
        row.addEventListener('mouseleave', () => {
            row.style.background = 'transparent';
            if (onRowClick) onRowClick(null, clone);
        });

        columns.forEach(col => {
            const cell = row.insertCell();
            cell.innerText = rowData[col] || '';
            cell.style.cssText = 'padding: 10px 8px; border-bottom: 1px solid #ebedf0;';
        });
    });

    rightPane.appendChild(titleEl);
    rightPane.appendChild(explanationEl);
    rightPane.appendChild(table);

    content.appendChild(leftPane);
    content.appendChild(rightPane);
    modal.appendChild(content);

    modal.addEventListener('click', () => modal.remove());
    document.body.appendChild(modal);
};

const addDataTableContextMenu = (container, dataFn, columnsFn, title, explanation, onRowClick) => {
    if (!container) return;
    container.addEventListener('contextmenu', (e) => {
        const data = dataFn();
        const columns = columnsFn();
        showChartDataTable(e, container, data, columns, title, explanation, onRowClick);
    });
};
