import React from "react";
import { Link } from "wouter";
import { ShieldCheck, ArrowLeft, BookOpen, Scale, FileText } from "lucide-react";

export function TermsView() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white py-12 px-4 sm:px-12 select-none animate-fade-in text-left">
      <div className="w-full max-w-5xl mx-auto space-y-12 pb-24">
        
        {/* Top bar back navigations */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <Link href="/auth">
            <span className="flex items-center gap-2 text-xs font-mono text-[#FFDE00] hover:underline cursor-pointer uppercase tracking-widest font-extrabold">
              <ArrowLeft size={14} /> Return to Registration
            </span>
          </Link>
          <div className="text-right">
            <span className="text-[9px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded font-bold">
              Active Official Document
            </span>
          </div>
        </div>

        {/* Hero title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Scale className="text-[#FFDE00]" size={36} />
            MKU Gavel Terms of Agreement
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed font-sans font-medium max-w-3xl">
            Please read these official platform guidelines, merchant conduct standards, and student data protection statements carefully. By creating an authorized profile, you agree to comply with our academic parliament bylaws.
          </p>
        </div>

        {/* Guidelines section details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 space-y-8 bg-zinc-900/30 p-8 sm:p-10 rounded-3xl border border-white/5">
            
            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <FileText size={16} className="text-[#FFDE00]" />
                1. Merchant & Vendor Responsibilities
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed font-sans font-medium">
                Authorized campus merchant partners agree to only list products, law textbooks, robes, stationery, and legal clinic services that directly support the academic interest of Mt. Kenya University students. Mock moot trials equipment or accessory items are strictly audited.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <BookOpen size={16} className="text-[#FFDE00]" />
                2. Student Representative Conduct Code
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed font-sans font-medium">
                Any communication, suggestions dispatch submissions, and forum logs posted on this platform must reflect professional legal decorum. Harassment, counterfeit claims, or academic dishonesty will lead to instant account suspension by the sovereign parliament executive panel.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#FFDE00]" />
                3. Newsletter and Information Sharing
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed font-sans font-medium">
                Sellers are auto-enrolled into our official merchant letter stream designed to broadcast legal workshops, campus events, and shopper interaction statistics. Standard email views alerts may be configured within individual merchant profiles.
              </p>
            </section>

          </div>

          {/* Right quick list */}
          <div className="space-y-6">
            <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 text-left space-y-4">
              <h4 className="text-xs font-mono font-black uppercase text-[#FFDE00] tracking-widest">At a Glance Summary</h4>
              <ul className="text-xs text-gray-400 space-y-3 font-sans font-medium list-disc list-inside">
                <li>Immediate 0-tolerance policy on counterfeit course literature.</li>
                <li>Real-time customer views are logged to protect vendor interest.</li>
                <li>Newsletter lists keep merchants coordinated on upcoming court sessions.</li>
                <li>Parliament reserves final authority to tune and override settings.</li>
              </ul>
            </div>
            
            <div className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 space-y-3">
              <h4 className="text-xs font-mono font-black uppercase text-white tracking-wider">Need Legal Clarification?</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans font-medium">
                Contact our Gavel Executive branch through the Complaints Vault or visit the Mt. Kenya University School of Law chambers.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
