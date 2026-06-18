// Reçoit le formulaire de devis directement (sans Netlify Forms)
// Parse multipart/form-data, envoie un email HTML + pièces jointes via Resend

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
    if (buf[pos] === 0x2D && buf[pos + 1] === 0x2D) break; // --boundary--
    if (buf[pos] === 0x0D && buf[pos + 1] === 0x0A) pos += 2;

    const hEnd = indexOf(buf, CRLFCRLF, pos);
    if (hEnd === -1) break;
    const headers = buf.slice(pos, hEnd).toString('utf8');
    pos = hEnd + 4;

    const nextB = indexOf(buf, boundary, pos);
    if (nextB === -1) break;
    const part = buf.slice(pos, nextB - 2);
    pos = nextB;

    const nameM     = headers.match(/name="([^"]+)"/i);
    const fileM     = headers.match(/filename="([^"]*)"/i);
    const ctM       = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    if (!nameM) continue;

    if (fileM && fileM[1]) {
      files.push({
        filename:    fileM[1],
        contentType: ctM ? ctM[1].trim() : 'application/octet-stream',
        content:     part.toString('base64'),
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

  const rows = [
    ['Nom',        `<strong>${nom}</strong>`],
    ['Téléphone',  `<a href="tel:${tel}" style="color:${DARK};font-weight:700;text-decoration:none">${tel}</a>`],
    ...(email ? [['Email', `<a href="mailto:${email}" style="color:#D9A900;text-decoration:none">${email}</a>`]] : []),
    ['Profil',     typeClient],
    ['Prestation', `<span style="background:${GOLD};color:${DARK};padding:2px 10px;border-radius:4px;font-weight:700;font-size:13px">${prestation}</span>`],
    ...((ville || cp) ? [['Localisation', [ville, cp].filter(Boolean).join(' — ')]] : []),
    ...(message ? [['Description', `<span style="white-space:pre-wrap">${message}</span>`]] : []),
    ...(files.length ? [['Fichiers joints', files.map(f => `<strong>📎 ${f.filename}</strong>`).join('<br>')]] : []),
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

  const payload = {
    from:     'Wonder Construction <devis@wonder-construction.fr>',
    to:       [process.env.NOTIFY_EMAIL || 'contact@wonder-construction.fr'],
    subject:  `Nouveau devis — ${nom} · ${prestation}`,
    html,
    ...(files.length ? { attachments: files.map(f => ({ filename: f.filename, content: f.content })) } : {}),
  };
  if (email) payload.reply_to = email;

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) console.error('Resend error:', await res.text());

  return {
    statusCode: 302,
    headers:    { Location: '/merci.html' },
    body:       '',
  };
};
