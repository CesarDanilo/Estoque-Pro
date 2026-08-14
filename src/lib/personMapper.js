/**
 * Converte e sanitiza o objeto do formulário para o payload
 * esperado pelo PersonController (rotas /person).
 */
export function personToApi(pessoa) {
  // Trata o documento caso venha do composable ou do input direto
  const docValue =
    typeof pessoa.document === 'object' && pessoa.document !== null
      ? pessoa.document.value
      : pessoa.document

  const documentoLimpo = String(docValue || '').replace(/\D/g, '')
  const telefoneLimpo = String(pessoa.phone || '').replace(/\D/g, '')
  const cepLimpo = String(pessoa.zip_code || '').replace(/\D/g, '')

  const ehPessoaFisica = pessoa.type === 'individual'

  return {
    category: pessoa.category || null,
    type: pessoa.type || null,
    name: pessoa.name || null,
    document: documentoLimpo || null,

    // Exclusivos de Pessoa Jurídica — nunca enviados para Pessoa Física
    trade_name: ehPessoaFisica ? null : pessoa.trade_name || null,
    state_registration: ehPessoaFisica ? null : pessoa.state_registration || null,
    contact_person: ehPessoaFisica ? null : pessoa.contact_person || null,

    // Exclusivos de Pessoa Física — nunca enviados para Pessoa Jurídica
    gender: ehPessoaFisica ? pessoa.gender || null : null,
    birth_date: ehPessoaFisica ? pessoa.birth_date || null : null,

    phone: telefoneLimpo || null,
    email: pessoa.email || null,

    zip_code: cepLimpo || null,
    street: pessoa.street || null,
    number: pessoa.number || null,
    complement: pessoa.complement || null,
    neighborhood: pessoa.neighborhood || null,
    city: pessoa.city || null,
    state: pessoa.state || null,

    active: Boolean(pessoa.active ?? true),
  }
}

/**
 * Normaliza a resposta da API para o formato esperado pelo estado reativo
 * do formulário e da listagem.
 */
export function personFromApi(p) {
  if (!p) return {}

  return {
    id: p.id,
    category: p.category || 'client',
    type: p.type || 'individual',
    name: p.name || '',
    document: p.document || p.cnpj || p.cpf || '',

    trade_name: p.trade_name || '',
    state_registration: p.state_registration || '',
    contact_person: p.contact_person || '',

    gender: p.gender || '',
    birth_date: p.birth_date || '',

    phone: p.phone || '',
    email: p.email || '',

    zip_code: p.zip_code || '',
    street: p.street || '',
    number: p.number || '',
    complement: p.complement || '',
    neighborhood: p.neighborhood || '',
    city: p.city || '',
    state: p.state || '',

    active: Boolean(p.active),
    created_at: p.created_at?.slice(0, 10) || '',
  }
}
