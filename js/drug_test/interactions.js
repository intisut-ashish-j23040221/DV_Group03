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
        width: 95%;
        max-width: 1300px;
        height: 95vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 16px 40px rgba(0,0,0,0.18);
    `;
    
    // Prevent clicks inside content from closing modal
    content.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
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
    // Make the cloned chart fill available modal vertical space
    clone.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;';
    // Remove any existing tooltips from the clone
    clone.querySelectorAll('.tooltip').forEach(el => el.remove());
    // Disable tooltip interactions in the cloned chart
    clone.querySelectorAll('rect, circle, path').forEach(el => {
        el.style.pointerEvents = 'none';
    });
    clone.querySelectorAll("g text.text-value-label").forEach(t => t.remove() );
    // Ensure the SVG inside the clone stretches to fill the wrapper proportionally
    clone.querySelectorAll('svg').forEach(sv => {
        try {
            sv.setAttribute('width', '100%');
            sv.setAttribute('height', '100%');
            sv.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            sv.style.display = 'block';
            sv.style.width = '100%';
            sv.style.height = '100%';
            sv.style.aspectRatio = 'auto';

            // Enhance text clarity in the modal
            sv.querySelectorAll('text').forEach(t => {
                t.style.fontWeight = '500';
                const currentFontSize = window.getComputedStyle(t).fontSize;
                const fs = parseFloat(currentFontSize);
                if (fs && fs < 14) {
                    t.style.fontSize = '14px';
                }
                // Ensure labels are dark enough
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
            td.textContent = (typeof value === 'number' && col?.toLowerCase() !== "year") ? value.toLocaleString() : value;
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

const triggerMenu = (e, dataFn, columnsFn, container, title, explanation, onRowClick) => {
    const data = dataFn();
    const columns = columnsFn();
    showChartDataTable(e, container, data, columns, title, explanation, onRowClick)
}

const addDataTableContextMenu = (container, dataFn, columnsFn, title, explanation, onRowClick) => {
    if (!container) return;
    
    // Remove existing handlers to prevent duplicate event accumulation on redrawing
    if (container._contextMenuHandler) {
        container.removeEventListener('contextmenu', container._contextMenuHandler);
    }

    let params = [dataFn, columnsFn, container, title, explanation, onRowClick];
    
    container._contextMenuHandler = (e) => triggerMenu(e, ...params);
    container._enterKeyHandler = (e) => e.key === "Enter" ? triggerMenu(e, ...params) : null;

    container.addEventListener('contextmenu', container._contextMenuHandler);
    container.addEventListener("keydown", container._enterKeyHandler);
};


const syncClicksBetweenDPs = (e, dp) => {
    dp.attr("tabindex", "-1");
    d3.select(e.currentTarget).attr("tabindex", "0");
}

const createDataPointMovement = (event, dp) => {
  const targetElement = event.currentTarget;
  const barsArray = dp.nodes();
  const currentIndex = barsArray.indexOf(targetElement);
  let nextIndex = currentIndex;

  // 1. NAVIGATION: Arrow Keys
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    nextIndex = (currentIndex + 1) % barsArray.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    nextIndex = (currentIndex - 1 + barsArray.length) % barsArray.length;
  }
  
  // If the index changed, rove the tabindex and shift focus
  if (nextIndex !== currentIndex) {
    // Set all dp to -1
    dp.attr("tabindex", "-1");
    // Set the newly targeted bar to 0
    d3.select(barsArray[nextIndex]).attr("tabindex", "0");
    // Focus the new bar
    barsArray[nextIndex].focus();
    return; // Exit early
  }
}