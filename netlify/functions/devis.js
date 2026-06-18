const { getStore } = require('@netlify/blobs');
const nodemailer  = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'mail.privateemail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function indexOf(hay, needle, start = 0) {
  outer: for (let i = start; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function parseMultipart(body, isBase64, contentType) {
  const buf = Buffer.from(body, isBase64 ? 'base64' : 'binary');
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
  if (!match) return { fields: {}, files: [] };

  const boundary = Buffer.from('--' + (match[1] || match[2]));
  const CRLFCRLF = Buffer.from('\r\n\r\n');
  const fields = {};
  const files  = [];

  let pos = 0;
  while (true) {
    const bpos = indexOf(buf, boundary, pos);
    if (bpos === -1) break;
    pos = bpos + boundary.length;
    if (buf[pos] === 0x2D && buf[pos + 1] === 0x2D) break;
    if (buf[pos] === 0x0D && buf[pos + 1] === 0x0A) pos += 2;

    const hEnd = indexOf(buf, CRLFCRLF, pos);
    if (hEnd === -1) break;
    const headers = buf.slice(pos, hEnd).toString('utf8');
    pos = hEnd + 4;

    const nextB = indexOf(buf, boundary, pos);
    if (nextB === -1) break;
    const part = buf.slice(pos, nextB - 2);
    pos = nextB;

    const nameM = headers.match(/name="([^"]+)"/i);
    const fileM = headers.match(/filename="([^"]*)"/i);
    const ctM   = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    if (!nameM) continue;

    if (fileM && fileM[1]) {
      files.push({
        filename:    fileM[1],
        contentType: ctM ? ctM[1].trim() : 'application/octet-stream',
        content:     part.toString('base64'),
        buffer:      part,
      });
    } else {
      fields[nameM[1]] = part.toString('utf8');
    }
  }
  return { fields, files };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 302, headers: { Location: '/' } };
  }

  const ct = (event.headers['content-type'] || event.headers['Content-Type'] || '');
  let fields = {}, files = [];

  if (ct.includes('multipart/form-data')) {
    ({ fields, files } = parseMultipart(event.body, event.isBase64Encoded, ct));
  }

  const GOLD = '#F5C200';
  const DARK = '#1C2027';

  const nom        = fields.nom             || 'Non renseigné';
  const tel        = fields.tel             || 'Non renseigné';
  const email      = fields.email           || '';
  const typeClient = fields['type-client']  || 'Non renseigné';
  const prestation = fields.prestation      || 'Non renseigné';
  const ville      = fields.ville           || '';
  const cp         = fields.cp              || '';
  const message    = fields.message         || '';

  // Upload files to Netlify Blobs and generate download links
  const fileLinks = [];
  if (files.length > 0) {
    try {
      const siteID = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
      const token  = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
      console.log('Blob config — siteID:', siteID, 'token present:', !!token, 'NETLIFY_BLOBS_TOKEN present:', !!process.env.NETLIFY_BLOBS_TOKEN);
      const storeOpts = { name: 'devis-uploads' };
      if (siteID) storeOpts.siteID = siteID;
      if (token)  storeOpts.token  = token;
      const store = getStore(storeOpts);
      for (const file of files) {
        const key = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.filename}`;
        console.log('Uploading blob key:', key, 'size:', file.buffer.length);
        await store.set(key, file.buffer, {
          metadata: { filename: file.filename, contentType: file.contentType },
        });
        console.log('Blob uploaded successfully:', key);
        const siteUrl = process.env.URL || 'https://wonder-construction.fr';
        const downloadUrl = `${siteUrl}/.netlify/functions/download?key=${encodeURIComponent(key)}`;
        fileLinks.push({ filename: file.filename, url: downloadUrl });
      }
    } catch (err) {
      console.error('Blob upload error:', err.message, err.stack);
    }
  }

  // Build the files row: clickable links if uploaded, fallback to filename
  let fichiersHtml;
  if (fileLinks.length > 0) {
    fichiersHtml = fileLinks.map(f =>
      `<a href="${f.url}" style="color:${GOLD};font-weight:700;text-decoration:none;display:block;margin-bottom:6px">` +
      `📎 ${f.filename}</a>`
    ).join('');
  } else if (files.length > 0) {
    fichiersHtml = files.map(f => `<strong>📎 ${f.filename}</strong>`).join('<br>');
  } else {
    fichiersHtml = null;
  }

  const rows = [
    ['Nom',        `<strong>${nom}</strong>`],
    ['Téléphone',  `<a href="tel:${tel}" style="color:${DARK};font-weight:700;text-decoration:none">${tel}</a>`],
    ...(email ? [['Email', `<a href="mailto:${email}" style="color:#D9A900;text-decoration:none">${email}</a>`]] : []),
    ['Profil',     typeClient],
    ['Prestation', `<span style="background:${GOLD};color:${DARK};padding:2px 10px;border-radius:4px;font-weight:700;font-size:13px">${prestation}</span>`],
    ...((ville || cp) ? [['Localisation', [ville, cp].filter(Boolean).join(' — ')]] : []),
    ...(message ? [['Description', `<span style="white-space:pre-wrap">${message}</span>`]] : []),
    ...(fichiersHtml ? [['Fichiers joints', fichiersHtml]] : []),
  ];

  const rowsHtml = rows.map(([label, value], i) => `
    <tr style="background:${i % 2 === 0 ? '#FAF7F0' : '#fff'}">
      <td style="padding:11px 16px;color:#666;width:160px;font-size:13px;font-weight:600;border-bottom:1px solid #eee;vertical-align:top">${label}</td>
      <td style="padding:11px 16px;font-size:14px;border-bottom:1px solid #eee">${value}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.12)">
    <div style="background:${DARK};padding:28px 32px;text-align:center">
      <img src="https://wonder-construction.fr/images/logo.jpeg" alt="Wonder Construction" height="60" style="display:block;margin:0 auto 14px;border-radius:4px"/>
      <h1 style="color:${GOLD};margin:0;font-size:22px;letter-spacing:1px">WONDER CONSTRUCTION</h1>
      <p style="color:#fff;margin:6px 0 0;font-size:13px;opacity:0.7">Nouvelle demande de devis</p>
    </div>
    <div style="padding:28px 32px">
      <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #eee">
        ${rowsHtml}
      </table>
      <div style="margin-top:24px;text-align:center">
        <a href="tel:${tel}" style="display:inline-block;background:${GOLD};color:${DARK};padding:13px 32px;border-radius:6px;font-weight:700;font-size:15px;text-decoration:none">
          📞 Rappeler ${nom}
        </a>
      </div>
    </div>
    <div style="background:#f5f5f5;padding:14px 32px;text-align:center;font-size:12px;color:#aaa">
      Reçu via <a href="https://wonder-construction.fr" style="color:#D9A900;text-decoration:none">wonder-construction.fr</a>
    </div>
  </div>
</body>
</html>`;

  const transport = createTransport();
  const notifyTo  = process.env.SMTP_USER || 'contact@wonder-construction.fr';
  const sendJobs  = [];

  // 1. Notification au propriétaire
  sendJobs.push(transport.sendMail({
    from:     `"Wonder Construction" <${notifyTo}>`,
    to:       notifyTo,
    replyTo:  email || undefined,
    subject:  `Nouvelle demande de devis — ${nom} · ${prestation}`,
    html,
    ...(files.length ? { attachments: files.map(f => ({ filename: f.filename, content: f.content, encoding: 'base64' })) } : {}),
  }));

  // 2. Confirmation au client
  if (email && email.includes('@')) {
    const GOLD2 = '#F5C200';
    const DARK2 = '#0D0D0D';
    const prenom = nom.split(' ')[0] || 'Madame/Monsieur';
    const confirmHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr>
          <td style="background:${DARK2};padding:28px 32px;border-radius:12px 12px 0 0" align="center">
            <img src="https://wonder-construction.fr/images/logo.jpeg" alt="Wonder Construction" height="56" style="display:block;margin:0 auto 12px;border-radius:4px"/>
            <div style="width:48px;height:2px;background:${GOLD2};margin:0 auto 12px"></div>
            <p style="margin:0;color:${GOLD2};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Confirmation de demande</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:36px 32px">
            <h1 style="margin:0 0 8px;color:${DARK2};font-size:24px;font-weight:700">Merci ${prenom}&nbsp;!</h1>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
              Votre demande de devis a bien été reçue. Notre équipe l'étudie et vous recontactera dans les <strong>24&nbsp;heures</strong>.
            </p>
            <div style="background:#f9f9f9;border-left:4px solid ${GOLD2};border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px">
              <p style="margin:0 0 6px;color:#999;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Récapitulatif</p>
              ${prestation ? `<p style="margin:4px 0;color:${DARK2};font-size:14px"><strong>Prestation :</strong> ${prestation}</p>` : ''}
              ${ville      ? `<p style="margin:4px 0;color:${DARK2};font-size:14px"><strong>Localisation :</strong> ${ville}</p>` : ''}
              <p style="margin:4px 0;color:${DARK2};font-size:14px"><strong>Délai de réponse :</strong> Sous 24&nbsp;h</p>
            </div>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="padding:0 8px 0 0">
                  <a href="tel:+33781389994" style="display:inline-block;background:${DARK2};color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:8px">📞 07 81 38 99 94</a>
                </td>
                <td>
                  <a href="mailto:contact@wonder-construction.fr" style="display:inline-block;background:${GOLD2};color:${DARK2};font-weight:700;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:8px">✉ Nous écrire</a>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#999;font-size:13px;line-height:1.5">Cordialement,<br><strong style="color:${DARK2}">L'équipe Wonder Construction</strong></p>
          </td>
        </tr>
        <tr>
          <td style="background:#f0f0f0;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e0e0e0" align="center">
            <p style="margin:0;color:#888;font-size:12px">SAS Wonder Construction — <a href="https://wonder-construction.fr" style="color:${GOLD2};text-decoration:none">wonder-construction.fr</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    sendJobs.push(transport.sendMail({
      from:    `"Wonder Construction" <${notifyTo}>`,
      to:      email,
      subject: 'Votre demande de devis a bien été reçue — Wonder Construction',
      html:    confirmHtml,
    }));
  }

  try {
    await Promise.all(sendJobs);
    console.log('Emails sent OK');
  } catch (err) {
    console.error('Email error:', err.message);
  }

  return {
    statusCode: 302,
    headers:    { Location: '/merci.html' },
    body:       '',
  };
};
