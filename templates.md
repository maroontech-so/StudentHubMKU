# MKU Law Student Hub Email Templates

Please see below all the email templates used by the application, organized by feature. Feel free to edit the copy or layouts, and when ready, let me know and I will implement the updated designs and copy for you!

---

## 1. Portfolio Lead / Discovery Notification
* **File Path**: `/api/alert-vendor.ts`
* **Purpose**: Dispatched to a vendor when a student discovers/views their marketplace business profile.

### Default Structure & Subject:
* **Subject**: `[Lead Alert] Your brand portfolio "{businessName}" was discovered!`
* **HTML Template**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio View Notification</title>
</head>
<body style="background-color: #020203; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #020203; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #09090b; border: 1px solid #1f1f23; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 35px 40px 25px 40px; border-bottom: 1px solid #1f1f23; text-align: center; background: linear-gradient(135deg, #09090b 0%, #121214 100%);">
              <p style="margin: 0; font-family: 'Courier New', Courier, monospace; color: #fcdd09; font-size: 24px; font-weight: 900; letter-spacing: 6px; text-transform: uppercase;">
                MKU LAW
              </p>
              <p style="margin: 5px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #a1a1aa; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">
                MARKETPLACE LEAD DISCOVERY
              </p>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <!-- Small Stat badge -->
                    <div style="text-align: left; margin-bottom: 20px;">
                      <span style="display: inline-block; background-color: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.25); color: #4ade80; font-size: 10px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 6px;">
                        &bull; LOCAL LEAD CAPTURED
                      </span>
                    </div>

                    <h1 style="margin: 0 0 15px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 950; color: #ffffff; line-height: 1.3; text-transform: uppercase;">
                      PORTFOLIO DISCOVERY ALERT
                    </h1>

                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14.5px; line-height: 1.6; color: #e4e4e7; margin: 15px 0;">
                      Hello <strong>${vendorName || "Merchant Partner"}</strong>,
                    </p>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 15px 0;">
                      Exciting trade indicators are showing up! Your official campus enterprise profile, <strong>"${businessName}"</strong>, was just discovered and viewed by a prospective buyer on the <strong>MKU Law Student Hub Marketplace</strong>.
                    </p>
                    
                    <div style="background-color: #16161a; border: 1px solid #1f1f23; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: left;">
                      <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: bold; color: #ffffff; text-transform: uppercase; tracking: 0.5px;">Merchant Campaign Insights</p>
                      <p style="margin: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #a1a1aa;">&bull; Student interest has increased significantly this week.</p>
                      <p style="margin: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #a1a1aa;">&bull; Keep your visual streams, price points, and exclusive student-only discount rates fresh to secure orders.</p>
                    </div>

                    <!-- Button -->
                    <div style="text-align: center; margin: 30px 0 10px 0;">
                      <a href="https://studenthubmku.xyz/marketplace" target="_blank" style="background-color: #fcdd09; color: #000000; padding: 15px 30px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 800; font-size: 12px; border-radius: 10px; text-transform: uppercase; display: inline-block; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(252, 221, 9, 0.15);">
                        Manage Business Portfolio &rarr;
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 40px; background-color: #050506; border-top: 1px solid #1f1f23; text-align: center;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #52525b; line-height: 1.4;">
                This is an automated performance report. To suspend lead alerts, switch off the "View Notifications" toggle in your merchant profile editing drawer.
              </p>
              <p style="margin: 10px 0 0 0; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #3f3f46; letter-spacing: 1px;">
                Target Recipient Destination: ${vendorEmail} &bull; Verified: ${verifiedDomain}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Event RSVP Seat Confirmation E-Pass
* **File Path**: `/api/send-event-registration-email.ts`
* **Purpose**: Triggered automatically when a student signs up / registers for an official council or academic event with customized roster fields.

