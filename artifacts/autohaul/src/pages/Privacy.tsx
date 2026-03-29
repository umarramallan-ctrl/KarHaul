import { MainLayout } from "@/components/layout/MainLayout";

const EFFECTIVE_DATE = "March 25, 2026";

export default function Privacy() {
  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto px-4 py-12 prose dark:prose-invert prose-headings:font-display">
        <h1>Privacy Policy</h1>
        <p className="lead text-muted-foreground">Effective Date: {EFFECTIVE_DATE} &nbsp;|&nbsp; Last Updated: {EFFECTIVE_DATE}</p>

        <p>
          EvoHaul ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and platform services at evohaul.com (the "Platform"). Please read this policy carefully. By using the Platform, you agree to the practices described here.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>1.1 Information You Provide Directly</h3>
        <ul>
          <li><strong>Account Registration:</strong> Name, email address, phone number, role (shipper or carrier), and profile photo.</li>
          <li><strong>Carrier Credentials:</strong> USDOT number, MC number, insurance provider, insurance policy number, truck type, and capacity.</li>
          <li><strong>Shipment Listings:</strong> Vehicle details, pickup and delivery addresses, photos, and transport preferences.</li>
          <li><strong>Messages:</strong> Content of in-platform communications between shippers and carriers. Note: our content-filtering system scans messages for policy violations (phone numbers, external contact attempts) to maintain platform integrity.</li>
          <li><strong>Reviews & Ratings:</strong> Feedback you submit about other users after completed transactions.</li>
          <li><strong>Security Credentials:</strong> Passkey authenticator data (stored as cryptographic public keys — your private key never leaves your device), hashed TOTP secrets, and phone numbers used for SMS two-factor authentication.</li>
          <li><strong>Support Communications:</strong> Information you provide when contacting our support team.</li>
        </ul>

        <h3>1.2 Information Collected Automatically</h3>
        <ul>
          <li><strong>Log Data:</strong> IP addresses, browser type and version, pages visited, time and date of visits, and referring URLs.</li>
          <li><strong>Session Data:</strong> Encrypted session tokens stored in HTTP-only cookies to maintain your authenticated state.</li>
          <li><strong>Device Information:</strong> Operating system, device type, and browser fingerprint for security and fraud prevention purposes.</li>
          <li><strong>Usage Data:</strong> Features accessed, search queries within the platform, bid activity, and booking status updates.</li>
        </ul>

        <h3>1.3 Information From Third Parties</h3>
        <ul>
          <li><strong>Replit Authentication:</strong> When you log in via Replit Auth (OpenID Connect), we receive your Replit user ID, display name, and email address.</li>
          <li><strong>FMCSA Data:</strong> We may query public FMCSA records to assist in verifying carrier DOT/MC numbers and insurance status during the verification process.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Create, authenticate, and manage your account</li>
          <li>Facilitate connections between shippers and carriers on the Platform</li>
          <li>Display your profile, credentials, and reputation data to other users</li>
          <li>Send notifications about bids, bookings, messages, and platform activity</li>
          <li>Enforce our Terms of Service and Community Guidelines</li>
          <li>Filter communications to prevent off-platform contact solicitation and policy violations</li>
          <li>Verify carrier credentials and display verification badges</li>
          <li>Operate security features including passkey authentication and two-factor authentication</li>
          <li>Prevent fraud, abuse, and unauthorized access to the Platform</li>
          <li>Improve the Platform through aggregated, de-identified usage analytics</li>
          <li>Respond to your support requests and inquiries</li>
          <li>Comply with applicable laws, regulations, and legal obligations</li>
        </ul>

        <h2>3. How We Share Your Information</h2>

        <h3>3.1 With Other Platform Users</h3>
        <p>
          When you post a shipment or submit a bid, certain profile information is visible to the other party: your name, profile photo, role, reviews, ratings, and (for carriers) your DOT/MC numbers and verification status. Your email address and phone number are <strong>not</strong> shared directly through the Platform — communication is routed through in-app messaging.
        </p>

        <h3>3.2 Service Providers</h3>
        <p>We may share information with trusted third-party service providers who assist us in operating the Platform, including:</p>
        <ul>
          <li><strong>Cloud hosting and infrastructure</strong> (e.g., Replit)</li>
          <li><strong>Database services</strong> (PostgreSQL)</li>
          <li><strong>SMS delivery</strong> (Twilio, for two-factor authentication codes)</li>
          <li><strong>Analytics providers</strong> (aggregated, anonymized data only)</li>
        </ul>
        <p>All service providers are contractually required to use your data only for the purposes of providing services to us and to maintain appropriate security measures.</p>

        <h3>3.3 Legal Requirements</h3>
        <p>
          We may disclose your information if required to do so by law, regulation, or valid legal process (such as a court order or subpoena), or if we believe in good faith that disclosure is necessary to protect the rights, property, or safety of EvoHaul, our users, or the public.
        </p>

        <h3>3.4 Business Transfers</h3>
        <p>
          In the event of a merger, acquisition, reorganization, or sale of assets, your information may be transferred as part of that transaction. We will provide notice before your information is transferred and becomes subject to a different privacy policy.
        </p>

        <h3>3.5 No Sale of Personal Data</h3>
        <p>
          <strong>We do not sell, rent, or trade your personal information to third parties for their marketing purposes.</strong>
        </p>

        <h2>4. Data Retention</h2>
        <p>
          We retain your account information for as long as your account is active or as needed to provide services. If you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required for legal, regulatory, or fraud-prevention purposes. Message content may be retained for up to 12 months for safety and compliance review. Aggregated, de-identified analytics data may be retained indefinitely.
        </p>

        <h2>5. Security</h2>
        <p>
          We implement industry-standard security measures to protect your information:
        </p>
        <ul>
          <li>All data in transit is encrypted using TLS 1.2 or higher</li>
          <li>Session tokens are stored in HTTP-only, Secure, SameSite cookies</li>
          <li>Passkey credentials are stored as cryptographic public keys only — your biometric data and private keys never reach our servers</li>
          <li>TOTP secrets are stored in encrypted form</li>
          <li>Access to production databases is restricted to authorized personnel</li>
          <li>Two-factor authentication is available and recommended for all accounts</li>
        </ul>
        <p>
          No method of internet transmission or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security. In the event of a data breach that poses a risk to your rights, we will notify affected users as required by applicable law.
        </p>

        <h2>6. Your Rights and Choices</h2>

        <h3>6.1 Account Information</h3>
        <p>You may update your profile information at any time through your Profile & Settings page.</p>

        <h3>6.2 Data Access and Portability</h3>
        <p>You may request a copy of the personal data we hold about you by contacting us at privacy@evohaul.com. We will provide the data in a commonly used, machine-readable format within 30 days.</p>

        <h3>6.3 Deletion</h3>
        <p>You may request deletion of your account and associated personal data by contacting support@evohaul.com. We will process your request within 30 days, subject to any legal retention obligations.</p>

        <h3>6.4 Opt-Out of Communications</h3>
        <p>You may opt out of non-essential email communications by using the unsubscribe link in any marketing email. You cannot opt out of transactional notifications required for platform operations (booking confirmations, bid notifications, security alerts).</p>

        <h3>6.5 California Residents (CCPA)</h3>
        <p>
          California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, the right to delete personal information, and the right to opt out of the sale of personal information (which we do not conduct). To exercise these rights, contact us at privacy@evohaul.com.
        </p>

        <h3>6.6 European Economic Area Residents (GDPR)</h3>
        <p>
          If you are located in the EEA, you have rights under the General Data Protection Regulation (GDPR) including the right to access, rectify, erase, restrict processing, and port your personal data, as well as the right to object to processing based on legitimate interests. Our legal basis for processing is your consent (account creation), contract performance (providing marketplace services), and legitimate interests (security, fraud prevention, platform improvement). Contact us at privacy@evohaul.com to exercise these rights.
        </p>

        <h2>7. Cookies and Tracking</h2>
        <p>
          We use essential cookies required for Platform operation:
        </p>
        <ul>
          <li><strong>Session cookies:</strong> To maintain your authenticated state across pages</li>
          <li><strong>Security cookies:</strong> For CSRF protection and OAuth state management</li>
          <li><strong>Preference cookies:</strong> To remember your display preferences</li>
        </ul>
        <p>
          We do not use third-party advertising cookies or cross-site tracking technologies. We do not participate in behavioral advertising networks.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          EvoHaul is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has created an account, we will terminate the account and delete the associated data promptly. If you believe a minor has submitted personal information, contact us at privacy@evohaul.com.
        </p>

        <h2>9. Third-Party Links</h2>
        <p>
          The Platform may contain links to third-party websites, including the FMCSA portal, U.S. DOT resources, and other external references. We are not responsible for the privacy practices or content of those sites. We encourage you to review the privacy policies of any third-party sites you visit.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we make material changes, we will notify registered users by email and display a prominent notice on the Platform. The "Last Updated" date at the top of this policy reflects the most recent revision. Your continued use of the Platform after changes are posted constitutes your acceptance of the updated policy.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
        </p>
        <ul>
          <li><strong>Email:</strong> privacy@evohaul.com</li>
          <li><strong>Support:</strong> support@evohaul.com</li>
          <li><strong>Support Center:</strong> <a href="/support">evohaul.com/support</a></li>
        </ul>
        <p>
          We will respond to all privacy-related inquiries within 30 days.
        </p>
      </div>
    </MainLayout>
  );
}
