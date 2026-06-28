const nodemailer = require('nodemailer');

const LOGO_URL = 'https://wonder-construction.fr/images/logo.jpeg';
const SITE_URL = 'https://wonder-construction.fr';
const GOLD    = '#F5C200';
const DARK    = '#0D0D0D';

/* ── TRANSPORT SMTP ── */
function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'mail.privateemail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/* ── EMAIL NOTIFICATION (pour vous) ── */
function buildNotificationEmail(data, files) {
  const { nom, tel, email, 'type-client': typeClient, prestation, ville, cp, message } = data;

  const rows = [
    ['Nom complet',       nom        || '—'],
    ['Téléphone',         tel        || '—'],
    ['Email',             email      || '—'],
    ['Profil client',     typeClient || '—'],
    ['Prestation',        prestation || '—'],
    ['Ville du chantier', ville      || '—'],
    ['Code postal',       cp         || '—'],
    ['Message',           message    || '—'],
  ];

  const fileEntries = Object.entries(files || {});
  const fichiersHtml = fileEntries.length > 0
    ? fileEntries.map(([, url]) => {
        const filename = decodeURIComponent(url.split('/').pop() || url);
        return `<a href="${url}" style="color:${GOLD};display:block;margin-bottom:4px">📎 ${filename}</a>`;
      }).join('')
    : '<em style="color:#666">Aucun fichier joint</em>';

  rows.push(['Fichiers joints', fichiersHtml]);

  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 16px;background:#1a1a1a;color:#999;font-size:13px;font-weight:600;white-space:nowrap;border-bottom:1px solid #2a2a2a;width:180px">${label}</td>
      <td style="padding:10px 16px;background:#111;color:#f0f0f0;font-size:14px;border-bottom:1px solid #2a2a2a">${value}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- HEADER -->
        <tr>
          <td style="background:${GOLD};padding:28px 32px;border-radius:12px 12px 0 0" align="center">
            <img src="${LOGO_URL}" alt="Wonder Construction" height="56" style="display:block;margin:0 auto 12px" />
            <p style="margin:0;color:${DARK};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Nouvelle demande de devis</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#161616;padding:32px">
            <h2 style="margin:0 0 6px;color:#fff;font-size:22px">
              ${nom || 'Un visiteur'} a soumis une demande
            </h2>
            <p style="margin:0 0 24px;color:#888;font-size:14px">
              Reçu le ${new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #2a2a2a">
              ${rowsHtml}
            </table>

            ${email ? `
            <div style="margin-top:28px;text-align:center">
              <a href="mailto:${email}?subject=Votre devis Wonder Construction"
                 style="display:inline-block;background:${GOLD};color:${DARK};font-weight:700;font-size:14px;letter-spacing:1px;text-decoration:none;padding:13px 28px;border-radius:8px">
                ✉ Répondre à ${nom || 'ce client'}
              </a>
            </div>` : ''}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#0D0D0D;padding:20px 32px;border-top:1px solid #2a2a2a;border-radius:0 0 12px 12px" align="center">
            <p style="margin:0;color:#555;font-size:12px">
              SAS Wonder Construction — <a href="${SITE_URL}" style="color:${GOLD};text-decoration:none">wonder-construction.fr</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── EMAIL CONFIRMATION (pour le client) ── */
function buildConfirmationEmail(data) {
  const { nom, prestation, ville } = data;
  const prenom = (nom || '').split(' ')[0] || 'Madame/Monsieur';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- HEADER -->
        <tr>
          <td style="background:${DARK};padding:28px 32px;border-radius:12px 12px 0 0" align="center">
            <img src="${LOGO_URL}" alt="Wonder Construction" height="56" style="display:block;margin:0 auto 12px" />
            <div style="width:48px;height:2px;background:${GOLD};margin:0 auto 12px"></div>
            <p style="margin:0;color:${GOLD};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Confirmation de demande</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#fff;padding:36px 32px">

            <h1 style="margin:0 0 8px;color:${DARK};font-size:24px;font-weight:700">
              Merci ${prenom}&nbsp;!
            </h1>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
              Votre demande de devis a bien été reçue. Notre équipe l'étudie et vous recontactera dans les <strong>24&nbsp;heures</strong> pour faire le point sur votre projet.
            </p>

            <!-- RECAP -->
            <div style="background:#f9f9f9;border-left:4px solid ${GOLD};border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px">
              <p style="margin:0 0 6px;color:#999;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Récapitulatif</p>
              ${prestation ? `<p style="margin:4px 0;color:${DARK};font-size:14px"><strong>Prestation :</strong> ${prestation}</p>` : ''}
              ${ville     ? `<p style="margin:4px 0;color:${DARK};font-size:14px"><strong>Localisation :</strong> ${ville}</p>` : ''}
              <p style="margin:4px 0;color:${DARK};font-size:14px"><strong>Délai de réponse :</strong> Sous 24&nbsp;h</p>
            </div>

            <p style="margin:0 0 28px;color:#555;font-size:14px;line-height:1.6">
              En attendant, n'hésitez pas à nous contacter directement si votre demande est urgente :
            </p>

            <!-- CONTACT -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="padding:0 8px 0 0">
                  <a href="tel:+33668648688"
                     style="display:inline-block;background:${DARK};color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:8px">
                    📞 06 68 64 86 88
                  </a>
                </td>
                <td>
                  <a href="mailto:contact@wonder-construction.fr"
                     style="display:inline-block;background:${GOLD};color:${DARK};font-weight:700;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:8px">
                    ✉ Nous écrire
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#999;font-size:13px;line-height:1.5">
              Cordialement,<br>
              <strong style="color:${DARK}">L'équipe Wonder Construction</strong>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f0f0f0;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e0e0e0" align="center">
            <p style="margin:0 0 6px;color:#888;font-size:12px">
              SAS Wonder Construction — Spécialiste montage &amp; démontage d'échafaudages
            </p>
            <p style="margin:0;font-size:12px">
              <a href="${SITE_URL}" style="color:${GOLD};text-decoration:none">wonder-construction.fr</a>
              &nbsp;|&nbsp;
              <a href="${SITE_URL}/politique-confidentialite.html" style="color:#999;text-decoration:none">Politique de confidentialité</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── HANDLER PRINCIPAL ── */
exports.handler = async (event) => {
  console.log('submission-created triggered');
  try {
    const payload = JSON.parse(event.body);
    const data    = payload.payload?.data  || {};
    const files   = payload.payload?.files || {};

    console.log('Form data received:', JSON.stringify({ nom: data.nom, email: data.email, prestation: data.prestation }));

    const transport = createTransport();
    const emails = [];

    // 1. Notification au propriétaire
    emails.push(transport.sendMail({
      from:    `"Wonder Construction" <${process.env.SMTP_USER}>`,
      to:      process.env.SMTP_USER,
      subject: `Nouvelle demande de devis — ${data.nom || 'visiteur'} (${data.prestation || '?'})`,
      html:    buildNotificationEmail(data, files),
    }));

    // 2. Confirmation au client (seulement s'il a laissé un email)
    if (data.email && data.email.includes('@')) {
      emails.push(transport.sendMail({
        from:    `"Wonder Construction" <${process.env.SMTP_USER}>`,
        to:      data.email,
        subject: 'Votre demande de devis a bien été reçue — Wonder Construction',
        html:    buildConfirmationEmail(data),
      }));
    }

    await Promise.all(emails);
    console.log('Emails sent successfully');

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Email error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
