"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { jsPDF } from "jspdf";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eye,
  FileDown,
  Plus,
  Trash2
} from "lucide-react";
import {
  installationMethods,
  InstallationMethod,
  materials,
  Material,
  solutionTypes,
  SolutionType,
  spaceTypes,
  urgencyLevels,
  usageTypes
} from "@/modules/quotes/contracts";
import {
  calculateInstallation,
  calculateQuoteTotals,
  calculateUnitPrice,
  QuoteItem
} from "@/lib/quote-calculator";
import { usePricingCatalog } from "@/lib/use-pricing-catalog";
import {
  drawFooter,
  drawInfoGrid,
  drawLetterhead,
  drawTotalBox,
  loadLogoDataUrlClient
} from "@/lib/pdf-brand";
import {
  formatCurrency,
  formatDate
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getPublicBrand } from "@/lib/brand/public";
import {
  QuoteMeta,
  QuotePreview
} from "@/components/cotizador/quote-preview";

const quoteStatusValues = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED"
] as const;

type QuoteStatus =
  (typeof quoteStatusValues)[number];

const statusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada"
};

const schema = z.object({
  client: z
    .string()
    .min(2, "Captura el nombre del cliente"),
  contact: z
    .string()
    .min(2, "Captura el contacto"),
  email: z
    .string()
    .email("Captura un correo valido"),
  phone: z
    .string()
    .min(7, "Captura un telefono valido"),
  city: z
    .string()
    .min(2, "Captura la ciudad"),
  projectLocation: z
    .string()
    .min(2, "Captura la ubicacion del proyecto"),
  spaceType: z.enum(spaceTypes),
  urgency: z.enum(urgencyLevels),
  solutionType: z.enum(solutionTypes),
  material: z.enum(materials),
  usage: z.enum(usageTypes),
  installationMethod: z.enum(
    installationMethods
  ),
  estimatedDelivery: z
    .string()
    .min(2, "Captura el tiempo estimado de entrega"),
  observations: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

const stepOneFields = [
  "client",
  "contact",
  "email",
  "phone",
  "city",
  "projectLocation",
  "spaceType",
  "urgency"
] as const;

const stepOneSchema = schema.pick({
  client: true,
  contact: true,
  email: true,
  phone: true,
  city: true,
  projectLocation: true,
  spaceType: true,
  urgency: true
});

const stepOneLabels: Record<
  (typeof stepOneFields)[number],
  string
> = {
  client: "Cliente",
  contact: "Contacto",
  email: "Correo",
  phone: "Telefono",
  city: "Ciudad",
  projectLocation: "Ubicacion del proyecto",
  spaceType: "Tipo de espacio",
  urgency: "Urgencia"
};

type WizardStep = 1 | 2 | 3 | 4;

type InitialLead = {
  leadCode?: string;
  client?: string;
  contact?: string;
  email?: string;
  phone?: string;
  city?: string;
  projectType?: string;
};

type PersistedQuote = {
  id: string;
  folio: string;
  status: QuoteStatus;
};

type SavedQuoteItem = {
  id: string;
  productName: string;
  description: string;
  solutionType: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  installationCost: number;
  notes: string | null;
};

type SavedQuote = {
  id: string;
  folio: string;
  leadId: string;
  leadCode: string;
  client: string;
  contact: string;
  email: string;
  phone: string;
  city: string;
  status: QuoteStatus;
  subtotal: number;
  installation: number;
  tax: number;
  total: number;
  pdfStatus: string;
  pdfVersion: number | null;
  projectLocation: string;
  spaceType: string;
  urgency: string;
  solutionType: string;
  material: string;
  usage: string;
  installationMethod: string;
  estimatedDelivery: string;
  observations: string;
  items: SavedQuoteItem[];
  createdAt: string;
  updatedAt: string;
};

const wizardSteps = [
  {
    id: 1,
    title: "Cliente y proyecto",
    description: "Datos base para cotizar"
  },
  {
    id: 2,
    title: "Solucion / servicio",
    description: "Alcance tecnico"
  },
  {
    id: 3,
    title: "Partidas",
    description: "Conceptos, cantidades y precios"
  },
  {
    id: 4,
    title: "Revision",
    description: "Guardar, PDF y estado"
  }
] as const;

const guidedStepLabels: Record<
  WizardStep,
  {
    shortTitle: string;
    action: string;
  }
> = {
  1: {
    shortTitle: "Cliente",
    action: "Solucion"
  },
  2: {
    shortTitle: "Solucion",
    action: "Partidas"
  },
  3: {
    shortTitle: "Partidas",
    action: "Revision"
  },
  4: {
    shortTitle: "Revision",
    action: "Finalizar"
  }
};

const defaultItem = (
  solutionType: SolutionType =
    "Piso podotactil",
  material: Material = "TPU"
): QuoteItem => ({
  id: crypto.randomUUID(),
  product: solutionType,
  description:
    "Suministro e instalacion de solucion / servicio",
  solutionType,
  material,
  unit:
    solutionType === "Piso podotactil"
      ? "metros lineales"
      : "piezas",
  quantity:
    solutionType === "Piso podotactil"
      ? 25
      : 8,
  installationRequired: true,
  notes:
    "Incluye fijacion y validacion final de alcance."
});

function mapProjectTypeToSolution(
  projectType?: string
): SolutionType {
  if (!projectType) return "Piso podotactil";

  const normalized = projectType.toLowerCase();

  if (normalized.includes("atril")) {
    return "Atriles";
  }

  if (
    normalized.includes("braille") ||
    normalized.includes("senal")
  ) {
    return "Senalizacion braille";
  }

  if (
    normalized.includes("haptic") ||
    normalized.includes("haptico") ||
    normalized.includes("mapa")
  ) {
    return "Mapas hapticos";
  }

  if (normalized.includes("directorio")) {
    return "Directorios";
  }

  if (normalized.includes("proteccion")) {
    return "Proteccion civil";
  }

  if (normalized.includes("arquitectura")) {
    return "Arquitectura especializada";
  }

  return "Piso podotactil";
}

function asSolutionType(
  value?: string
): SolutionType {
  return solutionTypes.includes(
    value as SolutionType
  )
    ? (value as SolutionType)
    : "Piso podotactil";
}

function asMaterial(value?: string): Material {
  return materials.includes(value as Material)
    ? (value as Material)
    : "TPU";
}

function asSpaceType(
  value?: string
): FormValues["spaceType"] {
  return spaceTypes.includes(
    value as FormValues["spaceType"]
  )
    ? (value as FormValues["spaceType"])
    : "Otro";
}

function asUrgency(
  value?: string
): FormValues["urgency"] {
  return urgencyLevels.includes(
    value as FormValues["urgency"]
  )
    ? (value as FormValues["urgency"])
    : "Normal";
}

function asUsage(
  value?: string
): FormValues["usage"] {
  return usageTypes.includes(
    value as FormValues["usage"]
  )
    ? (value as FormValues["usage"])
    : "Interior";
}

function asInstallationMethod(
  value?: string
): InstallationMethod {
  return installationMethods.includes(
    value as InstallationMethod
  )
    ? (value as InstallationMethod)
    : "Instalacion especializada";
}

export function QuoteForm({
  initialLead
}: {
  initialLead?: InitialLead;
}) {
  const brand =
    getPublicBrand();
  const { catalog } = usePricingCatalog();
  const isCascadeLead =
    Boolean(
      initialLead?.leadCode
    );

  const [items, setItems] = useState<
    QuoteItem[]
  >([defaultItem()]);
  const [step, setStep] =
    useState<WizardStep>(1);
  const [
    maxVisitedStep,
    setMaxVisitedStep
  ] = useState<WizardStep>(1);
  const [stepError, setStepError] =
    useState<string | null>(null);
  const [operationMessage, setOperationMessage] =
    useState<string | null>(null);
  const [previewOpen, setPreviewOpen] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [
    persistedQuote,
    setPersistedQuote
  ] = useState<PersistedQuote | null>(
    null
  );
  const [quoteHistory, setQuoteHistory] =
    useState<SavedQuote[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      client: "",
      contact: "",
      email: "",
      phone: "",
      city: "",
      projectLocation: "",
      spaceType: "Otro",
      urgency: "Normal",
      solutionType: "Piso podotactil",
      material: "TPU",
      usage: "Interior",
      installationMethod:
        "Instalacion especializada",
      estimatedDelivery: "3 a 4 semanas",
      observations:
        "Vigencia de cotizacion: 15 dias."
    }
  });

  useEffect(() => {
    if (!initialLead) return;

    const hasLeadData = Boolean(
      initialLead.client ||
        initialLead.contact ||
        initialLead.email ||
        initialLead.phone ||
        initialLead.city ||
        initialLead.projectType
    );

    if (!hasLeadData) return;

    const mappedSolution =
      mapProjectTypeToSolution(
        initialLead.projectType
      );
    const mappedMaterial: Material =
      mappedSolution === "Piso podotactil"
        ? "Acero inoxidable"
        : "Acrilico";

    form.reset({
      ...form.getValues(),
      client:
        initialLead.client ??
        form.getValues("client"),
      contact:
        initialLead.contact ??
        form.getValues("contact"),
      email:
        initialLead.email ??
        form.getValues("email"),
      phone:
        initialLead.phone ??
        form.getValues("phone"),
      city:
        initialLead.city ??
        form.getValues("city"),
      solutionType: mappedSolution,
      material: mappedMaterial
    });

    setItems([
      defaultItem(
        mappedSolution,
        mappedMaterial
      )
    ]);
  }, [form, initialLead]);

  const values = form.watch();

  const stepOnePending = useMemo(
    () => {
      const pending: string[] = [];

      if (values.client.trim().length < 2) {
        pending.push("Cliente");
      }

      if (values.contact.trim().length < 2) {
        pending.push("Contacto");
      }

      if (
        !z
          .string()
          .email()
          .safeParse(values.email.trim())
          .success
      ) {
        pending.push("Correo");
      }

      if (values.phone.trim().length < 7) {
        pending.push("Telefono");
      }

      if (values.city.trim().length < 2) {
        pending.push("Ciudad");
      }

      if (
        values.projectLocation
          .trim()
          .length < 2
      ) {
        pending.push(
          "Ubicacion del proyecto"
        );
      }

      return pending;
    },
    [
      values.client,
      values.contact,
      values.email,
      values.phone,
      values.city,
      values.projectLocation
    ]
  );

  const stepTwoPending = useMemo(
    () => {
      const pending: string[] = [];

      if (!values.solutionType) {
        pending.push(
          "Tipo de solucion"
        );
      }

      if (!values.material) {
        pending.push("Material");
      }

      if (!values.usage) {
        pending.push("Uso");
      }

      if (!values.installationMethod) {
        pending.push(
          "Metodo de instalacion"
        );
      }

      if (
        values.estimatedDelivery
          .trim()
          .length < 2
      ) {
        pending.push(
          "Entrega estimada"
        );
      }

      return pending;
    },
    [
      values.solutionType,
      values.material,
      values.usage,
      values.installationMethod,
      values.estimatedDelivery
    ]
  );

  const invalidItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.quantity <= 0 ||
          !item.product.trim()
      ).length,
    [items]
  );

  const currentPending =
    step === 1
      ? stepOnePending
      : step === 2
        ? stepTwoPending
        : step === 3 &&
            invalidItems > 0
          ? [
              `${invalidItems} partida${
                invalidItems === 1
                  ? ""
                  : "s"
              } por corregir`
            ]
          : step === 4 &&
              !persistedQuote
            ? [
                "Guardar borrador"
              ]
            : [];

  const currentStepReady =
    currentPending.length === 0;

  const progressPercent =
    step * 25;

  const guidanceText =
    step === 1
      ? currentStepReady
        ? "Todo listo. Continúa a la solución o servicio."
        : `Completa ${currentPending[0]} para poder avanzar.`
      : step === 2
        ? currentStepReady
          ? "La configuracion tecnica esta lista. Continua a partidas."
          : `Revisa ${currentPending[0]}.`
        : step === 3
          ? currentStepReady
            ? `${items.length} partida${
                items.length === 1
                  ? ""
                  : "s"
              } lista${
                items.length === 1
                  ? ""
                  : "s"
              }. Continua a revision.`
            : `Corrige ${currentPending[0]} antes de continuar.`
          : persistedQuote
            ? "Revisa, genera el PDF y cambia el estado cuando corresponda."
            : "Guarda el borrador para obtener el folio y conservar esta cotizacion.";

  const totals = useMemo(
    () =>
      calculateQuoteTotals(
        items,
        catalog
      ),
    [items, catalog]
  );

  const quoteMeta: QuoteMeta = {
    client: values.client || "",
    contact: values.contact || "",
    city: values.city || "",
    projectLocation:
      values.projectLocation || "",
    spaceType: values.spaceType || "",
    urgency: values.urgency || "",
    solutionType:
      values.solutionType || "",
    material: values.material || "",
    usage: values.usage || "",
    installationMethod:
      values.installationMethod || "",
    estimatedDelivery:
      values.estimatedDelivery || ""
  };

  const loadHistory = useCallback(
    async () => {
      const params = new URLSearchParams();

      if (initialLead?.leadCode) {
        params.set(
          "leadCode",
          initialLead.leadCode
        );
      } else if (
        initialLead?.client
      ) {
        params.set(
          "client",
          initialLead.client
        );

        if (initialLead.city) {
          params.set(
            "city",
            initialLead.city
          );
        }
      } else {
        return;
      }

      try {
        const response = await fetch(
          `/api/quotes?${params.toString()}`
        );

        if (!response.ok) return;

        const rows =
          (await response.json()) as SavedQuote[];

        setQuoteHistory(rows);
      } catch {
        // El historial no bloquea la cotizacion actual.
      }
    },
    [
      initialLead?.leadCode,
      initialLead?.client,
      initialLead?.city
    ]
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function updateItem(
    id: string,
    patch: Partial<QuoteItem>
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch
            }
          : item
      )
    );
  }

  function removeItem(id: string) {
    setItems((current) =>
      current.length > 1
        ? current.filter(
            (item) => item.id !== id
          )
        : current
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      defaultItem(
        values.solutionType,
        values.material
      )
    ]);
  }

  async function validateCurrentStep() {
    setStepError(null);

    if (step === 1) {
      const current =
        form.getValues();

      const normalized = {
        client:
          current.client.trim(),
        contact:
          current.contact.trim(),
        email:
          current.email
            .trim()
            .toLowerCase(),
        phone:
          current.phone.trim(),
        city:
          current.city.trim(),
        projectLocation:
          current.projectLocation.trim(),
        spaceType:
          current.spaceType,
        urgency:
          current.urgency
      };

      form.setValue(
        "client",
        normalized.client,
        {
          shouldDirty: true
        }
      );
      form.setValue(
        "contact",
        normalized.contact,
        {
          shouldDirty: true
        }
      );
      form.setValue(
        "email",
        normalized.email,
        {
          shouldDirty: true
        }
      );
      form.setValue(
        "phone",
        normalized.phone,
        {
          shouldDirty: true
        }
      );
      form.setValue(
        "city",
        normalized.city,
        {
          shouldDirty: true
        }
      );
      form.setValue(
        "projectLocation",
        normalized.projectLocation,
        {
          shouldDirty: true
        }
      );

      const result =
        stepOneSchema.safeParse(
          normalized
        );

      form.clearErrors(
        [...stepOneFields]
      );

      if (!result.success) {
        const firstIssue =
          result.error.issues[0];

        for (
          const issue of
          result.error.issues
        ) {
          const field =
            issue.path[0];

          if (
            typeof field ===
              "string" &&
            stepOneFields.includes(
              field as
                (typeof stepOneFields)[number]
            )
          ) {
            form.setError(
              field as
                (typeof stepOneFields)[number],
              {
                type:
                  "manual",
                message:
                  issue.message
              }
            );
          }
        }

        const firstField =
          typeof firstIssue
            ?.path[0] ===
            "string"
            ? firstIssue.path[0] as
                (typeof stepOneFields)[number]
            : undefined;

        setStepError(
          firstField
            ? `${stepOneLabels[firstField]}: ${firstIssue.message}`
            : "Revisa los datos del paso 1 antes de continuar."
        );

        if (firstField) {
          form.setFocus(
            firstField
          );
        }

        return false;
      }

      setStepError(null);
      return true;
    }

    if (step === 2) {
      return form.trigger(
        [
          "solutionType",
          "material",
          "usage",
          "installationMethod",
          "estimatedDelivery"
        ],
        { shouldFocus: true }
      );
    }

    if (step === 3) {
      if (
        items.length === 0 ||
        items.some(
          (item) =>
            item.quantity <= 0 ||
            !item.product.trim()
        )
      ) {
        setStepError(
          "Agrega al menos una partida valida."
        );
        return false;
      }
    }

    return true;
  }

  function scrollToWizard() {
    window.setTimeout(
      () => {
        document
          .getElementById(
            "quote-wizard-form"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
      },
      50
    );
  }

  async function goNext() {
    const valid =
      await validateCurrentStep();

    if (!valid) return;

    const nextStep =
      step < 4
        ? ((step + 1) as WizardStep)
        : step;

    setStep(nextStep);
    setMaxVisitedStep(
      (current) =>
        Math.max(
          current,
          nextStep
        ) as WizardStep
    );
    setStepError(null);
    scrollToWizard();
  }

  function goBack() {
    setStepError(null);

    const previousStep =
      step > 1
        ? ((step - 1) as WizardStep)
        : step;

    setStep(previousStep);
    scrollToWizard();
  }

  function openVisitedStep(
    target: WizardStep
  ) {
    if (
      target >
      maxVisitedStep
    ) {
      return;
    }

    setStepError(null);
    setStep(target);
    scrollToWizard();
  }

  async function openPreview() {
    const valid =
      await form.trigger();

    if (!valid) return;

    if (items.length === 0) {
      setStepError(
        "Agrega partidas antes de abrir la vista previa."
      );
      return;
    }

    setPreviewOpen(true);
  }

  function quotePayload(
    status: QuoteStatus
  ) {
    return {
      ...(initialLead?.leadCode
        ? {
            leadCode:
              initialLead.leadCode
          }
        : {
            lead: {
              client: values.client,
              contact: values.contact,
              email: values.email,
              phone: values.phone,
              city: values.city,
              projectType:
                values.solutionType,
              painPoint: `Proyecto en ${values.projectLocation}`,
              nextAction:
                "Revisar y dar seguimiento a la cotizacion.",
              internalNotes:
                values.observations ||
                "Cotizacion preparada manualmente.",
              estimatedValue:
                totals.total
            }
          }),
      status,
      subtotal: totals.subtotal,
      installation:
        totals.installation,
      tax: totals.iva,
      total: totals.total,
      items: items.map((item) => ({
        productName: item.product,
        description: item.description,
        solutionType:
          item.solutionType,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: calculateUnitPrice(
          item,
          catalog
        ),
        installationCost:
          calculateInstallation(
            item,
            catalog
          ),
        notes: item.notes
      })),
      pdfMetadata: {
        folio:
          persistedQuote?.folio ??
          "PENDING",
        version: 1,
        generatedAt:
          new Date().toISOString(),
        total: totals.total,
        status: "PENDING" as const,
        projectLocation:
          values.projectLocation,
        spaceType: values.spaceType,
        urgency: values.urgency,
        solutionType:
          values.solutionType,
        material: values.material,
        usage: values.usage,
        installationMethod:
          values.installationMethod,
        estimatedDelivery:
          values.estimatedDelivery,
        observations:
          values.observations ?? "",
        quantity: items
          .map(
            (item) =>
              `${item.quantity} ${item.unit}`
          )
          .join(", "),
        evidence: "Sin archivo",
        cascadeSource:
          initialLead?.leadCode
            ? "PROSPECT"
            : "MANUAL"
      }
    };
  }

  async function saveQuote(
    status: QuoteStatus =
      persistedQuote?.status ??
      "DRAFT"
  ) {
    const valid =
      await form.trigger();

    if (!valid) {
      setOperationMessage(
        "Completa los datos obligatorios antes de guardar."
      );
      return null;
    }

    if (
      items.length === 0 ||
      items.some(
        (item) =>
          item.quantity <= 0 ||
          !item.product.trim()
      )
    ) {
      setOperationMessage(
        "Revisa las partidas antes de guardar."
      );
      return null;
    }

    setSaving(true);
    setOperationMessage(null);

    try {
      let response: Response;

      if (persistedQuote) {
        const payload =
          quotePayload(status);
        const {
          leadCode: _leadCode,
          lead: _lead,
          ...updatePayload
        } = payload as ReturnType<
          typeof quotePayload
        > & {
          leadCode?: string;
          lead?: unknown;
        };

        response = await fetch(
          `/api/quotes/${persistedQuote.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify(
              updatePayload
            )
          }
        );
      } else {
        response = await fetch(
          "/api/quotes",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify(
              quotePayload(status)
            )
          }
        );
      }

      const data =
        (await response.json()) as {
          id?: string;
          folio?: string;
          status?: QuoteStatus;
          projectCode?: string | null;
          error?: string;
        };

      if (
        !response.ok ||
        !data.id ||
        !data.folio
      ) {
        throw new Error(
          data.error ||
            "No se pudo guardar la cotizacion."
        );
      }

      const saved = {
        id: data.id,
        folio: data.folio,
        status:
          data.status ?? status
      };

      setPersistedQuote(saved);
      setOperationMessage(
        saved.status === "ACCEPTED" && data.projectCode
          ? `${saved.folio} marcada como Aceptada. Proyecto ${data.projectCode} creado en Operaciones.`
          : `${saved.folio} guardada como ${statusLabels[saved.status]}.`
      );

      await loadHistory();

      return saved;
    } catch (error) {
      setOperationMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la cotizacion."
      );

      return null;
    } finally {
      setSaving(false);
    }
  }

  async function generatePdf() {
    const saved =
      await saveQuote(
        persistedQuote?.status ??
          "DRAFT"
      );

    if (!saved) return;

    const doc = new jsPDF();
    const today =
      new Intl.DateTimeFormat(
        "es-MX",
        {
          day: "2-digit",
          month: "long",
          year: "numeric"
        }
      ).format(new Date());
    const logoDataUrl =
      await loadLogoDataUrlClient();

    let y = drawLetterhead(doc, {
      logoDataUrl,
      subtitle:
        "Cotizacion comercial",
      folio: saved.folio,
      dateLabel: today
    });

    y = drawInfoGrid(doc, y, [
      {
        label: "Cliente",
        value: quoteMeta.client
      },
      {
        label: "Contacto",
        value: quoteMeta.contact
      },
      {
        label: "Ciudad",
        value: quoteMeta.city
      },
      {
        label:
          "Ubicacion del proyecto",
        value:
          quoteMeta.projectLocation
      },
      {
        label: "Solucion / Material",
        value: `${quoteMeta.solutionType} / ${quoteMeta.material}`
      },
      {
        label:
          "Instalacion / Entrega",
        value: `${quoteMeta.installationMethod} / ${quoteMeta.estimatedDelivery}`
      }
    ]);

    doc.setFont(
      "helvetica",
      "bold"
    );
    doc.setFontSize(9);
    doc.setTextColor(
      32,
      45,
      54
    );
    doc.text("Concepto", 14, y);
    doc.text("Cantidad", 110, y);
    doc.text("P.Unit", 138, y);
    doc.text("Subtotal", 170, y);
    doc.setDrawColor(
      205,
      204,
      204
    );
    doc.line(
      14,
      y + 2,
      196,
      y + 2
    );

    y += 8;

    doc.setFont(
      "helvetica",
      "normal"
    );

    items.forEach((item) => {
      const unitPrice =
        calculateUnitPrice(
          item,
          catalog
        );
      const subtotal =
        unitPrice *
        item.quantity;

      doc.text(
        item.product.slice(0, 55),
        14,
        y
      );
      doc.text(
        String(item.quantity),
        112,
        y
      );
      doc.text(
        formatCurrency(unitPrice),
        136,
        y
      );
      doc.text(
        formatCurrency(subtotal),
        170,
        y
      );

      y += 7;

      if (y > 240) {
        doc.addPage();
        y = 18;
      }
    });

    y += 4;
    doc.setDrawColor(
      205,
      204,
      204
    );
    doc.line(
      120,
      y,
      196,
      y
    );
    y += 7;

    doc.setFont(
      "helvetica",
      "normal"
    );
    doc.setFontSize(9);
    doc.setTextColor(
      100,
      116,
      139
    );
    doc.text(
      `Subtotal: ${formatCurrency(totals.subtotal)}`,
      196,
      y,
      { align: "right" }
    );
    y += 5;
    doc.text(
      `Instalacion: ${formatCurrency(totals.installation)}`,
      196,
      y,
      { align: "right" }
    );
    y += 5;
    doc.text(
      `IVA 16%: ${formatCurrency(totals.iva)}`,
      196,
      y,
      { align: "right" }
    );
    y += 8;

    y = drawTotalBox(
      doc,
      y,
      "Total",
      totals.total
    );

    doc.setFont(
      "helvetica",
      "normal"
    );
    doc.setFontSize(9);
    doc.setTextColor(
      32,
      45,
      54
    );
    doc.text(
      "Condiciones:",
      14,
      y
    );
    y += 6;

    const conditions =
      values.observations ||
      "Vigencia 15 dias. Sujeto a validacion tecnica final.";

    doc.text(
      doc.splitTextToSize(
        `- ${conditions}`,
        182
      ),
      14,
      y
    );

    drawFooter(doc, {
      lines: [
        `Documento generado desde ${brand.crmName}.`
      ],
      contact:
        brand.name
    });

    doc.save(
      `${saved.folio}.pdf`
    );

    const metadataResponse =
      await fetch(
        "/api/quotes/pdf",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            quoteId: saved.id,
            version: 1,
            generatedAt:
              new Date().toISOString(),
            total: totals.total,
            status: "GENERATED"
          })
        }
      );

    if (!metadataResponse.ok) {
      setOperationMessage(
        `${saved.folio}: PDF descargado, pero no se pudo registrar el evento en el historial.`
      );
      return;
    }

    setOperationMessage(
      `${saved.folio}: PDF generado y registrado.`
    );

    await loadHistory();
  }

  function loadSavedQuote(
    quote: SavedQuote
  ) {
    const solutionType =
      asSolutionType(
        quote.solutionType
      );
    const material =
      asMaterial(quote.material);

    form.reset({
      client: quote.client,
      contact: quote.contact,
      email: quote.email,
      phone: quote.phone,
      city: quote.city,
      projectLocation:
        quote.projectLocation ||
        quote.city,
      spaceType:
        asSpaceType(
          quote.spaceType
        ),
      urgency:
        asUrgency(
          quote.urgency
        ),
      solutionType,
      material,
      usage:
        asUsage(
          quote.usage
        ),
      installationMethod:
        asInstallationMethod(
          quote.installationMethod
        ),
      estimatedDelivery:
        quote.estimatedDelivery ||
        "3 a 4 semanas",
      observations:
        quote.observations ||
        "Vigencia de cotizacion: 15 dias."
    });

    setItems(
      quote.items.length > 0
        ? quote.items.map(
            (item) => ({
              id:
                crypto.randomUUID(),
              product:
                item.productName,
              description:
                item.description,
              solutionType:
                asSolutionType(
                  item.solutionType
                ),
              material,
              unit: item.unit,
              quantity:
                item.quantity,
              unitPrice:
                item.unitPrice,
              installationRequired:
                item.installationCost >
                0,
              notes:
                item.notes ??
                undefined
            })
          )
        : [
            defaultItem(
              solutionType,
              material
            )
          ]
    );

    setPersistedQuote({
      id: quote.id,
      folio: quote.folio,
      status: quote.status
    });
    setStep(1);
    setOperationMessage(
      `${quote.folio} cargada para continuar editando.`
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] xl:items-start">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-brand-background/35">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>
                Cotizador comercial
              </CardTitle>
              <CardDescription>
                La cotizacion es preparada y controlada
                por un ejecutivo de {brand.name}.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() =>
                void saveQuote("DRAFT")
              }
            >
              {saving
                ? "Guardando..."
                : "Guardar borrador"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {persistedQuote ? (
            <div className="rounded-2xl border bg-brand-background p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-brand-ink">
                  {persistedQuote.folio}
                </p>
                <Badge variant="secondary">
                  {statusLabels[
                    persistedQuote.status
                  ]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Los cambios se guardan en la base del CRM.
              </p>
            </div>
          ) : null}

          {quoteHistory.length > 0 ? (
            <section className="rounded-2xl border bg-white p-4">
              <div className="mb-3">
                <p className="font-semibold text-brand-ink">
                  Historial de cotizaciones
                </p>
                <p className="text-sm text-muted-foreground">
                  Abre una cotizacion anterior para continuar trabajando.
                </p>
              </div>

              <div className="space-y-2">
                {quoteHistory.map(
                  (quote) => (
                    <div
                      key={quote.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">
                            {quote.folio}
                          </p>
                          <Badge variant="outline">
                            {statusLabels[
                              quote.status
                            ]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(
                            quote.updatedAt.slice(
                              0,
                              10
                            )
                          )}{" "}
                          ·{" "}
                          {formatCurrency(
                            quote.total
                          )}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          loadSavedQuote(
                            quote
                          )
                        }
                      >
                        Abrir
                      </Button>
                    </div>
                  )
                )}
              </div>
            </section>
          ) : null}

          <section
            className="rounded-2xl border bg-white p-4"
            aria-label="Avance general de la cotizacion"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-ink">
                  Paso {step} de 4 · {guidedStepLabels[step].shortTitle}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {guidanceText}
                </p>
              </div>

              <Badge
                variant={
                  currentStepReady
                    ? "success"
                    : "secondary"
                }
              >
                {currentStepReady
                  ? "Listo para avanzar"
                  : `${currentPending.length} pendiente${
                      currentPending.length === 1
                        ? ""
                        : "s"
                    }`}
              </Badge>
            </div>

            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${progressPercent}%`
                }}
              />
            </div>
          </section>

          <div
            className="grid gap-2 sm:grid-cols-4"
            aria-label="Progreso del cotizador"
          >
            {wizardSteps.map(
              (wizardStep) => {
                const isCurrent =
                  step ===
                  wizardStep.id;
                const isDone =
                  maxVisitedStep >
                  wizardStep.id;

                return (
                  <button
                    key={
                      wizardStep.id
                    }
                    type="button"
                    disabled={
                      wizardStep.id >
                      maxVisitedStep
                    }
                    onClick={() =>
                      openVisitedStep(
                        wizardStep.id as WizardStep
                      )
                    }
                    className={`rounded-2xl border p-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 ${
                      isCurrent
                        ? "border-primary bg-primary/5 shadow-sm"
                        : wizardStep.id <=
                            maxVisitedStep
                          ? "bg-white hover:border-primary/50 motion-safe:hover:-translate-y-0.5"
                          : "cursor-not-allowed bg-white opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isDone ? (
                        <CheckCircle2
                          className="h-4 w-4 text-[#2a8026]"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                          {
                            wizardStep.id
                          }
                        </span>
                      )}

                      <p className="text-sm font-semibold text-brand-ink">
                        {
                          wizardStep.title
                        }
                      </p>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {
                        wizardStep.description
                      }
                    </p>

                    <Badge
                      variant={
                        isCurrent
                          ? "default"
                          : isDone
                            ? "success"
                            : "secondary"
                      }
                      className="mt-2"
                    >
                      {isCurrent
                        ? "Actual"
                        : isDone
                          ? "Completado"
                          : "Pendiente"}
                    </Badge>
                    {wizardStep.id <=
                      maxVisitedStep &&
                    !isCurrent ? (
                      <p className="mt-2 text-[11px] font-medium text-primary">
                        Haz clic para volver
                      </p>
                    ) : null}
                  </button>
                );
              }
            )}
          </div>

          <form
            id="quote-wizard-form"
            className="scroll-mt-6 space-y-6"
            onSubmit={form.handleSubmit(
              () =>
                void openPreview()
            )}
          >
            <div
              className={`ui-help flex items-start gap-3 rounded-2xl p-4 ${
                currentStepReady
                  ? "border-primary/25 bg-primary/5"
                  : "border-primary/15 bg-primary/[0.035]"
              }`}
            >
              {currentStepReady ? (
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#2a8026]"
                  aria-hidden="true"
                />
              ) : (
                <CircleHelp
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
              )}

              <div>
                <p className="text-sm font-semibold text-brand-ink">
                  {currentStepReady
                    ? "Este paso ya esta listo"
                    : "Para continuar"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {guidanceText}
                </p>

                {!currentStepReady &&
                currentPending.length > 1 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tambien falta:{" "}
                    {currentPending
                      .slice(1, 4)
                      .join(", ")}
                  </p>
                ) : null}
              </div>
            </div>

            {step === 1 ? (
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-brand-ink">
                  1. Cliente y proyecto
                </h3>

                {isCascadeLead ? (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                    <p className="font-semibold text-brand-ink">
                      Datos heredados del prospecto {initialLead?.leadCode}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Cliente, contacto, correo, telefono y ciudad vienen del prospecto.
                      Para corregirlos, edita el prospecto; no vuelvas a capturarlos aqui.
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client">
                      Cliente
                    </Label>
                    <Input
                      id="client"
                      readOnly={isCascadeLead}
                      className={isCascadeLead ? "bg-muted/60" : undefined}
                      {...form.register(
                        "client"
                      )}
                    />
                    {form.formState.errors.client ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.client?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact">
                      Contacto
                    </Label>
                    <Input
                      id="contact"
                      readOnly={isCascadeLead}
                      className={isCascadeLead ? "bg-muted/60" : undefined}
                      {...form.register(
                        "contact"
                      )}
                    />
                    {form.formState.errors.contact ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.contact?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Correo
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      readOnly={isCascadeLead}
                      className={isCascadeLead ? "bg-muted/60" : undefined}
                      {...form.register(
                        "email"
                      )}
                    />
                    {form.formState.errors.email ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.email?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Telefono
                    </Label>
                    <Input
                      id="phone"
                      readOnly={isCascadeLead}
                      className={isCascadeLead ? "bg-muted/60" : undefined}
                      {...form.register(
                        "phone"
                      )}
                    />
                    {form.formState.errors.phone ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.phone?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">
                      Ciudad
                    </Label>
                    <Input
                      id="city"
                      readOnly={isCascadeLead}
                      className={isCascadeLead ? "bg-muted/60" : undefined}
                      {...form.register(
                        "city"
                      )}
                    />
                    {form.formState.errors.city ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.city?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="projectLocation">
                        Ubicacion del proyecto
                      </Label>
                      <span className="text-[11px] font-medium text-primary">
                        Completa este dato
                      </span>
                    </div>
                    <Input
                      id="projectLocation"
                      {...form.register(
                        "projectLocation"
                      )}
                    />
                    {form.formState.errors.projectLocation ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.projectLocation?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Tipo de espacio
                    </Label>
                    <Select
                      value={
                        values.spaceType
                      }
                      onValueChange={(
                        value
                      ) =>
                        form.setValue(
                          "spaceType",
                          value as FormValues["spaceType"],
                          {
                            shouldValidate:
                              true
                          }
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {spaceTypes.map(
                          (
                            value
                          ) => (
                            <SelectItem
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {
                                value
                              }
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.spaceType ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.spaceType?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Urgencia
                    </Label>
                    <Select
                      value={
                        values.urgency
                      }
                      onValueChange={(
                        value
                      ) =>
                        form.setValue(
                          "urgency",
                          value as FormValues["urgency"],
                          {
                            shouldValidate:
                              true
                          }
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {urgencyLevels.map(
                          (
                            value
                          ) => (
                            <SelectItem
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {
                                value
                              }
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.urgency ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.urgency?.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-brand-ink">
                    2. Solucion / servicio
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ya precargamos una propuesta comercial. Cambia solo lo que no aplique
                    y despues pulsa Siguiente: Partidas.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Tipo de solucion
                    </Label>
                    <Select
                      value={
                        values.solutionType
                      }
                      onValueChange={(
                        value
                      ) => {
                        const solutionType =
                          value as SolutionType;

                        form.setValue(
                          "solutionType",
                          solutionType,
                          {
                            shouldValidate:
                              true
                          }
                        );

                        setItems(
                          (
                            current
                          ) =>
                            current.map(
                              (
                                item
                              ) => ({
                                ...item,
                                solutionType,
                                product:
                                  solutionType,
                                unit:
                                  solutionType ===
                                  "Piso podotactil"
                                    ? "metros lineales"
                                    : "piezas"
                              })
                            )
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {solutionTypes.map(
                          (
                            value
                          ) => (
                            <SelectItem
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {
                                value
                              }
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Material
                    </Label>
                    <Select
                      value={
                        values.material
                      }
                      onValueChange={(
                        value
                      ) => {
                        const material =
                          value as Material;

                        form.setValue(
                          "material",
                          material,
                          {
                            shouldValidate:
                              true
                          }
                        );

                        setItems(
                          (
                            current
                          ) =>
                            current.map(
                              (
                                item
                              ) => ({
                                ...item,
                                material
                              })
                            )
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map(
                          (
                            value
                          ) => (
                            <SelectItem
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {
                                value
                              }
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Uso
                    </Label>
                    <Select
                      value={
                        values.usage
                      }
                      onValueChange={(
                        value
                      ) =>
                        form.setValue(
                          "usage",
                          value as FormValues["usage"],
                          {
                            shouldValidate:
                              true
                          }
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {usageTypes.map(
                          (
                            value
                          ) => (
                            <SelectItem
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {
                                value
                              }
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Metodo de instalacion
                    </Label>
                    <Select
                      value={
                        values.installationMethod
                      }
                      onValueChange={(
                        value
                      ) =>
                        form.setValue(
                          "installationMethod",
                          value as InstallationMethod,
                          {
                            shouldValidate:
                              true
                          }
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {installationMethods.map(
                          (
                            value
                          ) => (
                            <SelectItem
                              key={
                                value
                              }
                              value={
                                value
                              }
                            >
                              {
                                value
                              }
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="estimatedDelivery">
                      Tiempo estimado de entrega
                    </Label>
                    <Input
                      id="estimatedDelivery"
                      {...form.register(
                        "estimatedDelivery"
                      )}
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-brand-ink">
                      3. Partidas
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Revisa cantidades y conceptos. Agrega otra partida solo si
                      el proyecto incluye mas de una solucion.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addItem}
                  >
                    <Plus
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    Agregar partida
                  </Button>
                </div>

                <div className="space-y-3">
                  {items.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border bg-white p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="font-semibold text-brand-ink">
                            Partida{" "}
                            {index +
                              1}
                          </p>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeItem(
                                item.id
                              )
                            }
                          >
                            <Trash2
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>
                              Producto
                            </Label>
                            <Input
                              value={
                                item.product
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    product:
                                      event
                                        .target
                                        .value
                                  }
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>
                              Descripcion
                            </Label>
                            <Input
                              value={
                                item.description
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    description:
                                      event
                                        .target
                                        .value
                                  }
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>
                              Unidad
                            </Label>
                            <Input
                              value={
                                item.unit
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    unit:
                                      event
                                        .target
                                        .value
                                  }
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>
                              Cantidad
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              value={
                                item.quantity
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    quantity:
                                      Number(
                                        event
                                          .target
                                          .value
                                      ) ||
                                      1
                                  }
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>
                              Precio unitario
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              value={calculateUnitPrice(
                                item,
                                catalog
                              )}
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    unitPrice:
                                      Number(
                                        event
                                          .target
                                          .value
                                      ) ||
                                      undefined
                                  }
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>
                              Subtotal
                            </Label>
                            <Input
                              value={formatCurrency(
                                calculateUnitPrice(
                                  item,
                                  catalog
                                ) *
                                  item.quantity
                              )}
                              readOnly
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label>
                              Notas de la partida
                            </Label>
                            <Textarea
                              value={
                                item.notes ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    notes:
                                      event
                                        .target
                                        .value
                                  }
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="rounded-2xl border bg-brand-background p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p className="text-sm text-muted-foreground">
                      Subtotal:{" "}
                      <strong>
                        {formatCurrency(
                          totals.subtotal
                        )}
                      </strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Instalacion:{" "}
                      <strong>
                        {formatCurrency(
                          totals.installation
                        )}
                      </strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      IVA 16%:{" "}
                      <strong>
                        {formatCurrency(
                          totals.iva
                        )}
                      </strong>
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      Total:{" "}
                      {formatCurrency(
                        totals.total
                      )}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {step === 4 ? (
              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-brand-ink">
                    4. Revision y control
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Primero guarda el borrador para obtener folio. Despues revisa
                    el PDF y cambia el estado cuando corresponda.
                  </p>
                </div>

                <div className="grid gap-4 rounded-2xl border bg-white p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Cliente y proyecto
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {quoteMeta.client} ·{" "}
                      {quoteMeta.contact}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {quoteMeta.city}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {
                        quoteMeta.projectLocation
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Condiciones comerciales
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {
                        quoteMeta.solutionType
                      }{" "}
                      ·{" "}
                      {
                        quoteMeta.material
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Metodo:{" "}
                      {
                        quoteMeta.installationMethod
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Entrega estimada:{" "}
                      {
                        quoteMeta.estimatedDelivery
                      }
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="observations">
                      Condiciones y notas
                    </Label>
                    <Textarea
                      id="observations"
                      {...form.register(
                        "observations"
                      )}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() =>
                      void saveQuote(
                        "DRAFT"
                      )
                    }
                    disabled={saving}
                  >
                    Guardar borrador
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void openPreview()
                    }
                  >
                    <Eye
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    Vista previa
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void generatePdf()
                    }
                    disabled={saving}
                  >
                    <FileDown
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    Generar PDF
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void saveQuote(
                        "SENT"
                      )
                    }
                    disabled={saving}
                  >
                    Marcar enviada
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void saveQuote(
                        "ACCEPTED"
                      )
                    }
                    disabled={saving}
                  >
                    Marcar aceptada
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void saveQuote(
                        "REJECTED"
                      )
                    }
                    disabled={saving}
                  >
                    Marcar rechazada
                  </Button>
                </div>

                {operationMessage ? (
                  <div className="rounded-xl border bg-brand-background p-3 text-sm text-muted-foreground">
                    {operationMessage}
                  </div>
                ) : null}
              </section>
            ) : null}

            {stepError ? (
              <p className="text-sm text-destructive">
                {stepError}
              </p>
            ) : null}

            <div className="sticky bottom-3 z-10 rounded-2xl border border-border/80 bg-white/95 p-3 shadow-[0_18px_45px_-30px_hsl(var(--brand-ink)/0.55)] backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  disabled={step === 1}
                >
                  <ChevronLeft
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  Anterior
                </Button>

                <div className="ml-auto flex items-center gap-3">
                  {step < 4 ? (
                    <>
                      <div className="hidden text-right sm:block">
                        <p
                          className={`text-xs font-semibold ${
                            currentStepReady
                              ? "text-[#2a8026]"
                              : "text-muted-foreground"
                          }`}
                        >
                          {currentStepReady
                            ? "Todo listo · continua aqui"
                            : `Falta: ${currentPending[0] ?? "revisar este paso"}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Siguiente paso: {guidedStepLabels[step].action}
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={() =>
                          void goNext()
                        }
                        className={
                          currentStepReady
                            ? "ring-2 ring-primary/20 ring-offset-2"
                            : undefined
                        }
                      >
                        Siguiente:{" "}
                        {guidedStepLabels[step].action}
                        <ChevronRight
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="hidden text-right sm:block">
                        <p className="text-xs font-semibold text-primary">
                          Ultimo paso
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Revisa antes de generar el documento.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        variant="accent"
                      >
                        Abrir vista previa
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="xl:sticky xl:top-[80px] xl:self-start">
        <QuotePreview
          folio={persistedQuote?.folio}
          quoteMeta={quoteMeta}
          observations={
            values.observations
          }
          items={items}
          catalog={catalog}
        />
      </div>

      <Dialog
        open={previewOpen}
        onOpenChange={
          setPreviewOpen
        }
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Vista previa de cotizacion
            </DialogTitle>
            <DialogDescription>
              Revisa el documento antes
              de generar el PDF.
            </DialogDescription>
          </DialogHeader>

          <QuotePreview
            folio={persistedQuote?.folio}
            quoteMeta={quoteMeta}
            observations={
              values.observations
            }
            items={items}
            catalog={catalog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
