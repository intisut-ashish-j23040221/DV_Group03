(function () {
	const pageRoutes = {
		home: "index.html",
		speeding_fines: "speeding.html"
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
				event.preventDefault();
				window.location.href = pageRoutes.home;
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

	//Run the above functions after the Browser fully load the HTML content
	document.addEventListener("DOMContentLoaded", () => {
		setupNavigation();
		setActiveNavigation();
		setFooterYear();
	});
})();
