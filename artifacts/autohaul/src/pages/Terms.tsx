import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";

const EFFECTIVE_DATE = "March 25, 2026";

const SECTIONS = ["Terms of Service", "Liability Waiver", "Privacy Policy", "Carrier Requirements", "Cookie Policy"] as const;
type Section = typeof SECTIONS[number];

export default function Terms() {
  const initialSection = (() => {
    const p = new URLSearchParams(window.location.search).get("section") as Section | null;
    return SECTIONS.includes(p as Section) ? (p as Section) : "Terms of Service";
  })();
  const [active, setActive] = useState<Section>(initialSection);

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-slate-50 to-transparent dark:from-slate-900/50 py-10 border-b">
        <div className="container max-w-5xl mx-auto px-4">
          <h1 className="text-3xl font-bold tracking-tight mb-1">Legal Documents</h1>
          <p className="text-muted-foreground text-sm">Effective: {EFFECTIVE_DATE}</p>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar nav */}
        <aside className="md:w-56 shrink-0">
          <nav className="sticky top-6 space-y-1">
            {SECTIONS.map(s => (
              <button
                key={s}
                onClick={() => setActive(s)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  active === s
                    ? "bg-primary text-white font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 prose dark:prose-invert max-w-none prose-headings:font-display prose-h2:text-xl prose-h3:text-base">

          {/* ── Terms of Service ── */}
          {active === "Terms of Service" && (
            <>
              <h2>Terms of Service</h2>
              <p className="lead">Last Updated: {EFFECTIVE_DATE}</p>

              <div className="not-prose bg-red-50 dark:bg-red-950/30 p-5 rounded-lg border border-red-200 dark:border-red-900 mb-6">
                <h3 className="text-base font-bold text-red-900 dark:text-red-400 mb-2">IMPORTANT — READ BEFORE USING</h3>
                <p className="text-sm text-red-800 dark:text-red-300">
                  These Terms of Service constitute a legally binding agreement between you and KarHaul. By creating an account or using the Platform, you agree to these Terms in their entirety. If you do not agree, you must not use the Platform.
                </p>
              </div>

              <h3>1. About KarHaul</h3>
              <p>
                KarHaul ("Platform," "we," "our," "us") is a technology marketplace operated at karhaul.com that allows individuals and businesses ("Shippers") to post vehicle transport requests and independent licensed motor carriers ("Carriers" or "Drivers") to submit bids on those requests. <strong>KarHaul is not a motor carrier, freight broker, freight forwarder, or transportation provider of any kind.</strong> We do not employ drivers, own vehicles, dispatch transport, or handle freight.
              </p>

              <h3>2. Eligibility</h3>
              <p>You must be at least 18 years of age to use the Platform. By using the Platform, you represent and warrant that you are 18 or older and have the legal capacity to enter binding contracts. If you are using the Platform on behalf of a business entity, you represent that you are authorized to bind that entity to these Terms.</p>

              <h3>3. Account Registration and Security</h3>
              <p>You agree to provide accurate, current, and complete information during registration and to keep your account information updated. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at support@karhaul.com if you suspect unauthorized access. We offer two-factor authentication (TOTP and SMS) and passkey authentication — we strongly recommend enabling these for your security.</p>

              <h3>4. Platform Fees</h3>
              <p>KarHaul charges a <strong>3% service fee to Shippers only</strong>, calculated on the agreed transport price at the time a bid is accepted. This fee is clearly displayed before acceptance. Carriers and Drivers pay no fees to use the Platform. The platform fee does not cover the cost of transport, insurance, fuel, or any aspect of the physical move — it covers access to the Platform's technology, matching infrastructure, messaging system, and tracking features.</p>

              <h3>5. Transport Transactions</h3>
              <p>All transport agreements are made directly between the Shipper and the Carrier. KarHaul does not process, hold, or guarantee any payments for transport services. Payment terms, methods, and schedules must be negotiated and agreed upon by the transacting parties using the Platform's messaging system or in the Bill of Lading. KarHaul has no obligation to resolve payment disputes between users.</p>

              <h3>6. Carrier Obligations</h3>
              <p>Carriers represent and warrant at all times that they:</p>
              <ul>
                <li>Hold valid USDOT and MC authority as required by federal law (49 U.S.C. § 13902)</li>
                <li>Maintain cargo insurance sufficient to cover the full replacement value of transported vehicles (minimum $100,000 per occurrence)</li>
                <li>Maintain public liability insurance at or above federal minimums (49 CFR § 387.9)</li>
                <li>Comply with all applicable federal, state, and local transportation laws and regulations, including FMCSA Hours of Service rules</li>
                <li>Execute a Bill of Lading (BOL) with the Shipper at both pickup and delivery</li>
                <li>Notify Shippers of any material changes to their operating authority or insurance status</li>
              </ul>
              <p>Providing false credentials, operating without valid authority, or misrepresenting insurance coverage is grounds for immediate account termination and may be reported to the FMCSA.</p>

              <h3>7. Shipper Obligations</h3>
              <p>Shippers represent and warrant that they:</p>
              <ul>
                <li>Have lawful authority to arrange transport of the listed vehicle</li>
                <li>Will accurately describe the vehicle's make, model, year, and condition, including whether the vehicle is inoperable (INOP), non-running, or oversized</li>
                <li>Will independently verify the Carrier's current insurance and operating authority via FMCSA records before releasing their vehicle</li>
                <li>Will not use the Platform to post fraudulent shipments or to contact carriers for purposes unrelated to vehicle transport</li>
              </ul>

              <h3>8. Communication Rules</h3>
              <p>To protect the marketplace integrity, users agree not to share personal phone numbers, email addresses, social media handles, or any off-platform contact information through the Platform's messaging system before a bid is formally accepted. Our content moderation system automatically filters policy-violating content. After bid acceptance, in-app calling is available. Repeated attempts to circumvent Platform communication may result in account suspension.</p>

              <h3>9. Reviews and Ratings</h3>
              <p>Upon completion of a booking, both parties may leave a review. Reviews must be truthful, based on personal experience, and not contain defamatory content, profanity, or threats. Incentivized reviews (exchanging positive reviews for discounts or payments) are prohibited. We reserve the right to remove reviews that violate these guidelines.</p>

              <h3>10. Prohibited Conduct</h3>
              <p>You agree not to:</p>
              <ul>
                <li>Use the Platform for any unlawful purpose or in violation of any applicable regulation</li>
                <li>Impersonate another person or entity or misrepresent your credentials</li>
                <li>Attempt to gain unauthorized access to any account, system, or network connected to the Platform</li>
                <li>Scrape, crawl, or systematically extract data from the Platform without written permission</li>
                <li>Post false or misleading shipment listings</li>
                <li>Harass, threaten, or discriminate against any user</li>
                <li>Use the Platform to arrange transport of prohibited goods (stolen vehicles, vehicles with tampered VINs, contraband)</li>
                <li>Manipulate ratings or reviews</li>
              </ul>

              <h3>11. Intellectual Property</h3>
              <p>The KarHaul name, logo, platform design, software, and all related content are the intellectual property of KarHaul and are protected by applicable copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works from Platform content without express written permission.</p>

              <h3>12. Disclaimers</h3>
              <p>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES. WE DO NOT WARRANT THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY CARRIER CREDENTIALS, REVIEWS, OR USER-SUBMITTED INFORMATION.</p>

              <h3>13. Limitation of Liability</h3>
              <p>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, EVOHAUL AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AFFILIATES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF DATA, VEHICLE DAMAGE, PERSONAL INJURY, PROPERTY DAMAGE, OR BUSINESS INTERRUPTION, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE PLATFORM OR ANY TRANSPORT ARRANGED THROUGH IT, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE PLATFORM FEES PAID BY YOU IN THE SIX (6) MONTHS PRECEDING THE CLAIM.</p>

              <h3>14. Indemnification</h3>
              <p>You agree to indemnify, defend, and hold harmless KarHaul and its officers, directors, employees, and affiliates from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorney's fees) arising out of or in any way connected with: (a) your use of the Platform; (b) your violation of these Terms; (c) your violation of any third-party rights, including any carrier or shipper; or (d) any transport arranged through the Platform.</p>

              <h3>15. Dispute Resolution and Governing Law</h3>
              <p>These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. Any dispute arising from these Terms or your use of the Platform shall first be subject to good-faith informal resolution. If not resolved within 30 days, disputes shall be resolved by binding arbitration under the rules of the American Arbitration Association (AAA), conducted in English, with proceedings held in New Castle County, Delaware. Class action arbitrations are expressly waived — each party must bring claims in their individual capacity only.</p>

              <h3>16. Modifications</h3>
              <p>We reserve the right to modify these Terms at any time. When we make material changes, we will notify registered users by email and/or prominent Platform notice at least 14 days before the changes take effect. Your continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.</p>

              <h3>17. Termination</h3>
              <p>We may suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or conduct we deem harmful to the Platform or its users. You may close your account at any time by contacting support@karhaul.com. Termination does not relieve you of any obligations incurred before the termination date.</p>

              <h3>18. Contact</h3>
              <p>Questions about these Terms should be directed to legal@karhaul.com.</p>
            </>
          )}

          {/* ── Liability Waiver ── */}
          {active === "Liability Waiver" && (
            <>
              <h2>Liability Waiver & Disclaimer</h2>
              <p className="lead">Last Updated: {EFFECTIVE_DATE}</p>

              <div className="not-prose bg-red-50 dark:bg-red-950/30 p-5 rounded-lg border border-red-200 dark:border-red-900 mb-6">
                <p className="text-sm font-bold text-red-900 dark:text-red-400 uppercase tracking-wide mb-2">CRITICAL NOTICE — PLATFORM LIABILITY DISCLAIMER</p>
                <p className="text-sm text-red-800 dark:text-red-300">
                  BY USING EVOHAUL, YOU EXPLICITLY ACKNOWLEDGE AND AGREE THAT EVOHAUL HOLDS ZERO LIABILITY FOR ANY ASPECT OF THE PHYSICAL TRANSPORTATION OF VEHICLES ARRANGED THROUGH THE PLATFORM. ALL TRANSPORT LIABILITY EXISTS STRICTLY BETWEEN THE SHIPPER AND THE CARRIER.
                </p>
              </div>

              <h3>1. Nature of the Platform</h3>
              <p>KarHaul is a neutral technology marketplace. We provide software tools to connect shippers with carriers. We are not a party to any transport transaction. We do not:</p>
              <ul>
                <li>Own, operate, lease, or control any transport vehicle</li>
                <li>Employ or supervise any driver or carrier</li>
                <li>Dispatch any vehicle for transport</li>
                <li>Inspect, receive, hold, or deliver any vehicle</li>
                <li>Guarantee the performance of any carrier or the safety of any transport</li>
                <li>Guarantee delivery timelines, vehicle condition on arrival, or carrier compliance</li>
              </ul>

              <h3>2. Vehicle Damage Disclaimer</h3>
              <p>
                KarHaul expressly disclaims all liability for damage to vehicles during loading, transport, unloading, or storage. This includes but is not limited to: scratches, dents, mechanical damage, theft, total loss, weather damage, or fire. All claims for vehicle damage must be filed directly with the Carrier's cargo insurance provider. A properly executed and notated Bill of Lading is required for any valid cargo insurance claim.
              </p>

              <h3>3. Carrier Performance Disclaimer</h3>
              <p>
                KarHaul does not guarantee that any Carrier will: perform the transport as agreed, arrive on time, maintain adequate insurance at the time of transport, or honor any verbal or written commitment. Users accept that carrier interactions carry inherent risk and that the Platform's Verified badge reflects a one-time credential check, not ongoing real-time compliance monitoring.
              </p>

              <h3>4. Payment Dispute Disclaimer</h3>
              <p>
                KarHaul does not hold, process, or escrow any transport payments. All payment disputes are strictly between Shippers and Carriers. KarHaul will not intervene in, mediate, or compensate for any financial dispute arising from a transport transaction.
              </p>

              <h3>5. Shipper Waiver of Claims Against Platform</h3>
              <p>
                By accepting a carrier's bid and proceeding with transport through the Platform, Shippers irrevocably waive any and all claims against KarHaul arising from: vehicle damage, late delivery, carrier failure, payment disputes, misrepresentation by carriers, or any other event related to the transport. This waiver is a condition of using the Platform.
              </p>

              <h3>6. Carrier Waiver of Claims Against Platform</h3>
              <p>
                By using the Platform to find and accept transport work, Carriers irrevocably waive any and all claims against KarHaul arising from: shipper payment disputes, shipper misrepresentation of vehicle condition, unreimbursed transport costs, or any loss incurred in the performance of transport services.
              </p>

              <h3>7. Force Majeure</h3>
              <p>
                Neither KarHaul nor Carriers shall be held liable for delays or failures caused by events outside their reasonable control, including but not limited to: natural disasters, severe weather, road closures, government actions, pandemics, labor disputes, or civil unrest. Shippers acknowledge that transport timelines are estimates subject to such events.
              </p>

              <h3>8. Indemnification Obligations</h3>
              <p>
                Both Shippers and Carriers agree to indemnify, defend, and hold KarHaul and its affiliates, officers, directors, and employees harmless from and against any claims, damages, liabilities, costs, and expenses (including attorney's fees) arising from their use of the Platform, their transport transactions, their breach of these Terms, or their violation of any applicable law or regulation.
              </p>

              <h3>9. Severability</h3>
              <p>
                If any provision of this Liability Waiver is found to be unenforceable under applicable law, the remaining provisions shall remain in full force and effect.
              </p>
            </>
          )}

          {/* ── Privacy Policy ── */}
          {active === "Privacy Policy" && (
            <>
              <h2>Privacy Policy</h2>
              <p className="lead">Effective Date: {EFFECTIVE_DATE} | Last Updated: {EFFECTIVE_DATE}</p>
              <p>
                See our full, standalone <a href="/privacy">Privacy Policy page</a> for complete details. The summary below covers the key points.
              </p>

              <h3>What We Collect</h3>
              <p>Account information (name, email, phone), carrier credentials (DOT/MC numbers, insurance details), shipment listings, in-app messages (filtered for policy compliance), reviews, security credentials (passkeys, TOTP secrets, phone for SMS 2FA), and usage/log data.</p>

              <h3>How We Use It</h3>
              <p>To operate the marketplace, verify carrier credentials, enable platform features (messaging, bidding, tracking), maintain account security, prevent fraud, and comply with legal obligations.</p>

              <h3>What We Don't Do</h3>
              <ul>
                <li>We <strong>do not</strong> sell your personal data to third parties</li>
                <li>We <strong>do not</strong> use cross-site advertising trackers</li>
                <li>We <strong>do not</strong> share your email or phone number with other users directly</li>
                <li>We <strong>do not</strong> store your biometric data (passkey private keys never leave your device)</li>
              </ul>

              <h3>Your Rights</h3>
              <p>You can access, update, export, or delete your data. California residents have CCPA rights; EEA residents have GDPR rights. Contact privacy@karhaul.com.</p>

              <p><a href="/privacy">View Full Privacy Policy →</a></p>
            </>
          )}

          {/* ── Carrier Requirements ── */}
          {active === "Carrier Requirements" && (
            <>
              <h2>Carrier Requirements & Compliance</h2>
              <p className="lead">Last Updated: {EFFECTIVE_DATE}</p>

              <p>
                To protect shippers and maintain platform integrity, all carriers must meet and maintain the following federal and platform-specific requirements. These requirements are in addition to all applicable state and local regulations.
              </p>

              <h3>1. Federal Operating Authority</h3>
              <ul>
                <li><strong>USDOT Number:</strong> Required for all for-hire motor carriers operating in interstate commerce (49 U.S.C. § 31101). Active status required; suspended or revoked authority disqualifies carriers from platform use.</li>
                <li><strong>MC Authority:</strong> Motor Carrier operating authority from FMCSA (49 U.S.C. § 13902) is required for all for-hire transport of vehicles across state lines.</li>
                <li><strong>Process Agent:</strong> Designation of a process agent in each state of operation (BOC-3 filing) is required as a condition of active MC authority.</li>
              </ul>

              <h3>2. Insurance Requirements</h3>
              <ul>
                <li><strong>Public Liability Insurance:</strong> Federal minimum of $750,000 for auto haulers under 49 CFR § 387.9. Carriers transporting high-value vehicles are encouraged to carry higher limits.</li>
                <li><strong>Cargo Insurance:</strong> Minimum $100,000 per occurrence for cargo (transported vehicles). Shippers are advised to request a Certificate of Insurance (COI) before releasing their vehicle.</li>
                <li><strong>Insurance on File with FMCSA:</strong> Carriers must maintain insurance filings with FMCSA (MCS-90 endorsement or BMC-34 for cargo). Active filing status is publicly verifiable at safer.fmcsa.dot.gov.</li>
              </ul>

              <h3>3. Driver Qualifications</h3>
              <ul>
                <li><strong>Commercial Driver's License (CDL):</strong> Appropriate class for the vehicle being operated (Class A for most multi-car haulers).</li>
                <li><strong>Medical Certificate:</strong> Valid DOT medical examiner's certificate (49 CFR § 391.45).</li>
                <li><strong>Hours of Service Compliance:</strong> Carriers must comply with FMCSA Hours of Service regulations (49 CFR Part 395).</li>
                <li><strong>Drug and Alcohol Testing:</strong> Compliance with FMCSA drug and alcohol testing program (49 CFR Part 382).</li>
              </ul>

              <h3>4. Vehicle Requirements</h3>
              <ul>
                <li>Transport vehicle must be registered, titled, and meet all applicable DOT equipment standards</li>
                <li>Regular vehicle inspections as required by 49 CFR Part 396</li>
                <li>Working tie-downs, chains, and safety equipment meeting FMCSA load securement standards (49 CFR Part 393)</li>
                <li>Required DOT markings on both sides of the power unit (USDOT number, company name)</li>
              </ul>

              <h3>5. Bill of Lading Requirements</h3>
              <p>Carriers are required to complete a written Bill of Lading for every vehicle transported, documenting:</p>
              <ul>
                <li>Vehicle year, make, model, color, and VIN</li>
                <li>Pre-existing damage notation (with photos encouraged)</li>
                <li>Odometer reading at pickup</li>
                <li>Fuel level at pickup</li>
                <li>Agreed transport price and payment terms</li>
                <li>Carrier's DOT/MC number and insurance information</li>
                <li>Signatures of both carrier and shipper at pickup and delivery</li>
              </ul>

              <h3>6. Platform-Specific Requirements</h3>
              <ul>
                <li>Carriers must enter accurate DOT and MC numbers during profile setup — falsified credentials result in permanent ban and FMCSA complaint</li>
                <li>Carriers must maintain updated profile information including current insurance expiration dates</li>
                <li>Carriers are responsible for updating their profile if operating authority or insurance lapses</li>
                <li>Carriers must respond to shipper messages within a reasonable time after bid acceptance</li>
                <li>Carriers must post milestone updates (Pickup Confirmed, In Transit, Delivered) for each active booking</li>
              </ul>

              <h3>7. FMCSA Safety Ratings</h3>
              <p>KarHaul recommends that shippers check carrier FMCSA Safety Ratings before contracting for transport. Ratings include:</p>
              <ul>
                <li><strong>Satisfactory</strong> — Carrier has met federal safety standards</li>
                <li><strong>Conditional</strong> — Carrier has identified safety deficiencies that must be corrected</li>
                <li><strong>Unsatisfactory</strong> — Carrier has serious safety deficiencies and is prohibited from operating</li>
                <li><strong>None/Unrated</strong> — No recent compliance review; does not indicate non-compliance</li>
              </ul>
              <p>Carriers with Unsatisfactory safety ratings are not permitted to use the KarHaul platform.</p>

              <h3>8. Violations and Enforcement</h3>
              <p>Carriers found to be operating without valid authority, with lapsed insurance, or in violation of these requirements will have their accounts suspended pending investigation. Serious violations (fraudulent credentials, vehicle theft, FMCSA violations) will result in permanent ban and, where appropriate, referral to law enforcement and FMCSA.</p>
            </>
          )}

          {/* ── Cookie Policy ── */}
          {active === "Cookie Policy" && (
            <>
              <h2>Cookie Policy</h2>
              <p className="lead">Last Updated: {EFFECTIVE_DATE}</p>

              <p>
                This Cookie Policy explains how KarHaul uses cookies and similar technologies when you visit karhaul.com. By using the Platform, you consent to our use of cookies as described in this policy.
              </p>

              <h3>1. What Are Cookies?</h3>
              <p>
                Cookies are small text files placed on your device by a website when you visit it. They are widely used to make websites work, to remember your preferences, and to provide anonymous usage statistics. We also use similar technologies such as local storage and session storage.
              </p>

              <h3>2. Cookies We Use</h3>

              <h4>Strictly Necessary Cookies</h4>
              <p>These cookies are essential for the Platform to function and cannot be disabled. They do not store any personally identifiable information.</p>
              <div className="not-prose overflow-x-auto">
                <table className="text-sm w-full border-collapse border rounded-lg overflow-hidden">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 border-b font-semibold">Cookie Name</th>
                      <th className="text-left p-3 border-b font-semibold">Purpose</th>
                      <th className="text-left p-3 border-b font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "sid", purpose: "Maintains your authenticated session after login", duration: "7 days" },
                      { name: "code_verifier", purpose: "PKCE OAuth security parameter used during login flow", duration: "10 minutes" },
                      { name: "state", purpose: "CSRF protection during OAuth login flow", duration: "10 minutes" },
                      { name: "nonce", purpose: "Replay attack prevention during OAuth login flow", duration: "10 minutes" },
                      { name: "return_to", purpose: "Stores the intended destination page after login redirect", duration: "10 minutes" },
                      { name: "pending_2fa", purpose: "Temporary token for two-factor authentication during login", duration: "5 minutes" },
                    ].map(row => (
                      <tr key={row.name} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{row.name}</td>
                        <td className="p-3 text-muted-foreground">{row.purpose}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{row.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4>Preference Cookies</h4>
              <p>These cookies remember your choices on the Platform to provide an enhanced experience.</p>
              <div className="not-prose overflow-x-auto">
                <table className="text-sm w-full border-collapse border rounded-lg overflow-hidden">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 border-b font-semibold">Cookie Name</th>
                      <th className="text-left p-3 border-b font-semibold">Purpose</th>
                      <th className="text-left p-3 border-b font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "theme", purpose: "Remembers your dark/light mode preference", duration: "1 year" },
                    ].map(row => (
                      <tr key={row.name} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{row.name}</td>
                        <td className="p-3 text-muted-foreground">{row.purpose}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{row.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>3. Cookies We Do Not Use</h3>
              <p>KarHaul does <strong>not</strong> use:</p>
              <ul>
                <li>Third-party advertising or tracking cookies</li>
                <li>Cross-site behavioral tracking technologies</li>
                <li>Social media tracking pixels (Meta Pixel, LinkedIn Insight Tag, etc.)</li>
                <li>Google Analytics, Hotjar, or similar analytics services that send data to third parties</li>
                <li>Fingerprinting or supercookies</li>
              </ul>

              <h3>4. Managing Cookies</h3>
              <p>
                You can control and delete cookies through your browser settings. Note that disabling strictly necessary cookies (particularly the <code>sid</code> session cookie) will prevent you from logging in to the Platform. The steps to manage cookies vary by browser:
              </p>
              <ul>
                <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
              </ul>

              <h3>5. Local Storage</h3>
              <p>
                In addition to cookies, we use browser local storage for client-side caching of UI state (such as your current tab selection within multi-step flows). This data does not contain personal information and is cleared when you clear your browser's site data.
              </p>

              <h3>6. Changes to This Policy</h3>
              <p>
                We may update this Cookie Policy as the Platform evolves. We will post any changes on this page with an updated "Last Updated" date. Your continued use of the Platform after changes constitutes acceptance.
              </p>

              <h3>7. Contact</h3>
              <p>
                Questions about this Cookie Policy: privacy@karhaul.com
              </p>
            </>
          )}
        </main>
      </div>
    </MainLayout>
  );
}
