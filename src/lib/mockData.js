export function brl(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function dataBR(data) {
  if (!data) return '-'

  // Trata caso a data venha com hora junto (ISO string: 2026-08-14T10:00:00Z)
  const dataApenas = data.includes('T') ? data.split('T')[0] : data

  const partes = dataApenas.split('-')
  if (partes.length !== 3) return data

  return partes.reverse().join('/')
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
  {
    id: 1,
    nome: 'Arroz Tipo 1 5kg',
    sku: 'ARZ-001',
    grupo: 'Mercearia',
    estoque: 4,
    minimo: 10,
    status: 'ativo',
    vendidos30d: 58,
  },
  {
    id: 2,
    nome: 'Óleo de Soja 900ml',
    sku: 'OLE-002',
    grupo: 'Mercearia',
    estoque: 0,
    minimo: 8,
    status: 'ativo',
    vendidos30d: 41,
  },
  {
    id: 3,
    nome: 'Detergente Neutro',
    sku: 'DET-003',
    grupo: 'Limpeza',
    estoque: 32,
    minimo: 10,
    status: 'ativo',
    vendidos30d: 27,
  },
  {
    id: 4,
    nome: 'Refrigerante Cola 2L',
    sku: 'REF-004',
    grupo: 'Bebidas',
    estoque: 18,
    minimo: 15,
    status: 'ativo',
    vendidos30d: 63,
  },
  {
    id: 5,
    nome: 'Sabonete em Barra',
    sku: 'SAB-005',
    grupo: 'Higiene',
    estoque: 5,
    minimo: 12,
    status: 'ativo',
    vendidos30d: 19,
  },
  {
    id: 6,
    nome: 'Papel Higiênico 12un',
    sku: 'PAP-006',
    grupo: 'Higiene',
    estoque: 40,
    minimo: 10,
    status: 'ativo',
    vendidos30d: 35,
  },
  {
    id: 7,
    nome: 'Feijão Carioca 1kg',
    sku: 'FEI-007',
    grupo: 'Mercearia',
    estoque: 22,
    minimo: 10,
    status: 'ativo',
    vendidos30d: 0,
  },
  {
    id: 8,
    nome: 'Água Sanitária 1L',
    sku: 'AGS-008',
    grupo: 'Limpeza',
    estoque: 15,
    minimo: 10,
    status: 'inativo',
    vendidos30d: 0,
  },
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

export const pessoas = [
  {
    id: 1,
    nome: 'Mercado Boa Vista',
    documento: '12.345.678/0001-90',
    telefone: '(11) 4002-8922',
    email: 'contato@boavista.com',
    grupo: 'Cliente',
    status: 'ativo',
    cadastro: '2025-02-14',
  },
  {
    id: 2,
    nome: 'Padaria Central',
    documento: '98.765.432/0001-10',
    telefone: '(11) 4003-1234',
    email: 'padaria@central.com',
    grupo: 'Cliente',
    status: 'ativo',
    cadastro: '2025-03-02',
  },
  {
    id: 3,
    nome: 'João Pereira',
    documento: '123.456.789-00',
    telefone: '(11) 98888-1122',
    email: 'joao.pereira@gmail.com',
    grupo: 'Cliente',
    status: 'ativo',
    cadastro: '2025-04-18',
  },
  {
    id: 4,
    nome: 'Distribuidora Rio',
    documento: '11.222.333/0001-44',
    telefone: '(21) 3344-5566',
    email: 'vendas@distrio.com',
    grupo: 'Fornecedor',
    status: 'ativo',
    cadastro: '2024-11-09',
  },
  {
    id: 5,
    nome: 'Atacado Sul',
    documento: '22.333.444/0001-55',
    telefone: '(51) 3355-6677',
    email: 'comercial@atacadosul.com',
    grupo: 'Fornecedor',
    status: 'ativo',
    cadastro: '2024-09-27',
  },
  {
    id: 6,
    nome: 'Ana Souza',
    documento: '234.567.890-11',
    telefone: '(11) 97777-3344',
    email: 'ana.souza@gmail.com',
    grupo: 'Cliente',
    status: 'inativo',
    cadastro: '2025-01-05',
  },
  {
    id: 7,
    nome: 'Juliana Prado',
    documento: '345.678.901-22',
    telefone: '(11) 96666-5566',
    email: 'juliana.prado@estoquepro.com',
    grupo: 'Colaborador',
    status: 'ativo',
    cadastro: '2024-08-01',
  },
  {
    id: 8,
    nome: 'Carlos Lima',
    documento: '456.789.012-33',
    telefone: '(11) 95555-7788',
    email: 'carlos.lima@estoquepro.com',
    grupo: 'Colaborador',
    status: 'ativo',
    cadastro: '2024-08-15',
  },
  {
    id: 9,
    nome: 'Mercadinho Sol',
    documento: '33.444.555/0001-66',
    telefone: '(11) 4004-9988',
    email: 'sol@mercadinho.com',
    grupo: 'Cliente',
    status: 'ativo',
    cadastro: '2025-05-20',
  },
  {
    id: 10,
    nome: 'Fornecedora Nordeste',
    documento: '44.555.666/0001-77',
    telefone: '(81) 3366-8899',
    email: 'contato@fornordeste.com',
    grupo: 'Fornecedor',
    status: 'inativo',
    cadastro: '2024-06-11',
  },
  {
    id: 11,
    nome: 'Pedro Santos',
    documento: '567.890.123-44',
    telefone: '(11) 94444-2233',
    email: 'pedro.santos@gmail.com',
    grupo: 'Cliente',
    status: 'ativo',
    cadastro: '2025-06-30',
  },
  {
    id: 12,
    nome: 'Mariana Costa',
    documento: '678.901.234-55',
    telefone: '(11) 93333-4455',
    email: 'mariana.costa@estoquepro.com',
    grupo: 'Colaborador',
    status: 'ativo',
    cadastro: '2024-10-03',
  },
]
