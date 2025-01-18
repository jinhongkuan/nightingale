import puppeteer from 'puppeteer';

const scrapeLinkedInJobs = async (email: string, password: string, jobQuery: string) => {
	// Launch Puppeteer browser
	const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();

	try {
		// Navigate to LinkedIn login page
		await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });

		// Log in to LinkedIn
		await page.type('#username', email, { delay: 50 });
		await page.type('#password', password, { delay: 50 });
		await page.click('button[type="submit"]');
		await page.waitForNavigation({ waitUntil: 'networkidle2' });

		console.log('Logged into LinkedIn successfully.');

		// Navigate to LinkedIn Jobs search page
		const jobSearchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobQuery)}`;
		await page.goto(jobSearchUrl, { waitUntil: 'networkidle2' });

		console.log(`Navigated to job search page for query: ${jobQuery}`);

		// Wait for job postings to load
		await page.waitForSelector('.jobs-search-results__list-item');

		// Scrape job postings
		const jobListings = await page.$$eval('.jobs-search-results__list-item', (items) => {
			return items.map((item) => {
				const title = item.querySelector('h3')?.textContent?.trim() || 'No title';
				const company = item.querySelector('h4')?.textContent?.trim() || 'No company';
				const location =
					item.querySelector('.job-search-card__location')?.textContent?.trim() || 'No location';
				const link = item.querySelector('a')?.getAttribute('href') || 'No link';
				return { title, company, location, link };
			});
		});

		console.log('Job postings scraped successfully:', jobListings);

		// Close the browser
		await browser.close();

		return jobListings;
	} catch (error) {
		console.error('Error scraping LinkedIn jobs:', error);
		await browser.close();
		throw error;
	}
};

// Usage
(async () => {
	const email = 'your-email@example.com';
	const password = 'your-password';
	const jobQuery = 'Blockchain Developer';

	try {
		const jobs = await scrapeLinkedInJobs(email, password, jobQuery);
		console.log('Scraped jobs:', jobs);
	} catch (error) {
		console.error('Failed to scrape LinkedIn jobs:', error);
	}
})();
