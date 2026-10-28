export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
}

const SITE_URL = "https://sporteventos.github.io/playpadelcoop/";

const MESSAGES = {
  registration_received: {
    eyebrow: "Pré-inscrição recebida",
    subject: "Pré-inscrição recebida",
    title: "Estás mais perto do campo.",
    text:
      "Recebemos a tua pré-inscrição. Neste momento está pendente de pagamento: a vaga só fica garantida depois de a organização validar o pagamento.",
    badge: "Pendente de pagamento",
    tone: "warning",
    stepsTitle: "Próximos passos",
    steps: [
      "Contacta o clube para combinar o pagamento.",
      "Efetua o pagamento diretamente nas instalações do clube.",
      "A organização valida o pagamento e confirma a tua inscrição.",
    ],
    contactLabel: "Contactar o clube para pagamento",
  },
  registration_waitlisted: {
    eyebrow: "Lista de espera",
    subject: "Inscrição em lista de espera",
    title: "Estás na lista de espera.",
    text:
      "A categoria escolhida está completa neste momento, por isso a tua inscrição ficou como suplente.",
    badge: "Suplente",
    tone: "info",
    stepsTitle: "Importante",
    steps: [
      "Não efetues qualquer pagamento enquanto estiveres na lista de espera.",
      "Se abrir uma vaga, a organização entra em contacto contigo.",
      "Podes acompanhar o estado da tua inscrição a qualquer momento.",
    ],
    contactLabel: "Falar com a organização",
  },
  registration_promoted: {
    eyebrow: "Vaga disponível",
    subject: "Vaga disponível para a tua inscrição",
    title: "Abriu uma vaga para ti!",
    text:
      "A organização retirou a tua inscrição da lista de espera. A pré-inscrição está agora pendente de pagamento.",
    badge: "Pendente de pagamento",
    tone: "warning",
    stepsTitle: "Próximos passos",
    steps: [
      "Contacta o clube para combinar o pagamento.",
      "Efetua o pagamento diretamente nas instalações do clube.",
      "A organização valida o pagamento e confirma a tua inscrição.",
    ],
    contactLabel: "Contactar o clube para pagamento",
  },
  registration_confirmed: {
    eyebrow: "Inscrição confirmada",
    subject: "Inscrição confirmada",
    title: "Está confirmado. Vemo-nos em campo!",
    text:
      "A organização validou a tua inscrição. O teu lugar no torneio está garantido.",
    badge: "Confirmada",
    tone: "success",
    stepsTitle: "E agora?",
    steps: [
      "Acompanha o calendário e os grupos no site do torneio.",
      "Chega com antecedência no dia dos teus jogos.",
      "Em caso de dúvida, fala com a organização.",
    ],
    contactLabel: "Falar com a organização",
  },
};

const TONES = {
  warning: { fg: "#8a6100", bg: "#fff4d6", border: "#f5c518" },
  info: { fg: "#1f4f99", bg: "#e6efff", border: "#7bb0ff" },
  success: { fg: "#0b6b3a", bg: "#ddf9e6", border: "#2bd46b" },
};

function button(href, label, primary) {
  const bg = primary ? "#54f653" : "#ffffff";
  const fg = "#04221c";
  const border = primary ? "#54f653" : "#cfdcd7";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 10px auto"><tr><td align="center" bgcolor="${bg}" style="border-radius:10px;border:1px solid ${border}">
<a href="${
    escapeHtml(href)
  }" target="_blank" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${fg};text-decoration:none;border-radius:10px">${
    escapeHtml(label)
  }</a>
