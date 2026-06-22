// Cloudflare Pages Function — POST /api/submit
// Forwards landing-page form submissions to a Telegram chat.
//
// Required environment variables (set in Cloudflare Pages → Settings → Environment variables):
//   TELEGRAM_BOT_TOKEN  — token from @BotFather
//   TELEGRAM_CHAT_ID    — chat/group/channel id the bot posts to

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export async function onRequestPost({ request, env }) {
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return json({ ok: false, error: 'Server not configured' }, 500);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request body' }, 400);
  }

  const name = (data.name || '').toString().trim();
  const age = (data.age || '').toString().trim();
  const course = (data.course || '').toString().trim();
  const phone = (data.phone || '').toString().trim();
  const message = (data.message || '').toString().trim();

  // Minimal validation — name, phone and course are required by the form.
  if (!name || !phone || !course) {
    return json({ ok: false, error: 'Missing required fields' }, 400);
  }

  const lines = [
    '🎓 <b>Жаңа тіркелу сұранымы — Aru-Naz</b>',
    '',
    `👤 <b>Бала:</b> ${escapeHtml(name)}`,
    `🎂 <b>Жасы:</b> ${escapeHtml(age) || '—'}`,
    `📚 <b>Курс:</b> ${escapeHtml(course)}`,
    `📞 <b>Телефон:</b> ${escapeHtml(phone)}`,
  ];
  if (message) lines.push(`💬 <b>Сұрақ:</b> ${escapeHtml(message)}`);

  const tgRes = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    }
  );

  if (!tgRes.ok) {
    const detail = await tgRes.text().catch(() => '');
    console.error('Telegram API error:', tgRes.status, detail);
    return json({ ok: false, error: 'Telegram delivery failed' }, 502);
  }

  return json({ ok: true });
}
