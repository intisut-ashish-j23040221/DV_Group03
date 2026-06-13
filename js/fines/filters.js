const initFilters = (data, onChange) => {
  const yearSel = document.getElementById('filter-year');
  const jurSel = document.getElementById('filter-jurisdiction');
  const metricSel = document.getElementById('filter-metric');
  const resetBtn = document.getElementById('filter-reset');
  if (!yearSel || !jurSel || !metricSel) return;

  const years = Array.from(new Set(data.map(d => d.year))).sort((a,b)=>a-b);
  const juris = Array.from(new Set(data.map(d => d.jurisdiction))).sort();
  const metrics = Array.from(new Set(data.map(d => d.metric))).sort();

  const makeOptions = (sel, items) => {
    sel.innerHTML = '';
    
    const allOpt = document.createElement('option'); 
    allOpt.value='All'; 
    allOpt.textContent='All'; 

    sel.appendChild(allOpt);
    items.forEach(it => { 
      const opt = document.createElement('option'); 
      opt.value = it; 
      opt.textContent = formatMetricLabel(it); 
      sel.appendChild(opt); 
    });
  };

  makeOptions(yearSel, years);
  makeOptions(jurSel, juris);
  makeOptions(metricSel, metrics);

  if (metrics.includes('speed_fines')) {
    metricSel.value = 'speed_fines';
  }

  const readFilters = () => ({ year: yearSel.value, jurisdiction: jurSel.value, metric: metricSel.value });

  const trigger = () => { if (typeof onChange === 'function') onChange(readFilters()); };

  yearSel.addEventListener('change', trigger);
  jurSel.addEventListener('change', trigger);
  metricSel.addEventListener('change', trigger);
  resetBtn.addEventListener('click', e => { e.preventDefault(); yearSel.value='All'; jurSel.value='All'; metricSel.value='All'; trigger(); });

  // initial trigger
  trigger();
};
