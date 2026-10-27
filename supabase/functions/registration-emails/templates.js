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

export function renderEmail(event, config) {
  const tournament = config.tornNome || "Torneio Clausura";
  const club = config.tornClube || "Play Padel Coop";
  const reference = "PP-" +
    event.registration_id.replace(/^ins-/, "").replace(/-p$/, "");
  const statusUrl =
    "https://sporteventos.github.io/playpadelcoop/estado-inscricao.html?ref=" +
    encodeURIComponent(reference);
  const messages = {
    registration_received: {
      title: "Pré-inscrição recebida",
      text: "A tua pré-inscrição foi recebida e está pendente de pagamento.",
      next:
        "Para confirmar a inscrição, contacta o clube e efetua o pagamento diretamente nas instalações. A inscrição só fica confirmada depois de a organização validar o pagamento.",
    },
    registration_waitlisted: {
      title: "Inscrição em lista de espera",
      text: "A tua inscrição ficou na lista de espera da categoria indicada.",
      next:
        "Não efetues qualquer pagamento enquanto estiveres na lista de espera. A organização entrará em contacto contigo se abrir uma vaga.",
    },
    registration_promoted: {
      title: "Vaga disponível para a tua inscrição",
      text:
        "A organização retirou a tua inscrição da lista de espera. A pré-inscrição está agora pendente de pagamento.",
      next:
        "Contacta o clube para efetuar o pagamento diretamente nas instalações e confirmar a inscrição. Aguarda a validação do pagamento pela organização.",
    },
    registration_confirmed: {
      title: "Inscrição confirmada",
      text: "A organização confirmou a tua inscrição no torneio.",
      next:
        "Consulta o estado da inscrição e acompanha as informações do torneio no site.",
    },
  };
  const message = messages[event.event_name];
  if (!message) throw new Error("unsupported_email_event");
  const phone = String(config.tornTelOrg || "").replace(/\D/g, "");
  const contact = phone
    ? `<p>Contacto do clube: <a href="https://wa.me/${phone}">${
      escapeHtml(config.tornTelOrg)
    }</a></p>`
    : "<p>Para esclarecimentos, contacta diretamente o clube.</p>";
  return {
    subject: `${message.title} — ${tournament}`,
    body:
      `<!doctype html><html lang="pt"><body style="font-family:Arial,sans-serif;color:#173b36;line-height:1.6">
<main style="max-width:600px;margin:auto;padding:24px">
<p><strong>${escapeHtml(club)}</strong></p><h1>${message.title}</h1>
<p>Olá ${escapeHtml(event.payload.name)}!</p><p>${message.text}</p>
<p><strong>Torneio:</strong> ${escapeHtml(tournament)}<br>
<strong>Categoria:</strong> ${escapeHtml(event.payload.category)}<br>
<strong>Referência:</strong> ${escapeHtml(reference)}</p>
<p>${message.next}</p>${contact}
<p><a href="${escapeHtml(statusUrl)}">Consultar estado da inscrição</a></p>
<p style="font-size:12px;color:#526960">Mensagem automática sobre a tua inscrição. Não respondas a este email.</p>
</main></body></html>`,
  };
}
