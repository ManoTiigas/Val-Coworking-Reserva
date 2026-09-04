# Val Coworking — Reservas

Sistema de reservas de espaços e contratação de planos do Val Coworking.

## O que o projeto oferece

- Reserva de salas, rooftop e espaços compartilhados.
- Escolha de data, modalidade e horário.
- Pagamento por Pix ou cartão via Mercado Pago.
- Contratação de planos de endereço fiscal e Plano Premium.
- Assinatura de contrato para planos via Clicksign.
- Painel administrativo para acompanhar reservas, pagamentos, contratos e cancelamentos.

## Rotas

| Rota | Uso |
| --- | --- |
| `/` | Reservas de espaços |
| `/planos` | Planos e contrato |
| `/admin` | Área administrativa |

## Desenvolvimento local

O projeto é estático e pode ser iniciado com qualquer servidor HTTP. Exemplo:

```bash
npx serve .
```

Depois, abra a URL exibida pelo comando.

## Estrutura

```text
work/
  index.html       # fluxo de reservas
  planos.html      # fluxo de planos
  admin.html       # painel administrativo
  app.js           # regras do fluxo de reservas
  planos.js        # regras do fluxo de planos
  admin.js         # regras do painel
  styles.css       # estilos públicos
  admin.css        # estilos do painel
  images/          # identidade visual
vercel.json        # rotas para produção
```

## Integrações

- **Supabase:** dados, autenticação, Storage e Edge Functions.
- **Mercado Pago:** Pix e cartão.
- **Clicksign:** geração e assinatura de contratos dos planos.
- **Vercel:** hospedagem e deploy automático pela branch `main`.

## Segurança

Nunca inclua tokens, chaves de API, contratos privados ou dados de clientes no Git. Configure as credenciais somente nas variáveis de ambiente da Vercel e nos secrets do Supabase.

## Documentação privada

A pasta `docs/` existe para anotações operacionais privadas. Ela está no `.gitignore` e não é publicada no GitHub.
