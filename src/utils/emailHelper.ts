import { fbfs } from "../lib/firebase";

export interface EmailTemplate {
  id?: string;
  category: "marketplace_lead" | "event_registration" | "event_reminder" | "newsletter";
  label: string;
  subject: string;
  body: string;
  isActive: boolean;
  createdAt: number;
}

// Default system templates to seed when the app loads or if no active templates exist
export const DEFAULT_TEMPLATES_SEED: EmailTemplate[] = [
  {
    category: "marketplace_lead",
    label: "Friendly Hub Reminder",
    subject: "A student viewed your listing: {businessName}",
    body: "Hello {vendorName},\n\nSomeone recently viewed your business profile, \"{businessName}\", on the MKU Law Student Hub Marketplace!\n\nCheck out the marketplace portal to verify your contact info, update listings, and add student-only discounts.",
    isActive: true,
    createdAt: Date.now()
  },
  {
    category: "marketplace_lead",
    label: "Professional Notification",
    subject: "Listing view alert - {businessName}",
    body: "Dear {vendorName},\n\nWe would like to share that a student viewed your marketplace profile, \"{businessName}\", today on the MKU School of Law Student Hub.\n\nProviding up-to-date pricing list and contacts is a great way to earn trusted client referrals.",
    isActive: true,
    createdAt: Date.now()
  },
  {
    category: "event_registration",
    label: "Warm Confirmation",
    subject: "You're registered! {eventTitle}",
    body: "Dear {applicantName},\n\nWe have successfully received your registration for \"{eventTitle}\". Your place is fully reserved!\n\nEvent details:\n• Venue: {eventVenue}\n• Date & Time: {eventDate}\n\nWe are looking forward to having you with us. Enjoy the sessions!",
    isActive: true,
    createdAt: Date.now()
  },
  {
    category: "event_registration",
    label: "Official Welcome",
    subject: "Registration Success – {eventTitle}",
    body: "Dear {applicantName},\n\nThis email confirms that you are registered to attend the \"{eventTitle}\" event organized on the MKU Law Student Hub.\n\n• Organized Venue: {eventVenue}\n• Coordinated Date: {eventDate}\n\nThank you for participating in school of law student networking and learning events.",
    isActive: true,
    createdAt: Date.now()
  },
  {
    category: "event_reminder",
    label: "Interactive Event Reminder",
    subject: "See you soon at {eventTitle}!",
    body: "Hello {applicantName},\n\nThis is a friendly reminder that the event you registered for, \"{eventTitle}\", is coming up soon!\n\nQuick facts:\n• Organized Venue: {eventVenue}\n• Prescheduled Session: {eventDate}\n\nPlease arrive a few minutes early for a smooth check-in.",
    isActive: true,
    createdAt: Date.now()
  },
  {
    category: "event_reminder",
    label: "Standard Notice Reminder",
    subject: "Reminder: {eventTitle} is scheduled shortly",
    body: "Dear {applicantName},\n\nThis is a courtesy reminder regarding \"{eventTitle}\", taking place shortly at \"{eventVenue}\" on \"{eventDate}\".\n\nIf your schedule holds conflicts, kindly cancel your reservation on the student portal so another peer can attend.",
    isActive: true,
    createdAt: Date.now()
  }
];

export async function seedEmailTemplatesIfEmpty() {
  try {
    const existing = await fbfs.getCollection<EmailTemplate>("emailTemplates");
    if (existing && existing.length > 0) {
      return;
    }
    // Seed them
    for (const t of DEFAULT_TEMPLATES_SEED) {
      await fbfs.addDocInCollection("emailTemplates", t);
    }
    console.log("[Email Templates] Defaults successfully seeded in Firestore!");
  } catch (err) {
    console.warn("Failed to seed default email templates", err);
  }
}

export function replaceTokens(text: string, variables: Record<string, string>): string {
  if (!text) return "";
  let result = text;
  for (const [key, val] of Object.entries(variables)) {
    // replace standard bracket placeholder {variable}
    const regex = new RegExp(`{${key}}`, "g");
    result = result.replace(regex, val || "");
  }
  return result;
}

export async function fetchAndRenderEmailTemplate(
  category: "marketplace_lead" | "event_registration" | "event_reminder" | "newsletter",
  variables: Record<string, string>
): Promise<{ customSubject: string; customHtml: string } | null> {
  try {
    const allTemplates = await fbfs.getCollection<EmailTemplate>("emailTemplates");
    const active = allTemplates.filter(t => t.category === category && t.isActive === true);

    if (active.length === 0) {
      return null;
    }

    // Pick a random active template to avoid boringness and repetition!
    const randomIndex = Math.floor(Math.random() * active.length);
    const selectedTemplate = active[randomIndex];

    const subjectText = replaceTokens(selectedTemplate.subject, variables);
    const rawBodyText = replaceTokens(selectedTemplate.body, variables);

    // Convert raw body lines to paragraphs
    const paragraphHtml = rawBodyText
      .split("\n\n")
      .map(p => {
        const lines = p.split("\n").join("<br/>");
        return `<p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 15px 0;">${lines}</p>`;
      })
      .join("");

    // Build the clean framing layout
    const customHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subjectText}</title>
      </head>
      <body style="background-color: #f8fafc; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <!-- Header -->
                <tr>
                  <td style="padding: 30px 40px; border-bottom: 1px solid #e2e8f0; background-color: #ffffff; text-align: left;">
                    <p style="margin: 0; color: #b45309; font-size: 14px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                      MKU School of Law
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 20px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px;">
                      Student Hub Communication
                    </p>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 45px 40px;">
                    ${paragraphHtml}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: left;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                      Regards,<br/>
                      <strong>MKU Law Student Hub Team</strong>
                    </p>
                    <p style="margin: 15px 0 0 0; font-size: 11px; color: #94a3b8; line-height: 1.4; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                      Sent by the MKU Law Student Hub. If you do not wish to receive these service communications, you can modify your profile notification settings.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return {
      customSubject: subjectText,
      customHtml
    };
  } catch (err) {
    console.error("fetchAndRenderEmailTemplate error", err);
    return null;
  }
}
