export function personToApi(pessoa) {
  return {
    type: pessoa.type,
    name: pessoa.nome,
    document: pessoa.documento,
    gender: pessoa.genero || null,
    birth_date: pessoa.nascimento || null,
    phone: pessoa.telefone,
    email: pessoa.email || null,
    zip_code: pessoa.cep || null,
    city: pessoa.cidade || null,
    address: pessoa.endereco || null,
    active: pessoa.ativo ?? true,
  }
}

export function personFromApi(p) {
  return {
    id: p.id,
    type: p.type,
    nome: p.name,
    documento: p.document,
    genero: p.gender,
    nascimento: p.birth_date,
    telefone: p.phone,
    email: p.email,
    cep: p.zip_code,
    cidade: p.city,
    endereco: p.address,
    status: p.active ? 'ativo' : 'inativo',
    ativo: p.active,
    cadastro: p.created_at?.slice(0, 10),
  }
}