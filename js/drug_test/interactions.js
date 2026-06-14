// Show a right-click modal that includes the visualization and a data table
const showChartDataTable = (event, chartContainer, data, columns, title, explanation, onRowClick) => {
    event.preventDefault();

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 16px;
    `;
    
    // Close modal when clicking on overlay background
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 12px;
        width: 100%;
        max-width: 1100px;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        box-shadow: 0 16px 40px rgba(0,0,0,0.18);
    `;
    
    // Prevent clicks inside content from closing modal
    content.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    const leftPane = document.createElement('div');
    leftPane.style.cssText = `
        width: 56%;
        min-width: 360px;
        padding: 10px 24px;
        border-right: 1px solid #ebedf0;
        overflow: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    `;

    const rightPane = document.createElement('div');
    rightPane.style.cssText = `
        width: 44%;
        min-width: 280px;
        padding: 20px;
        overflow: auto;
    `;

    const clone = chartContainer.cloneNode(true);
    // Make the cloned chart fill available modal vertical space (height expanded)
    clone.style.cssText = 'width: 100%; height: 100%; display: block;';
    // Remove any existing tooltips from the clone
    clone.querySelectorAll('.tooltip').forEach(el => el.remove());
    // Disable tooltip interactions in the cloned chart
    clone.querySelectorAll('rect, circle').forEach(el => {
        el.style.pointerEvents = 'none';
    });
    // Ensure the SVG inside the clone stretches to fill the wrapper
    clone.querySelectorAll('svg').forEach(sv => {
        try {
            sv.setAttribute('width', '100%');
            sv.setAttribute('height', '100%');
            sv.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            sv.style.display = 'block';
            sv.style.width = '100%';
            sv.style.height = '100%';
        } catch (e) {}
    });

    const chartCloneWrapper = document.createElement('div');
    chartCloneWrapper.style.cssText = 'width: 100%; height: calc(86vh - 80px); display: flex; align-items: center; justify-content: center; background: #fafafa; border-radius: 8px; padding: 16px 20px;';
    chartCloneWrapper.appendChild(clone);
    leftPane.appendChild(chartCloneWrapper);

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = 'margin: 0 0 10px; font-size: 20px; color: #1f2937;';
    rightPane.appendChild(titleEl);

    if (explanation) {
        const explEl = document.createElement('p');
        explEl.textContent = explanation;
        explEl.style.cssText = 'margin: 0 0 18px; color: #4b5563; line-height: 1.6; font-size: 14px;';
        rightPane.appendChild(explEl);
    }

    const table = document.createElement('table');
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    `;

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.cssText = 'background: #f3f4f6; border-bottom: 2px solid #d1d5db;';
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        th.style.cssText = 'padding: 12px 10px; text-align: left; font-weight: 600; color: #111827;';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.style.cssText = idx % 2 === 0 ? 'background: #fafafa;' : 'background: white;';
        tr.style.borderBottom = '1px solid #e5e7eb';
        tr.style.cursor = 'pointer';

        columns.forEach(col => {
            const td = document.createElement('td');
            const value = row[col];
            td.textContent = typeof value === 'number' ? value.toLocaleString() : value;
            td.style.cssText = 'padding: 10px; color: #374151;';
            tr.appendChild(td);
        });

        tr.addEventListener('click', () => {
            Array.from(tbody.querySelectorAll('tr')).forEach((rowEl, i) => {
                rowEl.style.background = rowEl === tr ? '#e0f2fe' : i % 2 === 0 ? '#fafafa' : 'white';
            });
            if (onRowClick) {
                onRowClick(row, clone, tr);
            }
        });

        tr.addEventListener('mouseover', () => tr.style.background = '#f3f4f6');
        tr.addEventListener('mouseout', () => {
            if (tr !== document.activeElement) {
                tr.style.background = idx % 2 === 0 ? '#fafafa' : 'white';
            }
        });

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    rightPane.appendChild(table);

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = 'margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap;';

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset selection';
    resetBtn.style.cssText = `
        padding: 10px 14px;
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        color: #111827;
        cursor: pointer;
    `;
    resetBtn.onclick = () => {
        Array.from(tbody.querySelectorAll('tr')).forEach((rowEl, j) => {
            rowEl.style.background = j % 2 === 0 ? '#fafafa' : 'white';
        });
        if (onRowClick) {
            onRowClick(null, clone, null);
        }
    };
    buttonRow.appendChild(resetBtn);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
        padding: 10px 14px;
        background: #004B87;
        border: none;
        border-radius: 6px;
        color: white;
        cursor: pointer;
    `;
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.remove();
    });
    buttonRow.appendChild(closeBtn);

    rightPane.appendChild(buttonRow);

    content.appendChild(leftPane);
    content.appendChild(rightPane);
    modal.appendChild(content);
    document.body.appendChild(modal);

    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
};

const addDataTableContextMenu = (container, dataFn, columnsFn, title, explanation, onRowClick) => {
    if (!container) return;
    container.addEventListener('contextmenu', (e) => {
        const data = dataFn();
        const columns = columnsFn();
        showChartDataTable(e, container, data, columns, title, explanation, onRowClick);
    });
};
