import React, { useState, useEffect } from "react";
import { fbfs } from "../lib/firebase";
import { EmailTemplate, seedEmailTemplatesIfEmpty, replaceTokens } from "../utils/emailHelper";
import { Mail, Plus, Edit3, Trash2, Check, RefreshCw, Layout, Eye, HelpCircle, Sparkles, Smartphone, Monitor } from "lucide-react";

const CATEGORIES = [
  { id: "marketplace_lead", name: "Marketplace Leads", desc: "Sent when a user views a vendor profile" },
  { id: "event_registration", name: "Event Registrations", desc: "Sent upon successful event register RSVP" },
  { id: "event_reminder", name: "Event Reminders", desc: "Sent as reminders for upcoming events" }
];

const VARIABLE_GUIDES: Record<string, string[]> = {
  marketplace_lead: ["{vendorName}", "{businessName}"],
  event_registration: ["{applicantName}", "{applicantEmail}", "{eventTitle}", "{eventDate}", "{eventVenue}"],
  event_reminder: ["{applicantName}", "{applicantEmail}", "{eventTitle}", "{eventDate}", "{eventVenue}"]
};

const SAMPLE_VARIABLES: Record<string, string> = {
  vendorName: "Counsel Kamau",
  businessName: "Lexington Juris Publishers Ltd",
  applicantName: "Amina Gathoni",
  applicantEmail: "amina.gathoni@student.mku.ac.ke",
  eventTitle: "Constitutional Law Moot Championship 2026",
  eventDate: "Friday, July 10, 2026 @ 02:00 PM",
  eventVenue: "School of Law Courtroom A"
};

