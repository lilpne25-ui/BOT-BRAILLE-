export function startOfLocalDay(
  value: Date
) {
  const result =
    new Date(value);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

export function daysUntil(
  target: Date,
  from = new Date()
) {
  const start =
    startOfLocalDay(
      from
    ).getTime();
  const end =
    startOfLocalDay(
      target
    ).getTime();

  return Math.ceil(
    (end - start) /
      86_400_000
  );
}

export function isDue(
  target: Date,
  from = new Date()
) {
  return (
    daysUntil(
      target,
      from
    ) <= 0
  );
}

export function isWithinDays(
  target: Date,
  days: number,
  from = new Date()
) {
  const remaining =
    daysUntil(
      target,
      from
    );

  return (
    remaining >= 0 &&
    remaining <= days
  );
}

export function quoteStatusLabel(
  status: string
) {
  if (status === "DRAFT") {
    return "Borrador";
  }

  if (status === "SENT") {
    return "Enviada";
  }

  if (status === "ACCEPTED") {
    return "Aceptada";
  }

  if (status === "REJECTED") {
    return "Rechazada";
  }

  return status;
}

export function projectStatusLabel(
  status: string
) {
  if (
    status ===
    "TECHNICAL_DIAGNOSIS"
  ) {
    return "Diagnostico tecnico";
  }

  if (status === "QUOTED") {
    return "Cotizado";
  }

  if (status === "APPROVED") {
    return "Aprobado";
  }

  if (
    status ===
    "IN_PRODUCTION"
  ) {
    return "En produccion";
  }

  if (
    status ===
    "SCHEDULED_INSTALLATION"
  ) {
    return "Instalacion programada";
  }

  if (
    status ===
    "IN_INSTALLATION"
  ) {
    return "En instalacion";
  }

  if (status === "INSTALLED") {
    return "Instalado";
  }

  if (status === "CLOSED") {
    return "Cerrado";
  }

  return status;
}

export function warrantyStatusLabel(
  status: string
) {
  if (status === "ACTIVE") {
    return "Activa";
  }

  if (status === "EXPIRING") {
    return "Por vencer";
  }

  if (
    status ===
    "REVIEW_REQUIRED"
  ) {
    return "Requiere revision";
  }

  if (
    status ===
    "MAINTENANCE_SCHEDULED"
  ) {
    return "Mantenimiento agendado";
  }

  if (status === "ATTENDED") {
    return "Atendida";
  }

  return status;
}

export function activityTypeLabel(
  type: string
) {
  if (type === "LEAD_CREATED") {
    return "Prospecto";
  }

  if (type === "QUOTE_CREATED") {
    return "Cotizacion";
  }

  if (
    type ===
    "STATUS_CHANGED"
  ) {
    return "Cambio de estado";
  }

  if (type === "PDF_GENERATED") {
    return "PDF";
  }

  if (
    type ===
    "CONVERSATION_CLOSED"
  ) {
    return "Conversacion";
  }

  if (
    type ===
    "CATALOG_UPDATED"
  ) {
    return "Catalogo";
  }

  return type;
}

export function ageInDays(
  value: Date,
  from = new Date()
) {
  return Math.max(
    0,
    -daysUntil(
      value,
      from
    )
  );
}
