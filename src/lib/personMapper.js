/**
 * Converte o formato interno do formulário (campos em português) para o
 * payload esperado pelo PersonController (rotas /person).
 *
 * Importante: o backend valida o campo "document" (CPF ou CNPJ sem máscara),
 * não "cnpj"/"cpf" separados — essa separação existe apenas nas rotas de
 * Fornecedores (/suppliers), que são um recurso diferente.
 */
export function personToApi(pessoa) {
  const documentoLimpo = (pessoa.documento ?? '').replace(/\D/g, '')
  const ehPessoaFisica = pessoa.type === 'individual'

  return {
    category: pessoa.categoria,
    type: pessoa.type,
    name: pessoa.nome,
    document: documentoLimpo || null,

    // Exclusivos de Pessoa Jurídica — nunca enviados para Pessoa Física
    trade_name: ehPessoaFisica ? null : pessoa.nomeFantasia || null,
    state_registration: ehPessoaFisica ? null : pessoa.inscricaoEstadual || null,
    contact_person: ehPessoaFisica ? null : pessoa.pessoaContato || null,

    // Exclusivos de Pessoa Física — nunca enviados para Pessoa Jurídica
    gender: ehPessoaFisica ? pessoa.genero || null : null,
    birth_date: ehPessoaFisica ? pessoa.nascimento || null : null,

    phone: pessoa.telefone || null,
    email: pessoa.email || null,

    zip_code: pessoa.cep || null,
    street: pessoa.logradouro || null,
    number: pessoa.numero || null,
    complement: pessoa.complemento || null,
    neighborhood: pessoa.bairro || null,
    city: pessoa.cidade || null,
    state: pessoa.uf || null,

    active: pessoa.ativo ?? true,
  }
}

/**
 * Converte a resposta da API (campos em inglês) para o formato interno
 * usado pelo formulário e pela listagem (campos em português).
 */
export function personFromApi(p) {
  return {
    id: p.id,
    categoria: p.category,
    type: p.type,
    nome: p.name,
    documento: p.document || p.cnpj || p.cpf || '',

    nomeFantasia: p.trade_name,
    inscricaoEstadual: p.state_registration,
    pessoaContato: p.contact_person,

    genero: p.gender,
    nascimento: p.birth_date,

    telefone: p.phone,
    email: p.email,

    cep: p.zip_code,
    logradouro: p.street,
    numero: p.number,
    complemento: p.complement,
    bairro: p.neighborhood,
    cidade: p.city,
    uf: p.state,

    status: p.active ? 'ativo' : 'inativo',
    ativo: p.active,
    cadastro: p.created_at?.slice(0, 10),
  }
}
