import type { AppState, CompanyProfile, Job, NotificationItem, WorkerProfile } from "../lib/types";

export const functions = [
  "Garçom",
  "Bartender",
  "Auxiliar de cozinha",
  "Copeiro",
  "Recepcionista",
  "Operador de caixa",
  "Limpeza",
  "Montador de eventos",
  "Promotor"
] as const;

export const experienceLevels = [
  {
    value: "Iniciante",
    label: "Estou começando",
    description: "Liberado para vagas simples ou como auxiliar."
  },
  {
    value: "Poucas diárias",
    label: "Já fiz algumas diárias",
    description: "Tem prática inicial e precisa de orientação."
  },
  {
    value: "Experiente",
    label: "Tenho experiência",
    description: "Pode assumir a função com autonomia."
  },
  {
    value: "Profissional experiente",
    label: "Sou profissional experiente",
    description: "Indicado para vagas exigentes, urgentes e alto fluxo."
  }
] as const;

export const neighborhoods = [
  "Jurerê",
  "Canasvieiras",
  "Ingleses",
  "Centro",
  "Lagoa da Conceição",
  "Campeche"
] as const;

export const companies: CompanyProfile[] = [
  {
    id: "company-1",
    establishmentName: "Maré Alta Beach Club",
    responsibleName: "Fernanda Luz",
    cnpj: "12.345.678/0001-90",
    phone: "(48) 99911-2300",
    email: "contratacao@marealta.com.br",
    category: "Beach club",
    address: "Av. dos Búzios, 1200",
    neighborhood: "Jurerê",
    description: "Beach club com alta demanda para eventos de verão e festas ao pôr do sol.",
    logoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80",
    rating: 4.8
  },
  {
    id: "company-2",
    establishmentName: "Restaurante Ilha Norte",
    responsibleName: "Carlos Mendes",
    cnpj: "23.456.789/0001-10",
    phone: "(48) 98822-1144",
    email: "rh@ilhanorte.com.br",
    category: "Restaurante",
    address: "Rua Madre Maria Villac, 640",
    neighborhood: "Canasvieiras",
    description: "Restaurante de frutos do mar com operação reforçada na temporada.",
    logoUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=500&q=80",
    rating: 4.6
  },
  {
    id: "company-3",
    establishmentName: "Centro Eventos Floripa",
    responsibleName: "Bianca Rocha",
    cnpj: "34.567.890/0001-21",
    phone: "(48) 97733-8821",
    email: "operacao@eventosfloripa.com.br",
    category: "Agência de eventos",
    address: "Rua Felipe Schmidt, 320",
    neighborhood: "Centro",
    description: "Produção de eventos corporativos, recepções e ativações de marca.",
    logoUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=500&q=80",
    rating: 4.9
  }
];

