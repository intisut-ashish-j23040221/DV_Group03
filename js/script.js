(function () {
	const pageRoutes = {
		home: "index.html",
		breath_test: "breath_test.html",
		drug_test: "drug_test.html",
		fines: "fines.html"
	};

	function setupNavigation() {
		const navLinks = document.querySelectorAll(".nav-link");
		navLinks.forEach((link) => {
			link.addEventListener("click", (event) => {
				const targetPage = link.getAttribute("data-target");
				//It validate is the target page match with pageRoutes or Not
				if (!targetPage || !pageRoutes[targetPage]) {
					return;
				}
				event.preventDefault();  
				//Built-in browser that no need to define and used to prevent the default action.
				//It means the browser not directly navigate according to the href attribute, it strictly follow the JavaScript file.
				window.location.href = pageRoutes[targetPage];
			});
		});

		const logoButton = document.querySelector(".logo-button");
		if (logoButton) {
			logoButton.addEventListener("click", (event) => {
				const currentPath = window.location.pathname;
				if (!currentPath.endsWith('index.html') && currentPath !== '/' && !currentPath.endsWith('DV_Group03/')) {
					event.preventDefault();
					window.location.href = "index.html";
				}
			});
		}
	}

	function setActiveNavigation() {
		//At the HTML files, we specify a variable named data-page that help the JavaScript to know any of them is the current page.
		const currentPage = document.body.getAttribute("data-page");  
		const navLinks = document.querySelectorAll(".nav-link");

		navLinks.forEach((link) => {
			const isCurrent = link.getAttribute("data-target") === currentPage;
			link.classList.toggle("is-active", isCurrent); // Add class is-active to enable the CSS style (Highlight current page in the navigation bar)
		});
	}

	function setFooterYear() {
		const yearNode = document.getElementById("current-year");
		if (yearNode) {
			yearNode.textContent = String(new Date().getFullYear()); //Get a timestamp, Retrieve the Current Year from timestamp, Convert to String)
		}
	}

	function setupPopoverFocusTrap(popover) {
		// Find all interactive elements inside the driver.js popover card
		const focusableSelectors = 'a, button, input, [tabindex="0"]';
		
		// Remove any old keydown listeners to prevent duplicates on step changes
		popover.onkeydown = null; 

		popover.onkeydown = function(e) {
			if (e.key !== 'Tab') return;

			const focusableElements = Array.from(popover.querySelectorAll(focusableSelectors));
			if (focusableElements.length === 0) return;

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			// Shift + Tab (Navigating backwards)
			if (e.shiftKey) {
				if (document.activeElement === firstElement) {
					e.preventDefault();
					lastElement.focus(); // Loop to the last button (e.g., "Next")
				}
			} else { // Tab (Navigating forwards)
				if (document.activeElement === lastElement) {
					e.preventDefault();
					firstElement.focus(); // Loop to the first element (e.g., Close button)
				}
			}
		};
	}

	function setupOnboardingTour() {
		const tourBtn = document.getElementById('start-tour-btn');
		if (tourBtn && window.driver) {
			tourBtn.addEventListener('click', (e) => {
				e.preventDefault();
				const driverObj = window.driver.js.driver({
					showProgress: true,
					steps: [
						{ element: '.welcome-container', popover: { title: 'Welcome!', description: 'This platform helps you explore traffic compliance trends in Australia.', side: "left", align: 'start' }},
						{ element: '.top-nav', popover: { title: 'Navigation Menu', description: 'Use these links to navigate to the different dashboards: Random Breath Test, Drug Tests, and Fines.', side: "bottom", align: 'start' }},
						{ element: '.logo-button', popover: { title: 'Home', description: 'Click the logo at any time to return to this home page.', side: "bottom", align: 'start' }},
						{ element: '.nav-link[href="breath_test.html"]', popover: { title: 'Random Breath Test Dashboard', description: 'Click here to start exploring the Random Breath Test dashboard!', side: "bottom", align: 'start' }},
						{ element: '.nav-link[href="drug_test.html"]', popover: { title: 'Drug Tests Dashboard', description: 'Click here to explore the Drug Tests dashboard, tracking tests and positive outcomes.', side: "bottom", align: 'start' }},
						{ element: '.nav-link[href="fines.html"]', popover: { title: 'Fines Dashboard', description: 'Click here to analyze traffic fines, historical trends, and camera detection data.', side: "bottom", align: 'start' }},
						{ element: '.nav-menu', popover: { title: 'Dashboard Tours', description: 'Once you are on a dashboard, look for the "?" icon next to "Filter options" to take a tour of that specific page!', side: "bottom", align: 'start' }}
					],
					onHighlighted: (element, step, options) => {
						setTimeout(() => {
							// 1. Find the driver popover card container
							const popoverContainer = document.querySelector('.driver-popover');
							if (!popoverContainer) return;

							// 2. Make the popover container focusable and shift focus to it
							const nextbtn = document.querySelector(".driver-popover-next-btn")
							nextbtn.setAttribute('tabindex', '-1');
							nextbtn.focus();

							// // 3. Set up the focus trap for this step
							// setupPopoverFocusTrap(popoverContainer);
						}, 50);
					}
				});
				driverObj.drive();
			});
		}
	}


	function setupBreathTour() {
		const breathTourBtn = document.getElementById('breath-tour-btn');
		if (breathTourBtn && window.driver) {
			breathTourBtn.addEventListener('click', (e) => {
				e.preventDefault();
				const driverObj = window.driver.js.driver({
					showProgress: true,
					steps: [
						{ element: '.sidebar-panel--filters', popover: { title: 'Filter Options', description: 'Filter the data by Year and Jurisdiction to focus on specific segments.', side: "right", align: 'start' }},
						{ element: '.sidebar-panel--kpis', popover: { title: 'Key Indicators', description: 'Quick summary of total breath tests, positive rates, and other key figures compared to the previous year.', side: "right", align: 'start' }},
						{ element: '#tour-breath-trend', popover: { title: 'Tests Conducted vs Positive Results', description: 'This chart displays the trend of total tests conducted against positive results over time. You can click on legends to toggle series.', side: "bottom", align: 'center' }},
						{ element: '#tour-breath-percent', popover: { title: 'Positive Results by Jurisdiction', description: 'A geographic distribution highlighting the total positive cases across Australian states.', side: "top", align: 'center' }},
						{ element: '#tour-breath-jurisdiction', popover: { title: 'Tests per 10,000 Licenses', description: 'This bar chart normalizes the number of breath tests against the licensed driver population for fair comparison.', side: "top", align: 'center' }},
						{ popover: { title: 'Interactive Features', description: 'Remember, you can hover over elements for details, or right-click any chart to open a data table!', side: "center", align: 'center' }}
					]
				});
				driverObj.drive();
			});
		}
	}

	function setupDrugTour() {
		const drugTourBtn = document.getElementById('drug-tour-btn');
		if (drugTourBtn && window.driver) {
			drugTourBtn.addEventListener('click', (e) => {
				e.preventDefault();
				const driverObj = window.driver.js.driver({
					showProgress: true,
					steps: [
						{ element: '.sidebar-panel--filters', popover: { title: 'Filter Options', description: 'Filter drug test data by Year and Jurisdiction.', side: "right", align: 'start' }},
						{ element: '.sidebar-panel--kpis', popover: { title: 'Drug Test KPIs', description: 'View total drug tests, positive results, and year-over-year changes.', side: "right", align: 'start' }},
						{ element: '#tour-drug-trend', popover: { title: 'Drug Test Trends', description: 'Compare total tests vs positive cases over time. You can click on legends to toggle series.', side: "bottom", align: 'center' }},
						{ element: '#tour-drug-percent', popover: { title: 'Regional Distribution', description: 'See how positive drug tests vary across different jurisdictions.', side: "top", align: 'center' }},
						{ element: '#tour-drug-jurisdiction', popover: { title: 'Normalized Data', description: 'Drug tests per 10,000 licenses for a fair comparison between states.', side: "top", align: 'center' }},
						{ popover: { title: 'Interactive Features', description: 'Remember, you can hover over elements for details, or right-click any chart to open a data table!', side: "center", align: 'center' }}
					]
				});
				driverObj.drive();
			});
		}
	}

	function setupFinesTour() {
		const finesTourBtn = document.getElementById('fines-tour-btn');
		if (finesTourBtn && window.driver) {
			finesTourBtn.addEventListener('click', (e) => {
				e.preventDefault();
				const driverObj = window.driver.js.driver({
					showProgress: true,
					steps: [
						{ element: '.sidebar-panel--filters', popover: { title: 'Fines Filters', description: 'Filter fines by Year, Jurisdiction, and specific Metrics.', side: "right", align: 'start' }},
						{ element: '.sidebar-panel--kpis', popover: { title: 'Financial Indicators', description: 'Quick overview of total fines and average amounts.', side: "right", align: 'start' }},
						{ element: '#tour-fines-trend', popover: { title: 'Historical Fines', description: 'Track how fine amounts have changed over the years. You can click on legends to toggle series.', side: "bottom", align: 'center' }},
						{ element: '#tour-fines-state', popover: { title: 'Top Jurisdictions', description: 'Identify states with the highest fine revenue.', side: "top", align: 'center' }},
						{ element: '#tour-fines-camera', popover: { title: 'Detection Methods', description: 'See which enforcement methods (like cameras or officer patrols) are generating the most fines.', side: "top", align: 'center' }},
						{ popover: { title: 'Interactive Features', description: 'Remember, you can hover over elements for details, or right-click any chart to open a data table!', side: "center", align: 'center' }}
					]
				});
				driverObj.drive();
			});
		}
	}

	//Run the above functions after the Browser fully load the HTML content
	document.addEventListener("DOMContentLoaded", () => {
		setupNavigation();
		setActiveNavigation();
		setFooterYear();
		setupOnboardingTour();
		setupBreathTour();
		setupDrugTour();
		setupFinesTour();
	});
})();
