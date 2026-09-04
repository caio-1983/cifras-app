/**
 * Extrai o tom do TÍTULO do documento no Drive (`AO ÚNICO_Ab`,
 * `CAMINHO NO DESERTO - TOM_G`, `SUBLIME_C_masculino`).
 *
 * Por que existe: 18 dos 421 arquivos do acervo não trazem `Tom:` nenhum no
 * corpo — o tom vive só no nome do arquivo, que é metadado editorial que o
 * usuário manteve à mão por anos. Adivinhar o tom pelo CONTEÚDO (primeiro
 * acorde, acorde mais frequente) seria chute: uma música em Am começa em F
 * com frequência, e errar o tom armazenado corrompe toda transposição
 * futura.
 *
 * Fica fora do importador de propósito: `importarCifraCrua` recebe o tom
 * pronto, de quem sabe de onde ele veio. Assim a inferência é uma decisão
 * visível do lote, não um comportamento escondido do importador.
 */

// Um segmento é tom quando é SÓ um tom: letra A-G, acidente opcional,
// "m" opcional. "A MAIOR HONRA" não é segmento de tom porque não é só isso.
const RE_TOM = /^([A-G])([#b])?(m)?$/;
const RE_MARCADOR_TOM = /^tom$/i;

/**
 * Quebra só em `_` e ` - ` — os separadores que o acervo usa para colar
 * metadado ao título. Quebrar em espaço acharia "A" dentro de "A MAIOR
 * HONRA" e inventaria um tom de Lá para uma música que não é.
 */
function segmentos(titulo: string): string[] {
  return titulo
    .split(/_|\s+-\s+/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/**
 * Devolve o tom, ou `undefined` quando o título não traz um — inclusive
 * quando traz mais de um candidato diferente, caso em que escolher seria
 * chute. Um `TOM` explícito antes do valor (`... - TOM_G`) tem prioridade
 * sobre um candidato solto.
 */
export function tomDoTituloDrive(titulo: string): string | undefined {
  const partes = segmentos(titulo);

  for (let i = 0; i < partes.length - 1; i++) {
    if (RE_MARCADOR_TOM.test(partes[i]!) && RE_TOM.test(partes[i + 1]!)) {
      return partes[i + 1];
    }
  }

  const candidatos = [...new Set(partes.filter((p) => RE_TOM.test(p)))];
  return candidatos.length === 1 ? candidatos[0] : undefined;
}
