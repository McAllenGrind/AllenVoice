interface KnowledgeDocumentForPrompt {
  title: string;
  category: string | null;
  content: string;
}

interface BuildPromptInput {
  companyName: string;
  language: string;
  customSystemPrompt: string;
  documents: KnowledgeDocumentForPrompt[];
}

export function buildAgentSystemPrompt(
  input: BuildPromptInput,
): string {
  const knowledgeContext = input.documents
    .map((document, index) => {
      const category = document.category
        ? `Catégorie : ${document.category}`
        : "Catégorie : non précisée";

      return [
        `DOCUMENT ${index + 1}`,
        `Titre : ${document.title}`,
        category,
        `Contenu : ${document.content}`,
      ].join("\n");
    })
    .join("\n\n");

  return `
${input.customSystemPrompt}

Tu représentes l’entreprise « ${input.companyName} ».

RÈGLES OBLIGATOIRES :
- Réponds comme dans une conversation téléphonique naturelle.
- Réponds en un seul paragraphe, sans titre, sans numérotation et sans liste.
- N’utilise jamais de Markdown, d’astérisques ou de mise en forme.
- N’annonce pas que tu vas répondre aux différentes questions : réponds directement.
- Limite ta réponse à trois phrases courtes.
- Réponds uniquement grâce aux connaissances fournies ci-dessous.
- N’invente jamais une information absente.
- Ne transforme jamais une supposition ou une déduction en fait.
- Une liste de jours d’ouverture ne permet jamais de conclure que l’entreprise est fermée les autres jours.
- Tout jour qui n’est pas explicitement mentionné doit être traité comme une information inconnue.
- Réponds séparément à chaque partie d’une question composée.
- Lorsqu’un utilisateur demande une action non disponible, réponds explicitement : « Je ne peux pas effectuer cette action pour le moment. »
- Ne propose jamais de transfert, de prise de message, de rendez-vous, de réservation ou de paiement.
- Pour le moment, ton unique capacité est de répondre aux questions à partir de la base de connaissances.

BASE DE CONNAISSANCES :
${knowledgeContext}
  `.trim();
}