export const workers: WorkerProfile[] = [
  {
    id: "worker-1",
    name: "Ana Carolina Souza",
    phone: "(48) 99123-4567",
    email: "ana.souza@email.com",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80",
    birthDate: "1998-04-12",
    city: "Florianópolis",
    neighborhood: "Campeche",
    functions: ["Garçom", "Recepcionista", "Promotor"],
    functionExperience: [
      { function: "Garçom", level: "Profissional experiente", months: 60, acceptsAssistant: false, verified: true },
      { function: "Recepcionista", level: "Experiente", months: 24, acceptsAssistant: false, verified: true },
      { function: "Promotor", level: "Experiente", months: 18, acceptsAssistant: true, verified: false }
    ],
    experience: "5 temporadas em eventos, restaurantes e beach clubs.",
    description: "Atendimento ágil, boa comunicação e disponibilidade para turnos noturnos.",
    availability: "Noites, fins de semana e feriados",
    hasTransport: true,
    maxDistanceKm: 22,
    rating: 4.9,
    completedJobs: 42,
    attendanceRate: 98,
    punctualityRate: 96,
    cancellations: 1,
    reviews: [
      { id: "review-1", authorName: "Maré Alta Beach Club", rating: 5, comment: "Excelente postura e atendimento." }
    ],
    verified: true
  },
  {
    id: "worker-2",
    name: "Rafael Pires",
    phone: "(48) 98888-4422",
    email: "rafael.pires@email.com",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80",
    birthDate: "1995-09-08",
    city: "Florianópolis",
    neighborhood: "Ingleses",
    functions: ["Bartender", "Garçom"],
    functionExperience: [
      { function: "Bartender", level: "Profissional experiente", months: 48, acceptsAssistant: false, verified: true },
      { function: "Garçom", level: "Experiente", months: 30, acceptsAssistant: true, verified: true }
    ],
    experience: "Bartender em bares de alto movimento e festas privadas.",
    description: "Drinks clássicos, atendimento em balcão e montagem de bar.",
    availability: "Quinta a domingo",
    hasTransport: true,
    maxDistanceKm: 18,
    rating: 4.8,
    completedJobs: 35,
    attendanceRate: 95,
    punctualityRate: 94,
    cancellations: 2,
    reviews: [
      { id: "review-2", authorName: "Centro Eventos Floripa", rating: 5, comment: "Resolveu o bar com calma e técnica." }
    ],
    verified: true
  },
  {
    id: "worker-3",
    name: "Luiza Martins",
    phone: "(48) 99777-9811",
    email: "luiza.martins@email.com",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80",
    birthDate: "2000-01-20",
    city: "Florianópolis",
    neighborhood: "Centro",
    functions: ["Operador de caixa", "Recepcionista"],
    functionExperience: [
      { function: "Operador de caixa", level: "Experiente", months: 20, acceptsAssistant: false, verified: false },
      { function: "Recepcionista", level: "Poucas diárias", months: 6, acceptsAssistant: true, verified: false }
    ],
    experience: "Caixa em casa noturna, controle de lista e atendimento.",
    description: "Organizada, pontual e acostumada com fluxo grande de pessoas.",
    availability: "Período noturno",
    hasTransport: false,
    maxDistanceKm: 10,
    rating: 4.7,
    completedJobs: 24,
    attendanceRate: 97,
    punctualityRate: 92,
    cancellations: 0,
    reviews: [
      { id: "review-3", authorName: "Restaurante Ilha Norte", rating: 4, comment: "Boa comunicação com a equipe." }
    ],
    verified: false
  },
  {
    id: "worker-4",
    name: "Diego Ramos",
    phone: "(48) 99621-5510",
    email: "diego.ramos@email.com",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=320&q=80",
    birthDate: "1992-11-03",
    city: "Florianópolis",
    neighborhood: "Lagoa da Conceição",
    functions: ["Montador de eventos", "Limpeza"],
    functionExperience: [
      { function: "Montador de eventos", level: "Profissional experiente", months: 42, acceptsAssistant: false, verified: true },
      { function: "Limpeza", level: "Experiente", months: 24, acceptsAssistant: true, verified: true }
    ],
    experience: "Montagem, desmontagem, carga leve e pós-evento.",
    description: "Força operacional para eventos, com disponibilidade de última hora.",
    availability: "Integral",
    hasTransport: true,
    maxDistanceKm: 30,
    rating: 4.6,
    completedJobs: 31,
    attendanceRate: 93,
    punctualityRate: 95,
    cancellations: 3,
    reviews: [
      { id: "review-4", authorName: "Centro Eventos Floripa", rating: 5, comment: "Chegou cedo e ajudou até o fim." }
    ],
    verified: true
  }
];

