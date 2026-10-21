import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { subject, postTitle, featuredImage, emails, blocks, replyTo } = req.body;

  try {
    const data = await resend.emails.send({
      from: 'StudentHub MKU <updates@studenthubmku.xyz>', // MUST be a verified domain
      to: emails,
      reply_to: replyTo || 'admin@studenthubmku.xyz', // This helps it land in Primary
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #173d91;">${postTitle}</h1>
          ${featuredImage ? `<img src="${featuredImage}" style="width: 100%; border-radius: 12px; margin-bottom: 20px;" alt="Cover" />` : ''}
          <div style="font-size: 16px; line-height: 1.6; color: #333;">
            ${blocks.map(b => `<p>${b.content}</p>`).join('')}
          </div>
          <hr style="margin: 30px 0;" />
          <p style="font-size: 12px; color: #888;">
            You are receiving this because you subscribed to StudentHub MKU. 
            <br/>If this landed in Promotions, please drag it to Primary.
          </p>
        </div>
      `,
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error("Resend Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
