import { z } from 'zod'

/**
 * Schema de validação estrutural do formulário de Pessoas.
 *
 * Regras de negócio específicas (documento válido por dígito verificador,
 * "fornecedor precisa ser pessoa jurídica") ficam fora daqui e são
 * verificadas manualmente no componente, pois dependem de estado reativo
 * (ex.: tipo de documento detectado) que o Zod não teria acesso direto.
 */
export const pessoaSchema = z
  .object({
    categoria: z.enum(['client', 'supplier'], {
      errorMap: () => ({ message: 'Selecione se é cliente ou fornecedor.' }),
    }),
    type: z.enum(['individual', 'company'], {
      errorMap: () => ({ message: 'Selecione o tipo (física ou jurídica).' }),
    }),
    nome: z.string().trim().min(3, 'Informe o nome completo (mínimo 3 letras).').max(120),
    documento: z.string().min(11, 'Informe um CPF ou CNPJ válido.').max(14),
    telefone: z.string().max(11).optional().or(z.literal('')),
    email: z.string().max(254).optional().or(z.literal('')),

    // Exclusivos de Pessoa Jurídica
    nomeFantasia: z.string().max(120).optional().or(z.literal('')),
    inscricaoEstadual: z.string().max(20).optional().or(z.literal('')),
    pessoaContato: z.string().max(120).optional().or(z.literal('')),

    // Exclusivos de Pessoa Física
    genero: z.enum(['female', 'male', 'other']).nullable().optional(),
    nascimento: z.string().nullable().optional(),

    // Endereço (todos opcionais)
    cep: z.string().max(8).optional().or(z.literal('')),
    logradouro: z.string().max(160).optional().or(z.literal('')),
    numero: z.string().max(20).optional().or(z.literal('')),
    complemento: z.string().max(60).optional().or(z.literal('')),
    bairro: z.string().max(80).optional().or(z.literal('')),
    cidade: z.string().max(80).optional().or(z.literal('')),
    uf: z.string().max(2).optional().or(z.literal('')),

    ativo: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Informe um e-mail válido.',
      })
    }
    if (data.cep && data.cep.length !== 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cep'],
        message: 'CEP deve conter 8 dígitos.',
      })
    }
    if (data.uf && !/^[A-Z]{2}$/.test(data.uf)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['uf'],
        message: 'Informe a UF com 2 letras.',
      })
    }
    if (data.categoria === 'supplier' && data.type !== 'company') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message: 'Fornecedor deve ser cadastrado como pessoa jurídica.',
      })
    }
  })