### Default Structure & Subject:
* **Subject**: `[RSVP Certified] Your seat pass for {eventTitle} is reserved!`
* **HTML Template**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSVP Seat Confirmation Pass</title>
</head>
<body style="background-color: #020203; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #020203; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #09090b; border: 1px solid #1f1f23; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 35px 40px 25px 40px; border-bottom: 1px solid #1f1f23; text-align: center; background: linear-gradient(135deg, #09090b 0%, #121214 100%);">
              <p style="margin: 0; font-family: 'Courier New', Courier, monospace; color: #fcdd09; font-size: 24px; font-weight: 900; letter-spacing: 6px; text-transform: uppercase;">
                MKU LAW
              </p>
              <p style="margin: 5px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #22c55e; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                &bull; SEAT RESERVATION CONFIRMED &bull;
              </p>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 15px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 950; color: #ffffff; line-height: 1.3; text-transform: uppercase; text-align: left;">
                      YOUR RSVP IS SECURED
                    </h1>

                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14.5px; line-height: 1.6; color: #e4e4e7; margin: 15px 0; text-align: left;">
                      Dear <strong>${applicantName}</strong>,
                    </p>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 15px 0; text-align: left;">
                      Your delegate entry credentials for the upcoming council symposium/assembly have been officially generated.
                    </p>

                    <!-- Ticket Pass layout -->
                    <div style="background-color: #0c0c0e; border: 2px dashed #1f1f23; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: left; position: relative;">
                      <span style="display: inline-block; background-color: #22c55e; color: #000000; font-size: 9px; font-weight: 900; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1.5px; padding: 3px 10px; border-radius: 4px; margin-bottom: 15px;">
                        OFFICIAL DIGITAL PASS
                      </span>

                      <h3 style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 800; color: #ffffff; line-height: 1.3; text-transform: uppercase;">
                        ${eventTitle}
                      </h3>

                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 15px; border-top: 1px solid #1f1f23; padding-top: 15px;">
                        <tr>
                          <td style="padding-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #71717a; text-transform: uppercase; width: 120px;">
                            Chamber Venue
                          </td>
                          <td style="padding-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #e4e4e7;">
                            ${eventVenue}
                          </td>
                        </tr>
                        <tr>
                          <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #71717a; text-transform: uppercase;">
                            Date & Time
                          </td>
                          <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #fcdd09;">
                            ${eventDate}
                          </td>
                        </tr>
                      </table>
                    </div>

                    ${fieldsHtml}

                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12.5px; line-height: 1.6; color: #71717a; text-align: center; margin: 30px 0 10px 0;">
                      Please present this digital confirmation of entry or the associate register ticket code when checking in at the physical or virtual venue.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 40px; background-color: #050506; border-top: 1px solid #1f1f23; text-align: center;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #52525b; line-height: 1.4;">
                This receipt pass handles campus entry control validation. For seat modification, re-access the RSVP link directly on the Mooting Parliament Hub.
              </p>
              <p style="margin: 10px 0 0 0; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #3f3f46; letter-spacing: 1px;">
                Secured RSVP: ${applicantEmail} &bull; Verified: ${verifiedDomain}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Event / Assembly Dynamic Reminder
* **File Path**: `/api/send-event-reminder-email.ts`
* **Purpose**: Fired from the admin dashboard database analyzer to remind RSVP registered delegates that an event is commencing soon.

### Default Structure & Subject:
* **Subject**: `[Reminder] Upcoming Session: {eventTitle}`
* **HTML Template**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upcoming Assembly Reminder</title>
</head>
<body style="background-color: #020203; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #020203; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #09090b; border: 1px solid #1f1f23; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 35px 40px 25px 40px; border-bottom: 1px solid #1f1f23; text-align: center; background: linear-gradient(135deg, #09090b 0%, #121214 100%);">
              <p style="margin: 0; font-family: 'Courier New', Courier, monospace; color: #fcdd09; font-size: 24px; font-weight: 900; letter-spacing: 6px; text-transform: uppercase;">
                MKU LAW
              </p>
              <p style="margin: 5px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #f59e0b; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                &bull; COMRADE ASSEMBLY ALERT &bull;
              </p>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <!-- Urgent Pill -->
                    <div style="text-align: left; margin-bottom: 20px;">
                      <span style="display: inline-block; background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); color: #f59e0b; font-size: 10px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 6px;">
                        ⏳ HAPPENING SOON
                      </span>
                    </div>

                    <h1 style="margin: 0 0 15px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 950; color: #ffffff; line-height: 1.3; text-transform: uppercase; text-align: left;">
                      EVENT ASSEMBLY REMINDER
                    </h1>

                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14.5px; line-height: 1.6; color: #e4e4e7; margin: 15px 0; text-align: left;">
                      Dear <strong>${applicantName}</strong>,
                    </p>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 15px 0; text-align: left;">
                      This is an automated prompt reminding you that the legislative assembly or student symposium you RSVP'ed for will begin shortly. Please allocate sufficient travel/entry setup time.
                    </p>

                    <!-- Pass Layout -->
                    <div style="background-color: #121214; border: 1px solid #1f1f23; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: left;">
                      <p style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; text-transform: uppercase;">
                        ${eventTitle}
                      </p>

                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 15px; border-top: 1px solid #1f1f23; padding-top: 15px;">
                        <tr>
                          <td style="padding-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #71717a; text-transform: uppercase; width: 120px;">
                            Chamber Venue
                          </td>
                          <td style="padding-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #e4e4e7;">
                            ${eventVenue}
                          </td>
                        </tr>
                        <tr>
                          <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #71717a; text-transform: uppercase;">
                            Date & Time
                          </td>
                          <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #fcdd09;">
                            ${eventDate}
                          </td>
                        </tr>
                      </table>
                    </div>

                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12.5px; line-height: 1.6; color: #71717a; text-align: center; margin: 30px 0 10px 0;">
                      Ensure your Digital E-Pass QR code is saved on your responsive device layout to bypass entry security checks smoothly.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 40px; background-color: #050506; border-top: 1px solid #1f1f23; text-align: center;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #52525b; line-height: 1.4;">
                This notification was issued automatically by the Student Parliament portal administrator. To manage future email alerts, update your digital profile setup.
              </p>
              <p style="margin: 10px 0 0 0; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #3f3f46; letter-spacing: 1px;">
                Trigger Destination: ${applicantEmail} &bull; Verified: ${verifiedDomain}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Newsletter / Bulletin Broadcast Campaign
