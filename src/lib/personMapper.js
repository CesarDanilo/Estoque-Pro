export function personToApi(pessoa) {
  // 🔴 CORRIGIDO (v2): o backend, pelo menos na validação de criação
  // (POST /person), exige o campo "document" — a suposição anterior de que
  // só "cnpj"/"cpf" seriam aceitos estava incompleta (o erro
  // "The document field is required." confirma isso). Mantemos "cpf"/"cnpj"
  // também, caso outras rotas (ex.: update) dependam deles, e enviamos
  // "document" com o valor limpo para cobrir a validação de criação.
  const documentoLimpo = (pessoa.documento ?? '').replace(/\D/g, '')
  const ehCnpj = documentoLimpo.length === 14
  const ehCpf = documentoLimpo.length === 11

  return {
    type: pessoa.type,
    name: pessoa.nome,
    document: documentoLimpo || null,
    cnpj: ehCnpj ? documentoLimpo : null,
    cpf: ehCpf ? documentoLimpo : null,
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
    // Aceita tanto o formato novo (cnpj/cpf) quanto o antigo (document),
    // para não quebrar a leitura de registros que ainda voltem no formato
    // legado da API.
    documento: p.cnpj || p.cpf || p.document || '',
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
