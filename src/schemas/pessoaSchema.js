import { z } from 'zod'

export const pessoaSchema = z
  .object({
    category: z.enum(['client', 'supplier'], {
      required_error: 'Selecione se é cliente ou fornecedor.',
      invalid_type_error: 'Selecione se é cliente ou fornecedor.',
    }),
    type: z.enum(['individual', 'company'], {
      required_error: 'Selecione o tipo (física ou jurídica).',
      invalid_type_error: 'Selecione o tipo (física ou jurídica).',
    }),
    name: z
      .string()
      .trim()
      .min(3, 'Informe o nome completo (mínimo 3 letras).')
      .max(120, 'O nome deve ter no máximo 120 caracteres.'),
    document: z
      .string()
      .min(11, 'Informe um CPF ou CNPJ válido.')
      .max(14, 'Informe um CPF ou CNPJ válido.'),
    phone: z.string().max(11, 'Telefone inválido.').nullable().optional().or(z.literal('')),
    email: z.string().max(254, 'E-mail muito longo.').nullable().optional().or(z.literal('')),

    // Exclusivos de Pessoa Jurídica
    trade_name: z.string().max(120).nullable().optional().or(z.literal('')),
    state_registration: z.string().max(20).nullable().optional().or(z.literal('')),
    contact_person: z.string().max(120).nullable().optional().or(z.literal('')),

    // Exclusivos de Pessoa Física
    gender: z.enum(['female', 'male', 'other']).nullable().optional().or(z.literal('')),
    birth_date: z.string().nullable().optional().or(z.literal('')),

    // Endereço
    zip_code: z.string().max(8).nullable().optional().or(z.literal('')),
    street: z.string().max(160).nullable().optional().or(z.literal('')),
    number: z.string().max(20).nullable().optional().or(z.literal('')),
    complement: z.string().max(60).nullable().optional().or(z.literal('')),
    neighborhood: z.string().max(80).nullable().optional().or(z.literal('')),
    city: z.string().max(80).nullable().optional().or(z.literal('')),
    state: z.string().max(2).nullable().optional().or(z.literal('')),

    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    // Validação de E-mail
    if (data.email && data.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
      if (!emailRegex.test(data.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: 'Informe um e-mail válido.',
        })
      }
    }

    // Validação de CEP
    if (data.zip_code && data.zip_code.trim() !== '') {
      if (data.zip_code.length !== 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['zip_code'],
          message: 'CEP deve conter 8 dígitos.',
        })
      }
    }

    // Validação de UF (Estado)
    if (data.state && data.state.trim() !== '') {
      if (!/^[A-Za-z]{2}$/.test(data.state)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['state'],
          message: 'Informe a UF com 2 letras.',
        })
      }
    }

    // Validação de CPF/CNPJ conforme tipo da pessoa
    if (data.document && data.document.trim() !== '') {
      if (data.type === 'individual' && data.document.length !== 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['document'],
          message: 'CPF deve conter 11 dígitos.',
        })
      } else if (data.type === 'company' && data.document.length !== 14) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['document'],
          message: 'CNPJ deve conter 14 dígitos.',
        })
      }
    }

    // Regra de Negócio: Fornecedor só pode ser Pessoa Jurídica
    if (data.category === 'supplier' && data.type !== 'company') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message: 'Fornecedor deve ser cadastrado como pessoa jurídica.',
      })
    }
  })
