/** BI PCP: mesmo Worker e mesma sessão CENTRAL do modelo Zootécnico. */
const APP_CONFIG = Object.freeze({
  mode: "api-cloudflare",
  API_URL: "https://api-bi-granja.controladoriagb05.workers.dev",
  endpoints: Object.freeze({
    health: "/api/pcp/health",
    catalogo: "/api/pcp-modelo/painel/catalogo",
    filtros: "/api/pcp-modelo/painel/filtros",
    dados: "/api/pcp-modelo/painel/dados",
    modelo: "/api/pcp-modelo/tabelas",
    medidas: "/api/pcp-modelo/medidas",
    tabelaModelo: "/api/pcp-modelo/dados/",
    sessao: "/api/pcp-modelo/sessao",
    admin: "/api/pcp-modelo/admin/configuracao"
  })
});
