import { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

function getResendConfig() {
  const apiKey = (process.env.RESEND_API_KEY || "").trim() || "re_dH4sb2mM_8qFhcnntLemF4XFZf9YwXutC";
  const verifiedDomain = (process.env.RESEND_DOMAIN_VERIFIED || "").trim() || "studenthubmku.xyz";
  
  // If we have a verified domain (either from env or fallback), we are in production sending mode.
  const isSandbox = !verifiedDomain || verifiedDomain.includes("resend.dev");
  
  const fromEmail = isSandbox
    ? "MKU Law Student Hub <onboarding@resend.dev>"
    : `MKU Law Student Hub <info@${verifiedDomain}>`;
    
  const isSendingToTestOnly = isSandbox;
  const testEmail = "micahprince60@gmail.com";
  
  return { apiKey, fromEmail, isSendingToTestOnly, testEmail, verifiedDomain };
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { applicantEmail, applicantName, eventTitle, eventDate, eventVenue, customSubject, customHtml } = req.body;
    const { apiKey, fromEmail, isSendingToTestOnly, testEmail, verifiedDomain } = getResendConfig();

    const defaultHtmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Reminder</title>
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
                      Student Hub Events
                    </p>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 45px 40px;">
                    <span style="display: inline-block; background-color: #fef3c7; border: 1px solid #fde68a; color: #b45309; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 6px; margin-bottom: 20px;">
                      ⏳ Coming Up Soon
                    </span>

                    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                      Reminder: Upcoming Event
                    </h2>

                    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 15px 0;">
                      Hello <strong>${applicantName}</strong>,
                    </p>
                    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 15px 0;">
                      This is a friendly reminder that the event you registered for on the MKU Law Student Hub will take place soon. Please arrive a few minutes early to allow time for check-in.
                    </p>

                    <!-- Card Layout -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 30px 0; text-align: left;">
                      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 755; color: #0f172a; text-transform: uppercase;">
                        ${eventTitle}
                      </h3>

                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                        <tr>
                          <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; text-transform: uppercase; width: 120px; font-weight: 600;">
                            Venue
                          </td>
                          <td style="padding-bottom: 8px; font-size: 14px; font-weight: 600; color: #334155;">
                            ${eventVenue}
                          </td>
                        </tr>
                        <tr>
                          <td style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">
                            Date & Time
                          </td>
                          <td style="font-size: 14px; font-weight: 600; color: #b45309;">
                            ${eventDate}
                          </td>
                        </tr>
                      </table>
                    </div>

                    <p style="font-size: 13px; line-height: 1.6; color: #64748b; text-align: left; margin: 30px 0 10px 0;">
                      We look forward to seeing you there! If you can no longer attend, please take a moment to update your RSVP status on the hub so another student can take your spot.
                    </p>
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
                      Sent by MKU Law Student Hub. If you have any questions or feedback about this event, please contact the coordinator or visit the event details page.
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

    const payload = {
      from: fromEmail,
      to: isSendingToTestOnly ? [testEmail] : [applicantEmail],
      subject: customSubject || `Event Reminder: ${eventTitle}`,
      html: customHtml || defaultHtmlContent
    };

    console.log("[Resend Seats-Reminder] Mailing notification pass:", {
      from: payload.from,
      to: payload.to,
      subject: payload.subject
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("[Resend Seats-Reminder] API Rejection:", responseData);
      throw new Error(JSON.stringify(responseData));
    }

    return res.status(200).json({ success: true, response: responseData });
  } catch (err: any) {
    console.error("[Resend Seats-Reminder] Exception:", err);
    return res.status(500).json({ error: err.message || "Failed to dispatch event reminder." });
  }
}
