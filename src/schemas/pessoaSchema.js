import { z } from 'zod'

export const pessoaSchema = z
  .object({
    nome: z.string().trim().min(3, 'Informe o nome completo (mínimo 3 letras).').max(120),
    documento: z.string().min(11, 'Informe um CPF ou CNPJ válido.').max(14),
    telefone: z.string().min(10, 'Informe um telefone com DDD.').max(11),
    email: z.string().max(254).optional().or(z.literal('')),
    type: z.enum(['individual', 'company'], {
      errorMap: () => ({ message: 'Selecione o tipo (física ou jurídica).' }),
    }),
    genero: z.enum(['female', 'male', 'other']).nullable().optional(),
    nascimento: z.string().nullable().optional(),
    cep: z.string().max(8).optional().or(z.literal('')),
    cidade: z.string().max(80).optional(),
    endereco: z.string().max(160).optional(),
    ativo: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Informe um e-mail válido.' })
    }
    if (data.cep && data.cep.length !== 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cep'], message: 'CEP deve conter 8 dígitos.' })
    }
  })