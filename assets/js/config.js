/** BI PCP: mesmo Worker e mesma sessão CENTRAL do modelo Zootécnico. */
const APP_CONFIG = Object.freeze({
  mode: "api-cloudflare",
  API_URL: "https://api-bi-granja.controladoriagb05.workers.dev",
  endpoints: Object.freeze({
    health: "/api/pcp/health",
    catalogo: "/api/pcp/painel/catalogo",
    filtros: "/api/pcp/painel/filtros",
    dados: "/api/pcp/painel/dados",
    modelo: "/api/pcp/tabelas",
    medidas: null,
    tabelaModelo: "/api/pcp/dados/",
    sessao: null,
    admin: null
  })
});
