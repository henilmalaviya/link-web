<script lang="ts">
	import { PUBLIC_APP_DOMAIN, PUBLIC_CONTACT_EMAIL, PUBLIC_COMPANY_NAME } from '$env/static/public';
</script>

<svelte:head>
	<title>Privacy Policy — Link</title>
	<meta
		name="description"
		content="Privacy policy for the Link URL shortener service. Learn how we collect, use, and protect your data."
	/>
</svelte:head>

<article class="prose max-w-none prose-neutral">
	<h1>Privacy Policy</h1>
	<p class="text-muted-foreground">Last updated: March 3, 2026</p>

	<p>
		This Privacy Policy describes how <strong>{PUBLIC_COMPANY_NAME}</strong> ("we", "us", or "our")
		collects, uses, and protects your information when you use the <strong>Link</strong> service
		(accessible at <a href="https://{PUBLIC_APP_DOMAIN}">{PUBLIC_APP_DOMAIN}</a>, the "Service").
	</p>

	<h2>1. Information We Collect</h2>
	<p>We collect the following types of information:</p>

	<h3>a) Account Information</h3>
	<p>
		When you use the Service, we create an account associated with a unique authentication token and
		an optional username. We store a hash of your token for security purposes — we do not store the
		raw token itself.
	</p>

	<h3>b) Link Data</h3>
	<p>
		When you create a shortened link, we store the original destination URL, the generated short
		identifier, click count, any tags you assign, and whether the link is archived.
	</p>

	<h3>c) Click Analytics</h3>
	<p>When someone clicks on a shortened link, we collect the following information:</p>
	<ul>
		<li>
			<strong>Geolocation data:</strong> We use the visitor's IP address to determine their
			approximate geographic location (country, region, and city) through the
			<a href="http://ip-api.com" target="_blank" rel="noopener noreferrer">ip-api.com</a> service.
			<strong>The IP address is deleted immediately after the geolocation lookup is complete</strong
			>
			and is not stored permanently.
		</li>
		<li>
			<strong>Browser and operating system:</strong> Derived from the visitor's user agent string.
		</li>
		<li>
			<strong>Device type:</strong> Whether the visitor is using a desktop, mobile, or tablet device.
		</li>
	</ul>

	<h2>2. How We Use Your Information</h2>
	<p>We use the collected information to:</p>
	<ul>
		<li>Provide and maintain the URL shortening service</li>
		<li>Generate analytics dashboards showing click statistics for your links</li>
		<li>Display geographic, browser, device, and operating system breakdowns of visitors</li>
		<li>Enable link management features such as tagging, searching, and archiving</li>
		<li>Improve and optimize the Service</li>
	</ul>

	<h2>3. Data Storage</h2>
	<p>
		Your data is stored using <a href="https://convex.dev" target="_blank" rel="noopener noreferrer"
			>Convex</a
		>, a cloud-hosted backend platform. Data is stored securely on Convex's infrastructure. We
		retain your data for as long as your account is active or as needed to provide the Service.
	</p>

	<h2>4. Third-Party Services</h2>
	<p>We use the following third-party services:</p>
	<ul>
		<li>
			<strong
				><a href="https://convex.dev" target="_blank" rel="noopener noreferrer">Convex</a>:</strong
			>
			Cloud backend and database for storing account, link, and analytics data.
		</li>
		<li>
			<strong
				><a href="http://ip-api.com" target="_blank" rel="noopener noreferrer">ip-api.com</a
				>:</strong
			>
			IP geolocation service used to determine the approximate location of link visitors. IP addresses
			are sent to ip-api.com for lookup and are <strong>not retained</strong> by us after the lookup.
		</li>
	</ul>
	<p>
		These services have their own privacy policies governing how they handle data. We encourage you
		to review their policies.
	</p>

	<h2>5. Cookies</h2>
	<p>
		The Service does not use cookies for tracking, analytics, or advertising purposes. The Service
		may use essential browser storage (such as localStorage) for basic functionality like
		maintaining your session state.
	</p>

	<h2>6. Data Security</h2>
	<p>
		We take reasonable measures to protect your information from unauthorized access, alteration,
		disclosure, or destruction. Account authentication tokens are stored as hashes, and IP addresses
		are deleted after geolocation processing. However, no method of transmission over the Internet
		or electronic storage is 100% secure, and we cannot guarantee absolute security.
	</p>

	<h2>7. Your Rights & Data Deletion</h2>
	<p>You have the right to:</p>
	<ul>
		<li>
			<strong>Access your data:</strong> View your links and analytics through the Service dashboard.
		</li>
		<li>
			<strong>Delete your links:</strong> Remove individual links and their associated analytics data
			by verifying account ownership with your token and username.
		</li>
		<li>
			<strong>Delete your account:</strong> Request complete deletion of your account and all associated
			data by verifying your identity through your token and username.
		</li>
	</ul>
	<p>Upon deletion, your data is permanently removed from our systems and cannot be recovered.</p>

	<h2>8. Children's Privacy</h2>
	<p>
		The Service is not intended for use by anyone under the age of 13. We do not knowingly collect
		personal information from children under 13. If we become aware that we have collected personal
		information from a child under 13, we will take steps to delete such information.
	</p>

	<h2>9. Changes to This Policy</h2>
	<p>
		We may update this Privacy Policy from time to time. When we do, we will revise the "Last
		updated" date at the top of this page. Your continued use of the Service after any changes
		constitutes acceptance of the updated policy. We encourage you to review this policy
		periodically.
	</p>

	<h2>10. Contact</h2>
	<p>
		If you have any questions about this Privacy Policy or your data, please contact us at
		<a href="mailto:{PUBLIC_CONTACT_EMAIL}">{PUBLIC_CONTACT_EMAIL}</a>.
	</p>
</article>
