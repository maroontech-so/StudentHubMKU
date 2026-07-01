import React from "react";
import { Link } from "wouter";
import { ShieldCheck, ArrowLeft, BookOpen, FileText } from "lucide-react";

export function PrivacyView() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white py-12 px-4 sm:px-12 select-none animate-fade-in text-left">
      <div className="w-full max-w-5xl mx-auto space-y-12 pb-24">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <Link href="/auth">
            <span className="flex items-center gap-2 text-xs font-mono text-[#FFDE00] hover:underline cursor-pointer uppercase tracking-widest font-extrabold">
              <ArrowLeft size={14} /> Return to Registration
            </span>
          </Link>
          <div className="text-right">
            <span className="text-[9px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded font-bold">
              Privacy Policy
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="text-[#FFDE00]" size={36} />
            MKU Gavel Privacy Policy
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed font-sans font-medium max-w-3xl">
            Your privacy matters. We collect minimal personal information required for authentication, marketplace participation, and newsletter delivery. All data is handled under the Mount Kenya University School of Law privacy guidelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8 bg-zinc-900/30 p-8 sm:p-10 rounded-3xl border border-white/5">
            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <FileText size={16} className="text-[#FFDE00]" />
                1. Information Collected
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed font-sans font-medium">
                We collect names, email addresses, profile metadata, and optional newsletter preferences. Payment or event registration information is stored only when required for a selected service and never shared without consent.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#FFDE00]" />
                2. Use of Data
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed font-sans font-medium">
                Your data is used to authenticate your account, personalize your marketplace presence, manage event registrations, and deliver authorized newsletters. We do not sell personal data to third parties.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <BookOpen size={16} className="text-[#FFDE00]" />
                3. Consent & Retention
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed font-sans font-medium">
                Acceptance is recorded with timestamps for both Terms and Privacy consent. You may withdraw newsletter subscription at any time, but account consent remains part of the governance record.
              </p>
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 text-left space-y-4">
              <h4 className="text-xs font-mono font-black uppercase text-[#FFDE00] tracking-widest">At a Glance</h4>
              <ul className="text-xs text-gray-400 space-y-3 font-sans font-medium list-disc list-inside">
                <li>Minimal personal data collection for authentication only.</li>
                <li>Newsletter preference stored separately.</li>
                <li>Consent timestamps stored during sign-up.</li>
                <li>Privacy updates published transparently to portal members.</li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 space-y-3">
              <h4 className="text-xs font-mono font-black uppercase text-white tracking-wider">Need Assistance?</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans font-medium">
                Contact the MKU Law administration if you have questions about how your profile data is used or how to manage your subscriptions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