</td></tr></table>`;
}

const PERIODS = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  dia: "Dia inteiro",
};

function parseMeta(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function availabilityText(meta) {
  if (meta.estado !== "condicionada") return "Sem restrições";
  const parts = [];
  const weekly = meta.horarioSemanal;
  if (weekly && weekly.hora) {
    parts.push(
      weekly.tipo === "a_partir"
        ? `Dias úteis: a partir das ${weekly.hora}`
        : `Dias úteis: início até às ${weekly.hora}`,
    );
  }
  (Array.isArray(meta.datas) ? meta.datas : []).forEach((item) => {
    if (!item || !item.data) return;
    parts.push(
      `Indisponível a ${item.data.split("-").reverse().join("/")}${
        PERIODS[item.periodo] ? ` (${PERIODS[item.periodo]})` : ""
      }`,
    );
  });
  return parts.length ? parts.join("\n") : "Condicionada";
}

function shirtText(shirt) {
  if (!shirt || (!shirt.nome && !shirt.tamanho)) return "";
  return [shirt.nome, shirt.tamanho].filter(Boolean).join(" · ");
}

export function registrationSummary(registration, categoryName) {
  if (!registration) return null;
  const meta = parseMeta(registration.observacoes);
  const isPartnerRow = /-p$/.test(String(registration.id || ""));
  const shirts = meta.tshirts || {};
  const ownShirt = isPartnerRow ? shirts.parceiro : shirts.principal;
  const partnerShirt = isPartnerRow ? shirts.principal : shirts.parceiro;
  const partnerName = String(registration.parceiro || "").trim();
  let format = "Dupla";
  let partner = partnerName;
  if (registration.reservado) {
    format = "Dupla reservada";
    partner = "A anunciar";
  } else if (!partnerName) {
    format = "Individual";
    partner = "A organização ajuda a formar dupla";
  }
  const genders = { M: "Masculino", F: "Feminino" };
  return {
    phone: String(registration.telefone || "").trim(),
    category: [registration.categoria, categoryName].filter(Boolean).join(
      " · ",
    ),
    gender: genders[registration.genero] || "",
    format,
    partner,
    shirt: shirtText(ownShirt),
    partnerShirt: partnerName && !registration.reservado
      ? shirtText(partnerShirt)
      : "",
    availability: meta.estado ? availabilityText(meta) : "",
  };
}

/**
 * @param {any} event
 * @param {any} config
 * @param {any} [summary]
 */
export function renderEmail(event, config, summary = null) {
  const message = MESSAGES[event.event_name];
  if (!message) throw new Error("unsupported_email_event");
  const tournament = config.tornNome || "Torneio Clausura";
  const club = config.tornClube || "Play Padel Coop";
  const dates = config.tornDatas || "";
  const place = config.tornLocal || "";
  const reference = "PP-" +
    event.registration_id.replace(/^ins-/, "").replace(/-p$/, "");
  const statusUrl = SITE_URL + "estado-inscricao.html?ref=" +
    encodeURIComponent(reference);
  const tone = TONES[message.tone];
  const phone = String(config.tornTelOrg || "").replace(/\D/g, "");
  const name = escapeHtml(event.payload.name);
  const firstName = escapeHtml(
    String(event.payload.name || "").trim().split(/\s+/)[0] || "",
  );

  const detailRow = (label, value) =>
    `<tr><td valign="top" style="padding:10px 12px 10px 0;border-bottom:1px solid #e3ece8;font-size:13px;color:#5b726b;white-space:nowrap">${label}</td><td align="right" valign="top" style="padding:10px 0;border-bottom:1px solid #e3ece8;font-size:14px;font-weight:bold;color:#0b2a24;line-height:1.45">${value}</td></tr>`;
  const sectionRow = (label) =>
    `<tr><td colspan="2" style="padding:18px 0 4px 0;font-size:10px;font-weight:bold;letter-spacing:1.6px;color:#0b6b3a;text-transform:uppercase">${label}</td></tr>`;
  const text = (value) => escapeHtml(value).replace(/\n/g, "<br>");
  const info = summary || {};
  const registrationRows = [
    sectionRow("A tua inscrição"),
    detailRow("Jogador", name),
    info.phone ? detailRow("Contacto", text(info.phone)) : "",
    detailRow(
      "Categoria",
      text(
        [
          info.category || event.payload.category,
          info.category?.toLowerCase().includes(
              String(info.gender).toLowerCase(),
            )
            ? ""
            : info.gender,
        ].filter(Boolean).join(" · "),
      ) +
        '<div style="font-size:11px;font-weight:normal;color:#5b726b">Nível sujeito a validação da organização</div>',
    ),
    info.format ? detailRow("Formato", text(info.format)) : "",
    info.partner ? detailRow("Parceiro(a)", text(info.partner)) : "",
    info.shirt || info.partnerShirt ? sectionRow("T-shirts") : "",
    info.shirt ? detailRow("A tua t-shirt", text(info.shirt)) : "",
    info.partnerShirt
      ? detailRow("T-shirt do(a) parceiro(a)", text(info.partnerShirt))
      : "",
    info.availability ? sectionRow("Disponibilidade") : "",
    info.availability ? detailRow("Restrições", text(info.availability)) : "",
    sectionRow("Torneio"),
    detailRow("Torneio", escapeHtml(tournament)),
    dates ? detailRow("Datas", escapeHtml(dates)) : "",
    place ? detailRow("Local", escapeHtml(place)) : "",
  ].join("\n");

  const steps = message.steps.map((step, index) =>
    `<tr><td width="34" valign="top" style="padding:0 0 12px 0"><div style="width:24px;height:24px;line-height:24px;border-radius:12px;background:#04221c;color:#54f653;font-size:12px;font-weight:bold;text-align:center">${
      index + 1
    }</div></td><td valign="top" style="padding:2px 0 12px 0;font-size:14px;line-height:1.5;color:#29443d">${
      escapeHtml(step)
    }</td></tr>`
  ).join("");

  const contactBlock = phone
    ? button(
      `https://wa.me/${phone}`,
      message.contactLabel,
      message.tone !== "success",
    )
    : "";
  const statusBlock = button(
    statusUrl,
    "Consultar estado da inscrição",
    !phone || message.tone === "success",
  );
  const phoneLine = phone
    ? `<p style="margin:6px 0 0 0;font-size:12px;color:#5b726b">WhatsApp do clube: <a href="https://wa.me/${phone}" style="color:#0b6b3a;text-decoration:none;font-weight:bold">${
      escapeHtml(config.tornTelOrg)
    }</a></p>`
    : "";

  const preheader =
    `${message.eyebrow} · ${tournament} · Referência ${reference}`;

  const body = `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(message.eyebrow)} — ${escapeHtml(tournament)}</title>
</head>
<body style="margin:0;padding:0;background:#eef3f1;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${
    escapeHtml(preheader)
  }</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef3f1">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">

<tr><td bgcolor="#04221c" style="background:#04221c;border-radius:18px 18px 0 0;padding:28px 32px 30px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="52" valign="middle"><img src="${SITE_URL}playpadellogo.jpg" width="44" height="44" alt="${
    escapeHtml(club)
  }" style="display:block;width:44px;height:44px;border:0;border-radius:10px"></td>
<td valign="middle" style="padding-left:10px"><div style="font-size:13px;font-weight:bold;letter-spacing:1px;color:#ffffff;text-transform:uppercase">${
    escapeHtml(club)
  }</div><div style="font-size:10px;font-weight:bold;letter-spacing:1.5px;color:#54f653;text-transform:uppercase">${
    escapeHtml(tournament)
  }</div></td>
</tr></table>
<div style="margin-top:28px;font-size:11px;font-weight:bold;letter-spacing:2px;color:#54f653;text-transform:uppercase">${
    escapeHtml(message.eyebrow)
  }</div>
<h1 style="margin:8px 0 0 0;font-size:28px;line-height:1.2;color:#ffffff;font-weight:800">${
    escapeHtml(message.title)
  }</h1>
</td></tr>

<tr><td bgcolor="#ffffff" style="background:#ffffff;padding:30px 32px 8px 32px">
<p style="margin:0 0 6px 0;font-size:16px;color:#0b2a24;font-weight:bold">Olá ${
    firstName || name
  }!</p>
<p style="margin:0 0 22px 0;font-size:15px;line-height:1.6;color:#29443d">${
    escapeHtml(message.text)
  }</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6faf8;border:1px solid #e3ece8;border-radius:14px">
<tr><td style="padding:18px 20px 8px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#5b726b;text-transform:uppercase">Referência</td>
<td align="right"><span style="display:inline-block;padding:4px 10px;border-radius:20px;background:${tone.bg};border:1px solid ${tone.border};color:${tone.fg};font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px">${
    escapeHtml(message.badge)
  }</span></td>
</tr></table>
<div style="margin:6px 0 10px 0;font-family:'Courier New',monospace;font-size:22px;font-weight:bold;color:#04221c;letter-spacing:1px">${
    escapeHtml(reference)
  }</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${registrationRows}
</table>
</td></tr>
</table>

<div style="margin:26px 0 12px 0;font-size:11px;font-weight:bold;letter-spacing:2px;color:#0b6b3a;text-transform:uppercase">${
    escapeHtml(message.stepsTitle)
  }</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps}</table>
</td></tr>

<tr><td bgcolor="#ffffff" align="center" style="background:#ffffff;padding:14px 32px 30px 32px">
${
    message.tone === "success"
      ? statusBlock + contactBlock
      : contactBlock + statusBlock
  }
${phoneLine}
</td></tr>

<tr><td bgcolor="#04221c" align="center" style="background:#04221c;border-radius:0 0 18px 18px;padding:22px 32px">
<p style="margin:0 0 6px 0;font-size:12px;color:#c7d6d1"><a href="${SITE_URL}" style="color:#54f653;text-decoration:none;font-weight:bold">${
    escapeHtml(tournament)
  }</a> · ${escapeHtml(club)}</p>
<p style="margin:0;font-size:11px;line-height:1.5;color:#7f9890">Mensagem automática sobre a tua inscrição. Por favor, não respondas a este email.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return {
    subject: `${message.subject} — ${tournament}`,
    body,
  };
}
