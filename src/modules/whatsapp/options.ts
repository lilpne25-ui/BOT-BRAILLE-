import { ConversationStepDefinition } from "@/modules/whatsapp/contracts";

export const quoteIntentKeywords = [
  "cotizar",
  "cotizacion",
  "cotización",
  "precio",
  "presupuesto",
  "piso podotactil",
  "piso podotáctil",
  "senalizacion",
  "señalizacion",
  "señalización",
  "braille"
];

/**
 * Se conservan temporalmente para compatibilidad con integraciones antiguas.
 * El flujo vigente ya no acepta o rechaza cotizaciones desde el bot.
 */
export const postQuoteAcceptanceKeywords = [
  "si",
  "sí",
  "acepto",
  "aceptamos",
  "de acuerdo",
  "adelante",
  "va",
  "correcto",
  "esta bien",
  "está bien",
  "ok",
  "okay",
  "claro",
  "por supuesto",
  "perfecto",
  "confirmo",
  "confirmado"
];

export const postQuoteRejectionKeywords = [
  "no gracias",
  "no me interesa",
  "no por ahora",
  "cancelar",
  "cancelo",
  "ya no",
  "no quiero",
  "declino",
  "no va a poder ser"
];

export const conversationSteps: ConversationStepDefinition[] = [
  {
    id: "clientCompany",
    label: "Cliente / empresa",
    question:
      "Para comenzar, dime el nombre de la empresa o cliente para el que registraremos la solicitud.",
    placeholder: "Ej. Hospital Santa Lucía",
    freeText: true
  },
  {
    id: "contactName",
    label: "Nombre de contacto",
    question:
      "¿Con quién tengo el gusto? Dime el nombre del contacto principal del proyecto.",
    placeholder: "Ej. Lic. Andrea Pérez",
    freeText: true
  },
  {
    id: "contactEmail",
    label: "Correo de contacto",
    question:
      "¿A qué correo electrónico puede contactarte el ejecutivo encargado?",
    placeholder:
      "Ej. andrea.perez@empresa.mx",
    freeText: true
  },
  {
    id: "contactPhone",
    label: "Telefono de contacto",
    question:
      "¿A qué número telefónico te podemos contactar? Incluye lada, por favor.",
    placeholder: "Ej. 477 123 4567",
    freeText: true
  },
  {
    id: "city",
    label: "Ciudad",
    question:
      "¿En qué ciudad se encuentra el proyecto?",
    placeholder: "Ej. León, Guanajuato",
    freeText: true
  },
  {
    id: "projectLocation",
    label: "Ubicacion del proyecto",
    question:
      "¿Cuál es la dirección exacta del proyecto? Comparte calle, número y colonia.",
    placeholder:
      "Ej. Av. Insurgentes Sur 1602, Col. Crédito Constructor",
    helpText:
      "Nos ayuda a coordinar la revisión técnica.",
    freeText: true
  },
  {
    id: "spaceType",
    label: "Tipo de espacio",
    question:
      "¿Qué tipo de espacio es? Elige la opción que más se parezca:",
    options: [
      { value: "Hospital" },
      { value: "Plaza" },
      {
        value: "Centro comercial",
        aliases: ["centro comercial", "mall"]
      },
      {
        value: "Escuela / universidad",
        aliases: [
          "escuela",
          "universidad",
          "colegio"
        ]
      },
      { value: "Oficina" },
      {
        value: "Edificio publico",
        aliases: [
          "edificio publico",
          "gobierno",
          "municipio"
        ]
      },
      { value: "Otro" }
    ],
    freeText: false
  },
  {
    id: "urgency",
    label: "Urgencia",
    question:
      "¿Qué tan urgente es tu proyecto?",
    options: [
      { value: "Normal" },
      {
        value: "Prioritario",
        aliases: [
          "prioritaria",
          "prioritario"
        ]
      },
      { value: "Urgente" },
      {
        value: "Solo cotizando",
        aliases: [
          "solo cotizando",
          "solo estoy cotizando",
          "sin urgencia"
        ]
      }
    ],
    freeText: false
  },
  {
    id: "solutionType",
    label: "Tipo de solucion",
    question:
      "¿Qué solución de accesibilidad te interesa?",
    options: [
      {
        value: "Piso podotactil",
        aliases: [
          "podotactil",
          "podotáctil"
        ]
      },
      {
        value: "Senalizacion braille",
        aliases: [
          "senalizacion",
          "señalizacion",
          "braille"
        ]
      },
      {
        value: "Mapas hapticos",
        aliases: ["mapa haptico", "mapas"]
      },
      { value: "Directorios" },
      { value: "Atriles" },
      {
        value: "Proteccion civil",
        aliases: ["protección civil"]
      },
      { value: "Arquitectura especializada" },
      {
        value: "No estoy seguro",
        aliases: [
          "no se",
          "no estoy seguro"
        ]
      }
    ],
    freeText: false
  },
  {
    id: "material",
    label: "Material",
    question:
      "¿Tienes alguna preferencia de material?",
    options: [
      { value: "TPU" },
      {
        value: "Acero inoxidable",
        aliases: ["acero"]
      },
      { value: "Policoncreto" },
      {
        value: "Acrilico",
        aliases: ["acrílico"]
      },
      { value: "Aluminio" },
      {
        value: "Recomendar material",
        aliases: [
          "recomendar",
          "recomendado",
          "sugerencia"
        ]
      }
    ],
    freeText: false
  },
  {
    id: "usage",
    label: "Uso",
    question:
      "¿Cómo será el uso principal del espacio?",
    options: [
      { value: "Interior" },
      { value: "Exterior" },
      { value: "Alto transito" },
      {
        value: "Zona humeda",
        aliases: [
          "zona húmeda",
          "humeda",
          "húmeda"
        ]
      },
      {
        value: "Area publica",
        aliases: [
          "área pública",
          "area publica"
        ]
      },
      {
        value: "No estoy seguro",
        aliases: [
          "no se",
          "no estoy seguro"
        ]
      }
    ],
    freeText: false
  },
  {
    id: "installationMethod",
    label: "Metodo de instalacion",
    question:
      "¿Conoces el método de instalación requerido?",
    options: [
      {
        value: "Instalacion especializada",
        aliases: [
          "instalacion",
          "instalación especializada"
        ]
      },
      { value: "Autoadhesivo" },
      { value: "Pin de anclaje" },
      {
        value: "Epoxico",
        aliases: ["epóxico", "epoxico"]
      },
      {
        value: "No se",
        aliases: ["no sé", "no se"]
      }
    ],
    freeText: false
  },
  {
    id: "quantity",
    label: "Cantidad",
    question:
      "Indica una cantidad o metraje aproximado, si ya lo conoces.",
    placeholder:
      "Ej. 120 metros lineales",
    freeText: true
  },
  {
    id: "evidence",
    label: "Evidencia",
    question:
      "Por último, ¿tienes foto, plano o croquis? Si no, continuamos sin archivo.",
    options: [
      { value: "Foto" },
      { value: "Plano" },
      { value: "Croquis" },
      {
        value: "Sin archivo",
        aliases: [
          "sin archivo",
          "no tengo archivo"
        ]
      }
    ],
    freeText: true
  }
];
