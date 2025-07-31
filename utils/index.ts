
/**
 * Cria URL de página baseada no nome com parâmetros opcionais
 * @param pageName Nome da página
 * @param params Parâmetros de query string
 * @returns URL formatada
 */
export function createPageUrl(pageName: string, params: Record<string, string> = {}) {
    let url = '/' + pageName.toLowerCase().replace(/ /g, '-');
    const query = new URLSearchParams(params).toString();
    if (query) {
      url += '?' + query;
    }
    return url;
}
