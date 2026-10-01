import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.conversationMessage.deleteMany();
  await prisma.conversationSession.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.warranty.deleteMany();
  await prisma.project.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.priceRule.deleteMany();
  await prisma.product.deleteMany();
  await prisma.material.deleteMany();
  await prisma.user.deleteMany();

  const [sofia, rodrigo, ludwing] = await Promise.all([
    prisma.user.create({
      data: { email: "sofia@bidesign.local", name: "Sofia Hernandez", role: "SALES" }
    }),
    prisma.user.create({
      data: { email: "rodrigo@bidesign.local", name: "Rodrigo Cardenas", role: "SALES" }
    }),
    prisma.user.create({
      data: { email: "ludwing@bidesign.local", name: "Ludwing Perez", role: "OPERATIONS" }
    })
  ]);

  const materials = await Promise.all([
    prisma.material.create({ data: { name: "TPU", multiplier: 1 } }),
    prisma.material.create({ data: { name: "Acero inoxidable", multiplier: 1.45 } }),
    prisma.material.create({ data: { name: "Policoncreto", multiplier: 1.2 } }),
    prisma.material.create({ data: { name: "Acrilico", multiplier: 1.12 } }),
    prisma.material.create({ data: { name: "Aluminio", multiplier: 1.25 } })
  ]);

  await Promise.all([
    prisma.product.create({
      data: { name: "Piso podotactil", solutionType: "Piso podotactil", defaultUnit: "metros lineales", basePrice: 1180 }
    }),
    prisma.product.create({
      data: { name: "Senalizacion braille", solutionType: "Senalizacion braille", defaultUnit: "piezas", basePrice: 1450 }
    }),
    prisma.product.create({
      data: { name: "Mapas hapticos", solutionType: "Mapas hapticos", defaultUnit: "piezas", basePrice: 14500 }
    })
  ]);

  const lead1 = await prisma.lead.create({
    data: {
      code: "BI-001",
      companyName: "Hospital Santa Lucia",
      city: "CDMX",
      projectType: "Senalizacion braille",
      status: "QUOTE_SENT",
      source: "WEB",
      painPoint: "Pacientes con discapacidad visual no identifican rutas de urgencias.",
      estimatedValue: 145000,
      nextAction: "Enviar propuesta tecnica actualizada por torre medica.",
      nextActionDate: new Date("2026-06-02"),
      internalNotes: "Cliente pide incluir instalacion nocturna para no afectar operacion.",
      ownerId: sofia.id,
      contacts: {
        create: [
          {
            name: "Dra. Mariana Torres",
            email: "m.torres@hospitalstl.mx",
            phone: "+52 55 4410 2230",
            isPrimary: true
          }
        ]
      }
    }
  });

  const lead2 = await prisma.lead.create({
    data: {
      code: "BI-003",
      companyName: "Plaza Norte Queretaro",
      city: "Queretaro, Queretaro",
      projectType: "Piso podotactil",
      status: "NEGOTIATION",
      source: "WHATSAPP",
      painPoint: "Usuarios no identifican trayectos seguros a elevadores y sanitarios.",
      estimatedValue: 378000,
      nextAction: "Confirmar metraje final por zonas de alto transito.",
      nextActionDate: new Date("2026-06-04"),
      internalNotes: "Oportunidad prioritaria para cerrar en esta semana.",
      ownerId: ludwing.id,
      contacts: {
        create: [
          {
            name: "Lic. Beatriz Nunez",
            email: "bnunez@plazanorte.mx",
            phone: "+52 442 205 1983",
            isPrimary: true
          }
        ]
      }
    }
  });

  const quote1 = await prisma.quote.create({
    data: {
      folio: "BI-COT-2026-0001",
      year: 2026,
      sequence: 1,
      version: 1,
      status: "SENT",
      subtotal: 171100,
      installation: 30798,
      tax: 32303,
      total: 234201,
      leadId: lead1.id,
      pdfVersion: 1,
      pdfGeneratedAt: new Date("2026-05-27T10:00:00Z"),
      pdfStatus: "GENERATED",
      pdfMetadata: {
        folio: "BI-COT-2026-0001",
        version: 1,
        generatedAt: "2026-05-27T10:00:00.000Z",
        total: 234201,
        status: "GENERATED"
      },
      items: {
        create: [
          {
            productName: "Senalizacion braille",
            description: "Senales tactiles en urgencias y consulta",
            solutionType: "Senalizacion braille",
            unit: "piezas",
            quantity: 80,
            unitPrice: 1450,
            installationCost: 20880
          }
        ]
      }
    }
  });

  const project = await prisma.project.create({
    data: {
      code: "PR-2401",
      leadId: lead2.id,
      quoteId: quote1.id,
      clientName: "Plaza Norte Queretaro",
      name: "Ruta podotactil de accesos y elevadores",
      solutionType: "Piso podotactil",
      city: "Queretaro, Queretaro",
      status: "SCHEDULED_INSTALLATION",
      responsible: "Ing. Diego Salinas",
      estimatedInstallation: new Date("2026-06-12"),
      progress: 67,
      risk: "MEDIUM",
      evidenceCount: 9,
      nextAction: "Confirmar ventana nocturna de instalacion con operaciones.",
      mainItems: ["Guia direccional TPU", "Botones de alerta acero inoxidable", "Plano por zonas"],
      timeline: [
        { id: "PR-2401-T1", date: "2026-05-10", title: "Diagnostico tecnico", note: "Levantamiento de rutas." }
      ]
    }
  });

  await prisma.warranty.create({
    data: {
      code: "GA-001",
      projectId: project.id,
      leadId: lead2.id,
      clientName: "Plaza Norte Queretaro",
      projectName: "Ruta podotactil de accesos y elevadores",
      city: "Queretaro, Queretaro",
      solutionInstalled: "Guia podotactil TPU y botones alerta",
      installDate: new Date("2026-03-12"),
      warrantyUntil: new Date("2031-03-12"),
      nextMaintenance: new Date("2026-06-03"),
      status: "REVIEW_REQUIRED",
      evidence: "9 fotos, nota de revision y reporte tecnico",
      evidenceCount: 9,
      responsible: "Equipo Postventa Centro",
      timeline: [{ id: "GA-001-T1", date: "2026-03-12", title: "Instalacion concluida", note: "Entrega por fases." }],
      observations: "Hay desprendimiento puntual por limpieza con quimico abrasivo."
    }
  });

  await prisma.priceRule.create({
    data: {
      name: "Urgencia alta + exterior",
      urgencyLevel: "Urgente",
      usageType: "Exterior",
      multiplier: 1.12,
      fixedDelta: 0,
      materialId: materials.find((row) => row.name === "Acero inoxidable")?.id
    }
  });

  await prisma.activityLog.createMany({
    data: [
      {
        type: "LEAD_CREATED",
        message: "Lead BI-001 creado en seed",
        leadId: lead1.id,
        userId: sofia.id
      },
      {
        type: "QUOTE_CREATED",
        message: "Cotizacion BI-COT-2026-0001 creada en seed",
        quoteId: quote1.id,
        leadId: lead1.id,
        userId: sofia.id
      },
      {
        type: "PDF_GENERATED",
        message: "PDF metadata registrado para BI-COT-2026-0001",
        quoteId: quote1.id,
        leadId: lead1.id,
        userId: rodrigo.id
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