export function EmailStudio() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<"marketplace_lead" | "event_registration" | "event_reminder">("marketplace_lead");
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"pc" | "mobile">("pc");

  useEffect(() => {
    // Seed defaults first if none exist
    const initAndLoad = async () => {
      setLoading(true);
      await seedEmailTemplatesIfEmpty();
      await loadTemplates();
    };
    initAndLoad();
  }, []);

  const loadTemplates = async () => {
    try {
      const coll = await fbfs.getCollection<EmailTemplate>("emailTemplates");
      // Sort so they appear in a predictable order
      coll.sort((a, b) => b.createdAt - a.createdAt);
      setTemplates(coll);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load templates", err);
      setLoading(false);
    }
  };

  const activeTemplatesOfCategory = templates.filter(t => t.category === selectedCategory);

  const startCreateNew = () => {
    setEditingTemplate({
      category: selectedCategory,
      label: "New Custom Template",
      subject: "Sample Subject Line",
      body: "Hello,\n\nWrite your email body copy here and insert placeholders to customize details automatically.",
      isActive: true,
      createdAt: Date.now()
    });
  };

  const handleSelectTemplate = (t: EmailTemplate) => {
    setEditingTemplate({ ...t });
  };

  const handleSave = async () => {
    if (!editingTemplate || !editingTemplate.label || !editingTemplate.subject || !editingTemplate.body) {
      alert("Please check that all fields (Label, Subject, and Body) are filled!");
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate.id) {
        // Update
        await fbfs.updateDocById("emailTemplates", editingTemplate.id, editingTemplate);
      } else {
        // Insert
        await fbfs.addDocInCollection("emailTemplates", {
          ...editingTemplate,
          createdAt: Date.now()
        } as EmailTemplate);
      }
      setEditingTemplate(null);
      await loadTemplates();
    } catch (err) {
      console.error("Failed to save template", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this template? Any event registrations or marketplace views will fallback to standard built-in templates if no other active templates exist.")) {
      return;
    }
    try {
      await fbfs.deleteDocById("emailTemplates", id);
      setEditingTemplate(null);
      await loadTemplates();
    } catch (err) {
      console.error("Failed to delete template", err);
    }
  };

  // Convert raw body lines to paragraphs for previewing in real-time
  const getPreviewBodyReplacement = () => {
    const rawBody = editingTemplate?.body || "";
    // Translate template tags to human-friendly sample variables
    const filledBodyText = replaceTokens(rawBody, SAMPLE_VARIABLES);
    
    return filledBodyText
      .split("\n\n")
      .map(p => {
        const lines = p.split("\n").join("<br/>");
        return `<p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 15px 0;">${lines}</p>`;
      })
      .join("");
  };

  const previewSubjectResolved = replaceTokens(editingTemplate?.subject || "", SAMPLE_VARIABLES);

  const mockEmailFullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${previewSubjectResolved}</title>
    </head>
    <body style="background-color: #f8fafc; margin: 0; padding: 20px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <tr>
          <td style="padding: 25px 30px; border-bottom: 1px solid #e2e8f0; background-color: #ffffff; text-align: left;">
            <p style="margin: 0; color: #b45309; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
              MKU School of Law
            </p>
            <p style="margin: 4px 0 0 0; font-size: 18px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px;">
              Student Hub Communications
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 35px 30px;">
            ${getPreviewBodyReplacement() || "<p style='color: #94a3b8; font-style: italic;'>Write your message block...</p>"}
          </td>
        </tr>
        <tr>
          <td style="padding: 25px 30px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: left;">
            <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
              Regards,<br/>
              <strong>MKU Law Student Hub Team</strong>
            </p>
            <p style="margin: 12px 0 0 0; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              This system notification matches the official parameters defined inside the secure MKU Law communication framework.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return (
    <div className="w-full min-h-screen bg-neutral-900 border border-white/5 rounded-2xl p-6" id="email-studio-view">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[#FFDE00] font-mono text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
            <span>Communications Engine</span>
          </div>
          <h2 className="text-2xl font-bold font-sans text-white tracking-tight">MKU Law Email Studio</h2>
          <p className="text-gray-400 text-sm mt-1">
            Design multiple email variations per category. The system automatically alternates templates to keep administrative emails dynamic, professional, and engaging!
          </p>
        </div>
        <button
          onClick={startCreateNew}
          className="flex items-center gap-2 bg-[#FFDE00] hover:bg-[#ffe330] text-black font-extrabold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Custom Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar categories & items */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-black/40 border border-white/5 rounded-xl p-4">
            <h3 className="text-white text-xs font-bold uppercase tracking-wider text-gray-300 mb-3">Categories</h3>
            <div className="space-y-1">
              {CATEGORIES.map(cat => {
                const count = templates.filter(t => t.category === cat.id).length;
                const activeCount = templates.filter(t => t.category === cat.id && t.isActive).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id as any);
                      setEditingTemplate(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all text-xs font-medium flex items-center justify-between ${
                      selectedCategory === cat.id
                        ? "bg-white/10 text-white border-l-2 border-[#FFDE00]"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold">{cat.name}</div>
                      <div className="text-[10px] text-gray-500 line-clamp-1">{cat.desc}</div>
                    </div>
                    <span className="bg-neutral-800 text-gray-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {activeCount}/{count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-xs font-bold uppercase tracking-wider text-gray-300">Templates List</h3>
              <span className="text-[10px] text-gray-500 font-mono">
                {activeTemplatesOfCategory.length} Active / {templates.filter(t => t.category === selectedCategory).length} Total
              </span>
            </div>
            {templates.filter(t => t.category === selectedCategory).length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs text-center border border-dashed border-white/5 rounded-lg space-y-2">
                <p>No template exists yet</p>
                <button
                  onClick={startCreateNew}
                  className="text-[#FFDE00] font-bold text-[10px] uppercase hover:underline"
                >
                  Create initial preset
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {templates
                  .filter(t => t.category === selectedCategory)
                  .map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTemplate(t)}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex flex-col justify-between gap-1.5 ${
                        editingTemplate?.id === t.id
                          ? "bg-neutral-800 border-[#FFDE00]/40 text-white"
                          : "bg-neutral-900/60 border-white/5 text-gray-300 hover:bg-neutral-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold truncate max-w-[130px]">{t.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          t.isActive 
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                            : "bg-red-500/15 text-red-400 border border-red-500/20"
                        }`}>
                          {t.isActive ? "ACTIVE" : "DISABLED"}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-1 italic">{t.subject}</p>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Editing Workspace & Preview */}
        <div className="lg:col-span-3">
          {!editingTemplate ? (
            <div className="bg-black/20 border border-white/5 rounded-xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[450px]">
              <div className="p-4 bg-white/5 rounded-full mb-4">
                <Mail className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-white text-lg font-bold">Select or Create a Template</h3>
              <p className="text-gray-400 text-sm max-w-sm mt-1 mb-6">
                Please pick from the sidebar list or click "New Custom Template" to calibrate custom subject headers and tailored communication copy for the law portal.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const first = templates.find(t => t.category === selectedCategory);
                    if (first) {
                      handleSelectTemplate(first);
                    } else {
                      startCreateNew();
                    }
                  }}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs uppercase font-extrabold px-4 py-2.5 rounded-lg transition-all"
                >
                  Edit Category Defaults
                </button>
                <button
                  onClick={startCreateNew}
                  className="bg-[#FFDE00] text-black text-xs uppercase font-extrabold px-4 py-2.5 rounded-lg hover:bg-[#ffe330] transition-all"
                >
                  Create Custom Template
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Form panel */}
              <div className="bg-neutral-950 border border-white/5 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#FFDE00]" />
                    <span>Configuration Workspace</span>
                  </h3>
                  {editingTemplate.id && (
                    <button
                      onClick={() => handleDelete(editingTemplate.id!)}
                      className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete template</span>
                    </button>
                  )}
                </div>

                {/* Template metadata name label */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">Template Label</label>
                  <input
                    type="text"
                    value={editingTemplate.label || ""}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-xs text-white uppercase tracking-wider font-semibold focus:outline-none focus:border-[#FFDE00]/50"
                    placeholder="e.g. Friendly Warning Notice"
                  />
                  <p className="text-[10px] text-gray-500">A system label to distinguish this template internally in dashboard listings.</p>
                </div>

                {/* Subject field with dynamic tag helpers below */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">Email Subject Line</label>
                  <input
                    type="text"
                    value={editingTemplate.subject || ""}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#FFDE00]/50 font-bold"
                    placeholder="Subject line for email recipients"
                  />
                </div>

                {/* Message Body Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">Email Body Content</label>
                    <span className="text-[9px] text-gray-500 font-mono">Plaintext \n for clean paragraphs</span>
                  </div>
                  <textarea
                    rows={10}
                    value={editingTemplate.body || ""}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg p-3 text-xs text-gray-200 focus:outline-none focus:border-[#FFDE00]/50 font-sans leading-relaxed"
                    placeholder="Write your email body block..."
                  />
                </div>

                {/* Placeholder variable guides */}
                <div className="bg-neutral-900/60 border border-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#FFDE00] font-bold uppercase tracking-wider">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Dynamic Placeholders Guide</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Click any helper tag below to copy, then paste it in your Subject or Body block. It replaces dynamically during actual mailshot:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {VARIABLE_GUIDES[selectedCategory]?.map(v => (
                      <button
                        key={v}
                        onClick={() => {
                          navigator.clipboard.writeText(v);
                          alert(`Copied "${v}" to clipboard!`);
                        }}
                        className="bg-neutral-800 text-[10px] text-gray-300 font-mono px-2 py-0.5 rounded hover:text-white border border-white/5 active:scale-95 transition-all text-left"
                        title="Click to copy tag"
                      >
                        {v} &rarr; <span className="text-gray-500 font-sans">{SAMPLE_VARIABLES[v.replace(/{|}/g, "")]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active slider configuration and Submit Actions */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingTemplate.isActive ?? true}
                      onChange={e => setEditingTemplate(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white relative"></div>
                    <span className="text-xs font-bold text-gray-200">Enable Template</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTemplate(null)}
                      className="text-xs font-bold px-4 py-2 border border-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-[#FFDE00] text-black text-xs font-bold uppercase tracking-wider px-5 py-2 rounded-lg hover:bg-[#ffe330] transition-all flex items-center gap-1.5"
                    >
                      {saving ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Save Config</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Rendering preview frame */}
              <div className="bg-neutral-950 border border-white/5 rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span>Real-Time Visualizer</span>
                  </h3>
                  
                  {/* Preset device toggle handles */}
                  <div className="flex items-center gap-1 bg-neutral-900 border border-white/5 p-0.5 rounded-lg">
                    <button
                      onClick={() => setPreviewDevice("pc")}
                      className={`p-1.5 rounded transition-all ${
                        previewDevice === "pc" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                      }`}
                      title="Desktop Render"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice("mobile")}
                      className={`p-1.5 rounded transition-all ${
                        previewDevice === "mobile" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                      }`}
                      title="Mobile Screen Render"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Email Subject block preview */}
                <div className="bg-neutral-900 border border-white/5 p-3 rounded-lg space-y-1">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Mailed Subject Preview</div>
                  <div className="text-xs text-white font-bold truncate">
                    {previewSubjectResolved || <span className="text-gray-600 font-normal italic">Empty Subject Line</span>}
                  </div>
                </div>

                {/* Iframe dynamic target */}
                <div className="flex-1 min-h-[360px] max-h-[500px] overflow-hidden border border-white/10 rounded-lg shadow-inner bg-neutral-900/40 relative flex justify-center items-center">
                  <div
                    className="w-full h-full bg-white transition-all overflow-auto"
                    style={{
                      maxWidth: previewDevice === "mobile" ? "375px" : "100%",
                      borderRadius: previewDevice === "mobile" ? "8px" : "0"
                    }}
                  >
                    <iframe
                      srcDoc={mockEmailFullHtml}
                      title="Email Render Frame"
                      sandbox="allow-same-origin"
                      className="w-full h-full border-none pointer-events-auto"
                    />
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-500/10 p-3 rounded-lg text-[10px] text-slate-400 leading-normal flex items-start gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#FFDE00] shrink-0 mt-0.5" />
                  <p>
                    <strong>Visualizer Sandbox Note:</strong> Display variables like <span className="font-semibold text-slate-300">Amina Gathoni</span> or <span className="font-semibold text-slate-300">Courtroom A</span> are matched from high-integrity preconfigured mocks representing typical law campus records for quick reviewing.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
