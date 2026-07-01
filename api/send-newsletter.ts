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
  // Support either GET or POST, but main is POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { subject, postTitle, featuredImage, audience, emails, blocks, customSubject, customHtml } = req.body;
    const { apiKey, fromEmail, isSendingToTestOnly, testEmail, verifiedDomain } = getResendConfig();

    // Helper to escape potential raw HTML/XML tags (e.g. <ANNOUNCEMENT>) in user-generated text
    const escapeUserText = (text: string): string => {
      if (!text) return "";
      return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    // Map content blocks to clean, inline-styled tables for robust email client rendering
    let blocksHtml = "";
    if (Array.isArray(blocks) && blocks.length > 0) {
      blocksHtml = blocks.map((block: any) => {
        if (block.type === "h1") {
          return `
            <h2 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 18px; color: #0f172a; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 25px; margin-bottom: 12px;">
              ${escapeUserText(block.content || "")}
            </h2>
          `;
        } else if (block.type === "h2") {
          return `
            <h3 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #b45309; font-weight: 700; margin-top: 20px; margin-bottom: 8px;">
              ${escapeUserText(block.content || "")}
            </h3>
          `;
        } else if (block.type === "image" && block.content) {
          return `
            <div style="margin: 22px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; text-align: center; background-color: #f8fafc;">
              <img src="${block.content}" style="width: 100%; height: auto; display: block; max-width: 100%;" />
            </div>
          `;
        } else {
          // Newlines converted to br, but content safely escaped first!
          const escapedContent = escapeUserText(block.content || "");
          const safeText = escapedContent.replace(/\n/g, "<br/>");
          return `
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14.5px; line-height: 1.6; color: #334155; margin: 12px 0;">
              ${safeText || ""}
            </p>
          `;
        }
      }).join("");
    } else {
      blocksHtml = `
        <p style="font-size: 14.5px; line-height: 1.6; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 12px 0;">
          Greetings students and colleagues,
        </p>
        <p style="font-size: 14.5px; line-height: 1.6; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 12px 0;">
          A new bulletin update has been published: <strong>${escapeUserText(postTitle || "Latest Hub Update")}</strong>. Log in to the MKU Law Student Hub to inspect recent notices, view details, and participate in current activities.
        </p>
      `;
    }

    const defaultHtmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject || "Campus Update"}</title>
      </head>
      <body style="background-color: #f8fafc; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <!-- Header Banner -->
                <tr>
                  <td style="padding: 30px 40px; border-bottom: 1px solid #e2e8f0; background-color: #ffffff; text-align: left;">
                    <p style="margin: 0; color: #b45309; font-size: 14px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                      MKU School of Law
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 20px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px;">
                      Law Student Hub Noticeboard
                    </p>
                  </td>
                </tr>

                <!-- Featured Image -->
                ${featuredImage ? `
                <tr>
                  <td style="padding: 0;">
                    <img src="${featuredImage}" alt="Cover Image" style="width: 100%; height: auto; display: block; max-width: 100%; border-bottom: 1px solid #e2e8f0;" />
                  </td>
                </tr>
                ` : ""}

                <!-- Content Area -->
                <tr>
                  <td style="padding: 45px 40px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <!-- Small Category Pill -->
                          <span style="display: inline-block; background-color: #fef3c7; border: 1px solid #fde68a; color: #b45309; font-size: 10px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 6px; margin-bottom: 15px;">
                            ${(audience || "all").toUpperCase()} Announcement
                          </span>

                          <!-- main Title -->
                          <h1 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                            ${escapeUserText(postTitle || "Official Bulletin Briefing")}
                          </h1>

                          <!-- Blocks Section -->
                          <div style="margin-top: 25px; margin-bottom: 35px;">
                            ${blocksHtml}
                          </div>

                          <!-- Call to Action Button -->
                          <div style="text-align: left; margin: 35px 0 20px 0;">
                            <a href="https://studenthubmku.xyz/" target="_blank" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 700; font-size: 13px; border-radius: 8px; text-transform: uppercase; display: inline-block; letter-spacing: 0.5px;">
                              Open Student Hub &rarr;
                            </a>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Privacy Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: left;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #64748b; line-height: 1.5;">
                      Sent by the MKU Law Student Hub.<br />
                      This broadcast is directed to registered students and colleagues of Mount Kenya University School of Law. You can manage your email subscription choices in your profile settings.
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

    // Configure proper broadcast:
    // To protect student privacy, we set 'to' to a display group address and put students in 'bcc'.
    const emailsCount = Array.isArray(emails) ? emails.length : 0;
    
    const payload = {
      from: fromEmail,
      to: isSendingToTestOnly 
        ? [testEmail] 
        : (emailsCount === 1 ? emails : [`MKU Law Student Hub <news@${verifiedDomain}>`]),
      bcc: isSendingToTestOnly 
        ? [] 
        : (emailsCount > 1 ? emails : []),
      subject: customSubject || subject || `[MKU Law Student Hub] ${postTitle || "Latest Bulletin"}`,
      html: customHtml || defaultHtmlContent
    };

    // If there are no recipients because it's just a test send or empty list, route directly to the single test email
    if (isSendingToTestOnly || emailsCount === 0) {
      payload.to = [testEmail];
      payload.bcc = [];
    }

    console.log("[Resend Newsletter] Broadcasting campaign payload:", {
      from: payload.from,
      to: payload.to,
      bccCount: payload.bcc.length,
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
      console.error("[Resend Newsletter] Resend API rejection error:", responseData);
      throw new Error(JSON.stringify(responseData));
    }

    console.log("[Resend Newsletter] Dispatch succeeded:", responseData);
    return res.status(200).json({ success: true, response: responseData });
  } catch (err: any) {
    console.error("[Resend Newsletter] Handler exception:", err);
    return res.status(500).json({ error: err.message || "Failed to broadcast newsletter" });
  }
}
