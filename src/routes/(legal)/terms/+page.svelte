<script lang="ts">
	import { PUBLIC_APP_DOMAIN, PUBLIC_CONTACT_EMAIL, PUBLIC_COMPANY_NAME } from '$env/static/public';
</script>

<svelte:head>
	<title>Terms & Conditions — Link</title>
	<meta
		name="description"
		content="Terms and conditions for using the Link URL shortener service."
	/>
</svelte:head>

<article class="prose max-w-none prose-neutral">
	<h1>Terms & Conditions</h1>
	<p class="text-muted-foreground">Last updated: March 3, 2026</p>

	<p>
		Welcome to <strong>Link</strong> (accessible at
		<a href="https://{PUBLIC_APP_DOMAIN}">{PUBLIC_APP_DOMAIN}</a>, hereinafter referred to as the
		"Service"). The Service is operated by <strong>{PUBLIC_COMPANY_NAME}</strong> ("we", "us", or "our").
		By accessing or using the Service, you agree to be bound by these Terms & Conditions ("Terms"). If
		you do not agree with any part of these Terms, you must not use the Service.
	</p>

	<h2>1. Service Description</h2>
	<p>
		Link is a URL shortening and link management platform. The Service allows you to create
		shortened URLs, manage your links, tag and organize them, and view analytics data about link
		clicks including geographic distribution, browser, operating system, and device information.
	</p>

	<h2>2. Accounts</h2>
	<p>
		When you use the Service, an account is created for you identified by a unique token and
		optional username. You are responsible for maintaining the confidentiality of your account
		token. You are responsible for all activities that occur under your account. We reserve the
		right to suspend or terminate accounts that violate these Terms.
	</p>

	<h2>3. Acceptable Use</h2>
	<p>You agree not to use the Service to:</p>
	<ul>
		<li>
			Create links to content that is illegal, harmful, threatening, abusive, or otherwise
			objectionable
		</li>
		<li>Distribute malware, phishing pages, or other malicious content</li>
		<li>Send spam or unsolicited messages using shortened links</li>
		<li>Infringe upon the intellectual property rights of others</li>
		<li>Impersonate any person or entity</li>
		<li>Interfere with or disrupt the Service or servers connected to the Service</li>
		<li>Attempt to gain unauthorized access to any part of the Service</li>
	</ul>
	<p>
		We reserve the right to remove any links and suspend or terminate any accounts that violate
		these Terms, at our sole discretion and without prior notice.
	</p>

	<h2>4. Link Availability & Archiving</h2>
	<p>
		We strive to keep your shortened links active and accessible. However, we do not guarantee
		permanent availability of any link. Links may become unavailable if they are archived by you, if
		your account is terminated, or if we determine that a link violates these Terms. Archived links
		will return a notification to visitors indicating the link has been archived.
	</p>

	<h2>5. Analytics Data</h2>
	<p>
		The Service collects analytics data when shortened links are clicked. This data includes
		approximate geographic location, browser, operating system, and device type. Analytics data is
		associated with the link and is available to the link owner. For more details on what data is
		collected and how it is used, please refer to our
		<a href="/privacy">Privacy Policy</a>.
	</p>

	<h2>6. Intellectual Property</h2>
	<p>
		The Service, including its original content, features, and functionality, is owned by
		{PUBLIC_COMPANY_NAME} and is protected by applicable intellectual property laws. You retain ownership
		of any content you link to through the Service. By using the Service, you grant us a limited license
		to process and redirect your URLs as necessary to provide the Service.
	</p>

	<h2>7. Disclaimer of Warranties</h2>
	<p>
		The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind,
		whether express or implied. We do not warrant that the Service will be uninterrupted, secure, or
		error-free. We make no warranties regarding the accuracy or reliability of any information
		obtained through the Service.
	</p>

	<h2>8. Limitation of Liability</h2>
	<p>
		To the fullest extent permitted by applicable law, {PUBLIC_COMPANY_NAME} shall not be liable for any
		indirect, incidental, special, consequential, or punitive damages, including but not limited to loss
		of profits, data, or use, arising out of or related to your use of the Service. Our total liability
		for any claim arising from or related to the Service shall not exceed the amount you paid to us, if
		any, during the twelve (12) months preceding the claim.
	</p>

	<h2>9. Account & Data Deletion</h2>
	<p>
		You may request deletion of your account, links, and associated analytics data at any time by
		verifying your identity through your account token and username. Upon deletion, your data will
		be permanently removed from our systems.
	</p>

	<h2>10. Changes to Terms</h2>
	<p>
		We may update these Terms from time to time. When we do, we will revise the "Last updated" date
		at the top of this page. Your continued use of the Service after any changes constitutes
		acceptance of the updated Terms. We encourage you to review these Terms periodically.
	</p>

	<h2>11. Contact</h2>
	<p>
		If you have any questions about these Terms, please contact us at
		<a href="mailto:{PUBLIC_CONTACT_EMAIL}">{PUBLIC_CONTACT_EMAIL}</a>.
	</p>
</article>