export const jobs: Job[] = [
  {
    id: "job-1",
    companyId: "company-1",
    title: "Garçom para beach club",
    function: "Garçom",
    quantity: 6,
    filled: 3,
    date: "2026-01-04",
    startsAt: "14:00",
    endsAt: "23:00",
    dailyValue: 260,
    paymentMethod: "Pix",
    approximateAddress: "Jurerê Internacional, próximo à praia",
    fullAddress: "Av. dos Búzios, 1200, Jurerê",
    neighborhood: "Jurerê",
    uniform: "Calça preta, tênis preto e camisa fornecida no local",
    requiredExperience: "Experiência com bandeja e atendimento em alto fluxo",
    description: "Atendimento em mesas, reposição de bebidas e suporte à operação do salão.",
    benefits: ["Alimentação no local", "Transporte após 23h"],
    contactAfterConfirmation: true,
    urgent: true,
    candidates: 12,
    distanceKm: 16
  },
  {
    id: "job-2",
    companyId: "company-3",
    title: "Bartender para evento corporativo",
    function: "Bartender",
    quantity: 2,
    filled: 0,
    date: "2026-01-07",
    startsAt: "17:00",
    endsAt: "01:00",
    dailyValue: 320,
    paymentMethod: "Transferência",
    approximateAddress: "Centro, próximo à Beira-Mar Norte",
    fullAddress: "Rua Felipe Schmidt, 320, Centro",
    neighborhood: "Centro",
    uniform: "Camisa social preta",
    requiredExperience: "Preparo de drinks clássicos e organização de bar",
    description: "Montagem do bar, preparo de drinks, controle de insumos e atendimento aos convidados.",
    benefits: ["Jantar", "Ajuda de custo"],
    contactAfterConfirmation: true,
    urgent: false,
    candidates: 5,
    distanceKm: 4
  },
  {
    id: "job-3",
    companyId: "company-2",
    title: "Auxiliar de cozinha para restaurante",
    function: "Auxiliar de cozinha",
    quantity: 3,
    filled: 1,
    date: "2026-01-05",
    startsAt: "10:00",
    endsAt: "18:00",
    dailyValue: 210,
    paymentMethod: "Dinheiro",
    approximateAddress: "Canasvieiras, próximo à avenida principal",
    fullAddress: "Rua Madre Maria Villac, 640, Canasvieiras",
    neighborhood: "Canasvieiras",
    uniform: "Touca, sapato fechado e avental",
    requiredExperience: "Pré-preparo, organização e apoio na praça quente",
    description: "Higienização de alimentos, montagem de pratos simples e limpeza da área de trabalho.",
    benefits: ["Almoço", "Gorjeta compartilhada"],
    contactAfterConfirmation: true,
    urgent: false,
    candidates: 8,
    distanceKm: 19
  },
  {
    id: "job-4",
    companyId: "company-3",
    title: "Recepcionista para evento",
    function: "Recepcionista",
    quantity: 4,
    filled: 0,
    date: "2026-01-06",
    startsAt: "08:00",
    endsAt: "15:00",
    dailyValue: 190,
    paymentMethod: "Pix",
    approximateAddress: "Centro, perto do terminal",
    fullAddress: "Rua Felipe Schmidt, 320, Centro",
    neighborhood: "Centro",
    uniform: "Blazer ou camisa preta",
    requiredExperience: "Credenciamento, lista de presença e atendimento ao público",
    description: "Receber convidados, validar credenciais e orientar circulação no evento.",
    benefits: ["Café da manhã"],
    contactAfterConfirmation: true,
    urgent: true,
    candidates: 9,
    distanceKm: 3
  },
  {
    id: "job-5",
    companyId: "company-2",
    title: "Profissional de limpeza para pós-evento",
    function: "Limpeza",
    quantity: 5,
    filled: 2,
    date: "2026-01-08",
    startsAt: "06:00",
    endsAt: "12:00",
    dailyValue: 170,
    paymentMethod: "Pix",
    approximateAddress: "Canasvieiras, região central",
    fullAddress: "Rua Madre Maria Villac, 640, Canasvieiras",
    neighborhood: "Canasvieiras",
    uniform: "Roupa confortável e sapato fechado",
    requiredExperience: "Limpeza comercial ou pós-evento",
    description: "Limpeza de salão, banheiros, área externa e descarte de resíduos.",
    benefits: ["Café no local"],
    contactAfterConfirmation: true,
    urgent: false,
    candidates: 7,
    distanceKm: 21
  }
];

export const notifications: NotificationItem[] = [
  {
    id: "notification-1",
    title: "Nova vaga próxima de você",
    body: "Recepcionista para evento no Centro está aceitando candidaturas.",
    role: "trabalhador",
    createdAt: "2026-01-02T08:30:00.000Z",
    read: false
  },
  {
    id: "notification-2",
    title: "Um candidato se inscreveu na sua vaga",
    body: "Ana Carolina enviou candidatura para Garçom em Jurerê.",
    role: "empresa",
    createdAt: "2026-01-02T10:10:00.000Z",
    read: false
  },
  {
    id: "notification-3",
    title: "O profissional realizou check-in",
    body: "Rafael Pires iniciou o turno confirmado.",
    role: "empresa",
    createdAt: "2026-01-02T17:05:00.000Z",
    read: true
  }
];

export const initialState: AppState = {
  activeRole: "trabalhador",
  selectedWorkerId: "worker-1",
  selectedCompanyId: "company-1",
  workers,
  companies,
  jobs,
  applications: [
    { id: "application-1", jobId: "job-1", workerId: "worker-1", status: "Em análise", createdAt: "2026-01-01T14:00:00.000Z" },
    { id: "application-2", jobId: "job-2", workerId: "worker-2", status: "Aprovada", createdAt: "2026-01-01T16:30:00.000Z" },
    { id: "application-3", jobId: "job-4", workerId: "worker-3", status: "Enviada", createdAt: "2026-01-02T09:20:00.000Z" }
  ],
  shifts: [
    { id: "shift-1", jobId: "job-2", workerId: "worker-2", status: "Ainda não chegou" }
  ],
  favoriteWorkerIds: ["worker-1", "worker-2"],
  notifications,
  subscription: {
    plan: "Gratuito",
    creditsRemaining: 4,
    renewalDate: "2026-02-01"
  }
};
