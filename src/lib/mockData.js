export function brl(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function dataBR(iso) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function totalDoc(itens, desconto = 0) {
  const bruto = itens.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0)
  return bruto - (desconto || 0)
}

export function nivelEstoque(produto) {
  if (produto.estoque <= 0) return 'sem'
  if (produto.estoque <= produto.minimo) return 'baixo'
  return 'normal'
}

export const produtos = [
  { id: 1, nome: 'Arroz Tipo 1 5kg', sku: 'ARZ-001', grupo: 'Mercearia', estoque: 4, minimo: 10, status: 'ativo', vendidos30d: 58 },
  { id: 2, nome: 'Óleo de Soja 900ml', sku: 'OLE-002', grupo: 'Mercearia', estoque: 0, minimo: 8, status: 'ativo', vendidos30d: 41 },
  { id: 3, nome: 'Detergente Neutro', sku: 'DET-003', grupo: 'Limpeza', estoque: 32, minimo: 10, status: 'ativo', vendidos30d: 27 },
  { id: 4, nome: 'Refrigerante Cola 2L', sku: 'REF-004', grupo: 'Bebidas', estoque: 18, minimo: 15, status: 'ativo', vendidos30d: 63 },
  { id: 5, nome: 'Sabonete em Barra', sku: 'SAB-005', grupo: 'Higiene', estoque: 5, minimo: 12, status: 'ativo', vendidos30d: 19 },
  { id: 6, nome: 'Papel Higiênico 12un', sku: 'PAP-006', grupo: 'Higiene', estoque: 40, minimo: 10, status: 'ativo', vendidos30d: 35 },
  { id: 7, nome: 'Feijão Carioca 1kg', sku: 'FEI-007', grupo: 'Mercearia', estoque: 22, minimo: 10, status: 'ativo', vendidos30d: 0 },
  { id: 8, nome: 'Água Sanitária 1L', sku: 'AGS-008', grupo: 'Limpeza', estoque: 15, minimo: 10, status: 'inativo', vendidos30d: 0 },
]

export const vendas = [
  {
    id: 101,
    numero: 'V-1051',
    cliente: 'Mercado Boa Vista',
    data: '2026-08-10',
    status: 'concluida',
    desconto: 5,
    itens: [{ quantidade: 10, precoUnitario: 22 }],
  },
  {
    id: 102,
    numero: 'V-1052',
    cliente: 'Padaria Central',
    data: '2026-08-10',
    status: 'concluida',
    desconto: 0,
    itens: [{ quantidade: 6, precoUnitario: 14 }],
  },
  {
    id: 103,
    numero: 'V-1050',
    cliente: 'João Pereira',
    data: '2026-08-09',
    status: 'concluida',
    desconto: 0,
    itens: [{ quantidade: 3, precoUnitario: 8 }],
  },
  {
    id: 104,
    numero: 'V-1049',
    cliente: 'Mercadinho Sol',
    data: '2026-08-08',
    status: 'concluida',
    desconto: 10,
    itens: [{ quantidade: 20, precoUnitario: 18 }],
  },
  {
    id: 105,
    numero: 'V-1048',
    cliente: 'Ana Souza',
    data: '2026-08-08',
    status: 'cancelada',
    desconto: 0,
    itens: [{ quantidade: 2, precoUnitario: 30 }],
  },
]

export const compras = [
  {
    id: 201,
    numero: 'C-320',
    fornecedor: 'Distribuidora Rio',
    data: '2026-08-09',
    status: 'recebida',
    itens: [{ quantidade: 50, precoUnitario: 14 }],
  },
  {
    id: 202,
    numero: 'C-319',
    fornecedor: 'Atacado Sul',
    data: '2026-08-07',
    status: 'recebida',
    itens: [{ quantidade: 30, precoUnitario: 9 }],
  },
]

export const maisVendidos = [...produtos]
  .sort((a, b) => b.vendidos30d - a.vendidos30d)
  .map((p) => ({ id: p.id, nome: p.nome, grupo: p.grupo, vendidos30d: p.vendidos30d }))

export const vendasPorDia = [
  { dia: '04/08', vendas: 3200, compras: 1800 },
  { dia: '05/08', vendas: 2800, compras: 0 },
  { dia: '06/08', vendas: 4100, compras: 2600 },
  { dia: '07/08', vendas: 3600, compras: 3100 },
  { dia: '08/08', vendas: 3900, compras: 0 },
  { dia: '09/08', vendas: 2400, compras: 1500 },
  { dia: '10/08', vendas: 3300, compras: 0 },
]

export const vendasPorGrupo = [
  { grupo: 'Mercearia', valor: 12400 },
  { grupo: 'Bebidas', valor: 8600 },
  { grupo: 'Limpeza', valor: 5200 },
  { grupo: 'Higiene', valor: 4100 },
]