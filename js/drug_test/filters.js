const initFilters = (data, onChange) => {
  const yearSel = document.getElementById('filter-year');
  const jurSel = document.getElementById('filter-jurisdiction');
  const resetBtn = document.getElementById('filter-reset');
  
  const years = Array.from(new Set(data.map(d => d.year))).sort((a,b)=>a-b);
  const juris = Array.from(new Set(data.map(d => d.jurisdiction))).sort();

  const makeOptions = (sel, items) => {
    sel.innerHTML = '';
    const allOpt = document.createElement('option'); 
    allOpt.value='All'; 
    allOpt.text='All'; 
    sel.appendChild(allOpt);
    
    items.forEach(it => { 
        const opt = document.createElement('option'); 
        opt.value=it; 
        opt.text=it; 
        sel.appendChild(opt); 
    });
  };
  
  makeOptions(yearSel, years);
  makeOptions(jurSel, juris);

  const readFilters = () => ({ year: yearSel.value, jurisdiction: jurSel.value });
  const trigger = () => { if (typeof onChange === 'function') onChange(readFilters()); };

  yearSel.addEventListener('change', trigger);
  jurSel.addEventListener('change', trigger);
  
  resetBtn.addEventListener('click', () => {
    yearSel.value = 'All'; 
    jurSel.value = 'All'; 
    trigger();
  });
};