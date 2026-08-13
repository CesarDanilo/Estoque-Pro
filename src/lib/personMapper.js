export function personToApi(pessoa) {
  // 🔴 CORRIGIDO: o backend valida os campos "cnpj" (14 dígitos) e "cpf"
  // (11 dígitos) separadamente — não existe campo "document" na validação
  // do Laravel. Enviamos o valor digitado no campo correto de acordo com o
  // tamanho do documento (11 = CPF, 14 = CNPJ).
  const documentoLimpo = (pessoa.documento ?? '').replace(/\D/g, '')
  const ehCnpj = documentoLimpo.length === 14
  const ehCpf = documentoLimpo.length === 11

  return {
    type: pessoa.type,
    name: pessoa.nome,
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
