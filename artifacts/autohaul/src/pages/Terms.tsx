import { MainLayout } from "@/components/layout/MainLayout";

export default function Terms() {
  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto px-4 py-12 prose dark:prose-invert">
        <h1>Terms of Service & Liability Waiver</h1>
        <p className="text-lg text-muted-foreground lead">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <div className="bg-red-50 dark:bg-red-950/30 p-6 rounded-lg border border-red-200 dark:border-red-900 not-prose mb-8">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-400 mb-2">CRITICAL NOTICE: PLATFORM LIABILITY DISCLAIMER</h2>
          <p className="text-red-800 dark:text-red-300">
            AutoHaul Connect is a neutral technology platform designed solely to connect independent vehicle shippers with independent motor carriers. <strong>AutoHaul Connect is NOT a freight broker, freight forwarder, or motor carrier.</strong>
            <br/><br/>
            By using this platform, you explicitly agree that AutoHaul Connect holds <strong>ZERO LIABILITY</strong> for any aspect of the transportation process, including but not limited to: vehicle damage, delivery delays, carrier no-shows, payment disputes, or fraudulent activity by either party. All transactions, contracts, and liabilities exist strictly between the shipper and the carrier.
          </p>
        </div>

        <h2>1. Role of the Platform</h2>
        <p>
          AutoHaul Connect provides a digital marketplace for individuals and businesses ("Shippers") to post vehicle transport requests, and for independent, licensed transportation providers ("Carriers" or "Drivers") to bid on those requests. We do not dispatch, manage, or employ any drivers. We do not inspect vehicles or guarantee the condition of vehicles upon delivery.
        </p>

        <h2>2. Payments and Transactions</h2>
        <p>
          AutoHaul Connect does not process payments for transportation services. The Platform operates with zero broker fees. All payment terms, methods, and schedules must be agreed upon directly between the Shipper and the Carrier. Any financial disputes must be resolved between the transacting parties.
        </p>

        <h2>3. Carrier Responsibilities</h2>
        <p>
          Carriers utilizing the platform represent and warrant that they:
        </p>
        <ul>
          <li>Possess valid and current operating authority (DOT/MC numbers) as required by federal and state law.</li>
          <li>Maintain adequate cargo and liability insurance to cover the full value of the vehicles transported.</li>
          <li>Will execute a direct Bill of Lading (BOL) with the Shipper at pickup and delivery.</li>
        </ul>

        <h2>4. Shipper Responsibilities</h2>
        <p>
          Shippers utilizing the platform represent and warrant that they:
        </p>
        <ul>
          <li>Have the legal right to authorize the transport of the listed vehicle.</li>
          <li>Will accurately describe the vehicle's condition (e.g., if it is inoperable/INOP).</li>
          <li>Will verify the Carrier's insurance and operating authority prior to handing over the keys. AutoHaul Connect's "Verified" badge indicates a check was performed at account creation, but does not guarantee current real-time compliance.</li>
        </ul>

        <h2>5. Dispute Resolution</h2>
        <p>
          In the event of damage to a vehicle during transit, the Shipper must note the damage on the Carrier's Bill of Lading (BOL) at the time of delivery and file a claim directly with the Carrier's insurance provider. AutoHaul Connect will not mediate, participate in, or compensate for any claims.
        </p>
      </div>
    </MainLayout>
  );
}
