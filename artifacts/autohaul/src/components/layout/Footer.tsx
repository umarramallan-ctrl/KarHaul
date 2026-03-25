import { Link } from "wouter";
import { CarCarrierIcon } from "@/components/icons/CarCarrierIcon";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 text-white hover:text-primary transition-colors">
              <CarCarrierIcon className="h-6 w-7" />
              <span className="font-display font-bold text-xl tracking-tight">
                AutoHaul
              </span>
            </Link>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">
              The direct auto transport marketplace connecting shippers and licensed carriers with zero broker fees.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4">Platform</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/shipments" className="hover:text-white transition-colors">Browse Loads</Link></li>
              <li><Link href="/post-load" className="hover:text-white transition-colors">Post a Vehicle</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">For Drivers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">For Dealerships</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Safety & Insurance</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Liability Waiver</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} AutoHaul Connect. All rights reserved.</p>
          <p className="text-xs max-w-xl text-center md:text-right">
            AutoHaul Connect is a technology platform, not a motor carrier or freight broker. 
            All transport liability remains strictly between the shipper and the contracted carrier.
          </p>
        </div>
      </div>
    </footer>
  );
}
