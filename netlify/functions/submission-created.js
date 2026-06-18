// Déclenchée automatiquement par Netlify Forms à chaque soumission
// Envoie un email HTML avec liens cliquables via Resend (aucun package npm requis)
exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body);
    const data    = payload.payload?.data  || {};
    const files   = payload.payload?.files || {};

    const nom        = data.nom            || 'Non renseigné';
    const tel        = data.tel            || 'Non renseigné';
    const email      = data.email          || '';
    const typeClient = data['type-client'] || 'Non renseigné';
    const prestation = data.prestation     || 'Non renseigné';
    const ville      = data.ville          || '';
    const cp         = data.cp             || '';
    const message    = data.message        || '';

    const GOLD = '#F5C200';
    const DARK = '#1C2027';

    // Liens vers les fichiers uploadés
    const fileEntries = Object.entries(files);
    const fichiersHtml = fileEntries.length > 0
      ? fileEntries.map(([, url]) => {
          const filename = decodeURIComponent(url.split('/').pop() || url);
          return `<a href="${url}" style="color:${GOLD};font-weight:600;display:block;margin-bottom:6px;text-decoration:none">📎 ${filename}</a>`;
        }).join('')
      : '<em style="color:#888">Aucun fichier joint</em>';

    const rows = [
      ['Nom',             `<strong>${nom}</strong>`],
      ['Téléphone',       `<a href="tel:${tel}" style="color:${DARK};font-weight:700;text-decoration:none">${tel}</a>`],
      ...(email ? [['Email', `<a href="mailto:${email}" style="color:#D9A900;text-decoration:none">${email}</a>`]] : []),
      ['Profil',          typeClient],
      ['Prestation',      `<span style="background:${GOLD};color:${DARK};padding:2px 10px;border-radius:4px;font-weight:700;font-size:13px">${prestation}</span>`],
      ...((ville || cp) ? [['Localisation', [ville, cp].filter(Boolean).join(' — ')]] : []),
      ...(message ? [['Description', `<span style="white-space:pre-wrap">${message}</span>`]] : []),
      ['Fichiers joints', fichiersHtml],
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

    const notifyEmail = process.env.NOTIFY_EMAIL || 'contact@wonder-construction.fr';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:     'Wonder Construction <devis@wonder-construction.fr>',
        to:       [notifyEmail],
        reply_to: email || undefined,
        subject:  `Nouveau devis — ${nom} · ${prestation}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return { statusCode: 500, body: 'Email send failed' };
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: err.message };
  }
};
