const initFilters = (data, onChange) => {
  const yearContainer = document.getElementById('filter-year-container');
  const jurSel = document.getElementById('filter-jurisdiction');
  const resetBtn = document.getElementById('filter-reset');
  if (!yearContainer || !jurSel) return;

  const yearTrigger = document.getElementById('filter-year-trigger');
  const yearMenu = document.getElementById('filter-year-menu');
  const triggerText = yearTrigger.querySelector('.trigger-text');
  
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
  
  makeOptions(jurSel, juris);

  // Set up Year Dropdown menu items
  const renderYearCheckboxes = () => {
    yearMenu.innerHTML = '';

    // "All Years" option
    const allLabel = document.createElement('label');
    const allInput = document.createElement('input');
    const allSpan = document.createElement('span');
    allLabel.className = 'dropdown-item';
    allInput.type = "checkbox";
    allInput.value = "All";
    allInput.id = "year-checkbox-all";
    allInput.checked = true;
    allSpan.textContent = "All Years";
    allLabel.appendChild(allInput);
    allLabel.appendChild(allSpan);
    yearMenu.appendChild(allLabel);

    // Individual years options
    years.forEach(year => {
      const yearLabel = document.createElement('label');
      const inputType = document.createElement('input');
      const spanText = document.createElement('span');
      yearLabel.className = 'dropdown-item';
      inputType.type = "checkbox";
      inputType.value = `${year}`;
      inputType.classList.add("year-checkbox-item");
      spanText.textContent = `${year}`;
      yearLabel.appendChild(inputType);
      yearLabel.appendChild(spanText);
      yearMenu.appendChild(yearLabel);

      inputType.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          inputType.click();
        }
      })
    });
  };

  renderYearCheckboxes();

  const allCheckbox = document.getElementById('year-checkbox-all');
  const itemCheckboxes = yearMenu.querySelectorAll('.year-checkbox-item');

  // Toggle dropdown menu open/close
  yearTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    yearContainer.classList.toggle('open');
  });

  // Close dropdown menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!yearContainer.contains(e.target)) {
      yearContainer.classList.remove('open');
    }
  });

  const getSelectedYears = () => {
    if (allCheckbox.checked) {
      return 'All';
    }
    const selected = [];
    itemCheckboxes.forEach(cb => {
      if (cb.checked) {
        selected.push(+cb.value);
      }
    });
    return selected.length === 0 ? 'All' : selected;
  };

  const updateTriggerText = () => {
    const sel = getSelectedYears();
    if (sel === 'All') {
      triggerText.textContent = 'All Years';
    } else {
      triggerText.textContent = sel.join(', ');
    }
  };

  const onYearCheckboxChange = (e) => {
    const target = e.target;
    if (target === allCheckbox) {
      if (allCheckbox.checked) {
        // Uncheck all individual items
        itemCheckboxes.forEach(cb => cb.checked = false);
      } else {
        // Prevent unchecking "All" if nothing else is checked
        const anyChecked = Array.from(itemCheckboxes).some(cb => cb.checked);
        if (!anyChecked) {
          allCheckbox.checked = true;
        }
      }
    } else {
      if (target.checked) {
        // Uncheck "All"
        allCheckbox.checked = false;
      } else {
        // If no individual year is checked, check "All" back
        const anyChecked = Array.from(itemCheckboxes).some(cb => cb.checked);
        if (!anyChecked) {
          allCheckbox.checked = true;
        }
      }
    }
    updateTriggerText();
    trigger();
  };

  allCheckbox.addEventListener('change', onYearCheckboxChange);
  itemCheckboxes.forEach(cb => cb.addEventListener('change', onYearCheckboxChange));

  const readFilters = () => ({
    year: getSelectedYears(),
    jurisdiction: jurSel.value
  });

  const trigger = () => { if (typeof onChange === 'function') onChange(readFilters()); };

  jurSel.addEventListener('change', trigger);
  
  resetBtn.addEventListener('click', e => {
    e.preventDefault();
    // Reset Year Custom Dropdown
    allCheckbox.checked = true;
    itemCheckboxes.forEach(cb => cb.checked = false);
    updateTriggerText();

    jurSel.value = 'All';
    trigger();
  });

  // initial trigger
  trigger();
};