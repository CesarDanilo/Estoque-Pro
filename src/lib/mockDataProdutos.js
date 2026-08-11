export function brl(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export const grupos = [
  { id: 1, nome: 'Bebidas' },
  { id: 2, nome: 'Alimentos' },
  { id: 3, nome: 'Limpeza' },
  { id: 4, nome: 'Higiene' },
]

export const subgrupos = [
  { id: 1, nome: 'Refrigerantes', grupo: 'Bebidas' },
  { id: 2, nome: 'Sucos', grupo: 'Bebidas' },
  { id: 3, nome: 'Cervejas', grupo: 'Bebidas' },
  { id: 4, nome: 'Massas', grupo: 'Alimentos' },
  { id: 5, nome: 'Enlatados', grupo: 'Alimentos' },
  { id: 6, nome: 'Multiuso', grupo: 'Limpeza' },
  { id: 7, nome: 'Sabonetes', grupo: 'Higiene' },
]

export const marcas = [
  { id: 1, nome: 'Coca-Cola' },
  { id: 2, nome: 'Ambev' },
  { id: 3, nome: 'Nestlé' },
  { id: 4, nome: 'Unilever' },
  { id: 5, nome: 'Ypê' },
]

export const produtos = [
  { id: 1, nome: 'Coca-Cola 2L', sku: 'BEB-0001', grupo: 'Bebidas', subgrupo: 'Refrigerantes', marca: 'Coca-Cola', preco: 9.9, estoque: 42, minimo: 10, status: 'ativo' },
  { id: 2, nome: 'Suco de Laranja 1L', sku: 'BEB-0002', grupo: 'Bebidas', subgrupo: 'Sucos', marca: 'Nestlé', preco: 7.5, estoque: 6, minimo: 10, status: 'ativo' },
  { id: 3, nome: 'Cerveja Pilsen 350ml', sku: 'BEB-0003', grupo: 'Bebidas', subgrupo: 'Cervejas', marca: 'Ambev', preco: 3.2, estoque: 0, minimo: 20, status: 'ativo' },
  { id: 4, nome: 'Macarrão Espaguete 500g', sku: 'ALI-0001', grupo: 'Alimentos', subgrupo: 'Massas', marca: 'Nestlé', preco: 4.8, estoque: 58, minimo: 15, status: 'ativo' },
  { id: 5, nome: 'Milho Enlatado 200g', sku: 'ALI-0002', grupo: 'Alimentos', subgrupo: 'Enlatados', marca: 'Nestlé', preco: 3.9, estoque: 12, minimo: 15, status: 'ativo' },
  { id: 6, nome: 'Detergente Multiuso 500ml', sku: 'LIM-0001', grupo: 'Limpeza', subgrupo: 'Multiuso', marca: 'Ypê', preco: 5.5, estoque: 30, minimo: 10, status: 'ativo' },
  { id: 7, nome: 'Sabonete Glicerina 90g', sku: 'HIG-0001', grupo: 'Higiene', subgrupo: 'Sabonetes', marca: 'Unilever', preco: 2.3, estoque: 3, minimo: 10, status: 'inativo' },
  { id: 8, nome: 'Água Mineral 500ml', sku: 'BEB-0004', grupo: 'Bebidas', subgrupo: 'Refrigerantes', marca: 'Coca-Cola', preco: 2.1, estoque: 90, minimo: 20, status: 'ativo' },
]

export function nivelEstoque(p) {
  if (p.estoque <= 0) return 'sem'
  if (p.estoque <= p.minimo) return 'baixo'
  return 'normal'
}