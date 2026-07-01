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
    const { vendorEmail, vendorName, businessName, customSubject, customHtml } = req.body;
    if (!vendorEmail) {
      return res.status(400).json({ error: "Vendor email is required" });
    }

    const { apiKey, fromEmail, isSendingToTestOnly, testEmail, verifiedDomain } = getResendConfig();

    // High quality, direct, professional institutional template
    const defaultHtmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Business Profile Viewed</title>
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
                      Student Hub Marketplace
                    </p>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 45px 40px;">
                    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                      Someone viewed your business profile
                    </h2>

                    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 15px 0;">
                      Hello <strong>${vendorName || "Merchant Partner"}</strong>,
                    </p>
                    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 15px 0;">
                      A student recently viewed your business profile, <strong>"${businessName}"</strong>, on the MKU Law Student Hub Marketplace.
                    </p>
                    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 15px 0;">
                      Keeping your profile updated with accurate information, pricing, and images can help attract more enquiries and potential customers.
                    </p>

                    <!-- Button -->
                    <div style="text-align: left; margin: 35px 0 10px 0;">
                      <a href="https://studenthubmku.xyz/marketplace" target="_blank" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: 700; font-size: 13px; border-radius: 8px; text-transform: uppercase; display: inline-block; letter-spacing: 0.5px;">
                        Manage Your Profile &rarr;
                      </a>
                    </div>
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
                      This email was sent because you have an account on the MKU Law Student Hub. If you do not want to receive these alerts, you can adjust your notification settings in your profile.
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
      to: isSendingToTestOnly ? [testEmail] : [vendorEmail],
      subject: customSubject || `Someone viewed your business profile on MKU Law Student Hub`,
      html: customHtml || defaultHtmlContent
    };

    console.log("[Resend Alert-Vendor] Mailing lead dispatch:", {
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
      console.error("[Resend Alert-Vendor] API Error:", responseData);
      throw new Error(JSON.stringify(responseData));
    }

    return res.status(200).json({ success: true, response: responseData });
  } catch (err: any) {
    console.error("[Resend Alert-Vendor] Exception:", err);
    return res.status(500).json({ error: err.message || "Failed to notify vendor" });
  }
}
