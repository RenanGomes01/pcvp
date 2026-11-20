/**
 * Ponte entre os painéis (Sheet) e a moldura da tela (ScreenFrame) para o
 * Safari 26 do iOS pintar a área da Ilha Dinâmica / barra de gestos.
 *
 * O Safari amostra UM ponto no centro de cada borda (≈4px para dentro), pega o
 * primeiro elemento `position: fixed` ali e usa a cor dele atrás da barra de
 * status. Essa escolha fica em cache e só é refeita quando um elemento fixo
 * entra ou sai na borda; com camadas do tamanho da tela (fundo escurecido do
 * painel) ele ainda prefere manter a cor anterior. Depois que um painel fecha,
 * a borda pode ficar "presa" sem cor opaca e o conteúdo aparece por trás ao
 * rolar, até recarregar o Safari.
 *
 * Ao terminar de fechar um painel, disparamos este evento e a moldura recria
 * as faixas de topo/base (novo elemento fixo na borda → o Safari amostra de novo).
 */
export const SHEET_CLOSED_EVENT = "pcvp:sheet-closed";

export function notifySheetClosed() {
  window.dispatchEvent(new Event(SHEET_CLOSED_EVENT));
}