* **File Path**: `/api/send-newsletter.ts`
* **Purpose**: Dispatched directly by administrators when publishing or broadcasting high-priority council gazettes, academic bulletins, or student-wide news alerts.

### Default Structure & Subject:
* **Subject**: `[MKU Law Student Hub] {postTitle}` (with absolute customization fallback)
* **HTML Template**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || "Campus Briefing"}</title>
</head>
<body style="background-color: #020203; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #020203; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #09090b; border: 1px solid #1f1f23; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 35px 40px 25px 40px; border-bottom: 1px solid #1f1f23; text-align: center; background: linear-gradient(135deg, #09090b 0%, #121214 100%);">
              <p style="margin: 0; font-family: 'Courier New', Courier, monospace; color: #fcdd09; font-size: 24px; font-weight: 900; letter-spacing: 6px; text-transform: uppercase;">
                MKU LAW
              </p>
              <p style="margin: 5px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #a1a1aa; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">
                STUDENT PARLIAMENT HUB
              </p>
            </td>
          </tr>

          <!-- Featured Image -->
          ${featuredImage ? `
          <tr>
            <td style="padding: 0;">
              <img src="${featuredImage}" alt="Cover Image" style="width: 100%; height: auto; display: block; max-width: 100%; border-bottom: 1px solid #1f1f23;" />
            </td>
          </tr>
          ` : ""}

          <!-- Content Area -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <!-- Small Category Pill -->
                    <span style="display: inline-block; background-color: rgba(252, 221, 9, 0.1); border: 1px solid rgba(252, 221, 9, 0.2); color: #fcdd09; font-size: 10px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 6px; margin-bottom: 15px;">
                      ${(audience || "all").toUpperCase()} BULLETIN
                    </span>

                    <!-- main Title -->
                    <h1 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 900; color: #ffffff; line-height: 1.3; text-transform: uppercase; tracking: -0.5px;">
                      ${postTitle || "Special Release Board Briefing"}
                    </h1>

                    <!-- Blocks Section -->
                    <div style="margin-top: 25px; margin-bottom: 35px;">
                      ${blocksHtml}
                    </div>

                    <!-- Call to Action Button -->
                    <div style="text-align: center; margin: 35px 0 20px 0;">
                      <a href="https://studenthubmku.xyz/" target="_blank" style="background-color: #fcdd09; color: #000000; padding: 16px 32px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 800; font-size: 12px; border-radius: 12px; text-transform: uppercase; display: inline-block; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(252, 221, 9, 0.2); transition: all 0.2s ease;">
                        Access Release Portal &rarr;
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Privacy Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #050506; border-top: 1px solid #1f1f23; text-align: center;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #71717a; line-height: 1.5;">
                This broadcast is sent to members registered in the MKU Law Student Hub database.<br />
                You can manage your subscription choices at any time directly in your account settings.
              </p>
              <p style="margin: 15px 0 0 0; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #52525b; text-transform: uppercase; letter-spacing: 1px;">
                Campus Registry Broadcast Code Block &bull; Verified: ${verifiedDomain}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```
