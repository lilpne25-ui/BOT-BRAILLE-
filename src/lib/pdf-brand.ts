import type {
  jsPDF
} from "jspdf";
import {
  getPublicBrand
} from "@/lib/brand/public";

const brand =
  getPublicBrand();

const BI_DESIGN_PDF = {
  primary:
    [27, 156, 217] as [
      number,
      number,
      number
    ],
  accent:
    [235, 91, 40] as [
      number,
      number,
      number
    ],
  ink:
    [32, 45, 54] as [
      number,
      number,
      number
    ],
  muted:
    [99, 108, 114] as [
      number,
      number,
      number
    ],
  border:
    [205, 204, 204] as [
      number,
      number,
      number
    ],
  bandTint:
    [239, 248, 252] as [
      number,
      number,
      number
    ],
  totalBg:
    [25, 30, 57] as [
      number,
      number,
      number
    ]
};

const BRAILLE_PDF = {
  primary:
    [0, 94, 170] as [
      number,
      number,
      number
    ],
  accent:
    [58, 170, 53] as [
      number,
      number,
      number
    ],
  ink:
    [31, 41, 55] as [
      number,
      number,
      number
    ],
  muted:
    [100, 116, 139] as [
      number,
      number,
      number
    ],
  border:
    [217, 226, 236] as [
      number,
      number,
      number
    ],
  bandTint:
    [235, 242, 250] as [
      number,
      number,
      number
    ],
  totalBg:
    [0, 94, 170] as [
      number,
      number,
      number
    ]
};

export const PDF_BRAND =
  brand.code ===
  "BRAILLE"
    ? BRAILLE_PDF
    : BI_DESIGN_PDF;

export const LOGO_PUBLIC_FILENAME =
  brand.logoPath
    ? brand.logoPath.replace(
        /^\//,
        ""
      )
    : "";

const PAGE_WIDTH =
  210;
const MARGIN = 14;
const HEADER_HEIGHT =
  30;

export function money(
  value: number
) {
  return value.toLocaleString(
    "es-MX",
    {
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2
    }
  );
}

export async function loadLogoDataUrlClient(): Promise<
  string | null
> {
  if (
    !LOGO_PUBLIC_FILENAME
  ) {
    return null;
  }

  try {
    const response =
      await fetch(
        `/${LOGO_PUBLIC_FILENAME}`
      );

    if (
      !response.ok
    ) {
      return null;
    }

    const blob =
      await response.blob();

    return await new Promise(
      (resolve) => {
        const reader =
          new FileReader();

        reader.onload = () =>
          resolve(
            typeof reader.result ===
              "string"
              ? reader.result
              : null
          );

        reader.onerror = () =>
          resolve(null);

        reader.readAsDataURL(
          blob
        );
      }
    );
  } catch {
    return null;
  }
}

type LetterheadInput = {
  logoDataUrl:
    string | null;
  subtitle: string;
  folio: string;
  dateLabel: string;
};

export function drawLetterhead(
  doc: jsPDF,
  input: LetterheadInput
) {
  doc.setFillColor(
    ...PDF_BRAND.bandTint
  );
  doc.rect(
    0,
    0,
    PAGE_WIDTH,
    HEADER_HEIGHT,
    "F"
  );

  doc.setFillColor(
    ...PDF_BRAND.accent
  );
  doc.rect(
    0,
    HEADER_HEIGHT - 2,
    PAGE_WIDTH,
    2,
    "F"
  );

  let titleX =
    MARGIN;
  const titleY = 12;

  if (
    input.logoDataUrl
  ) {
    try {
      const props =
        doc.getImageProperties(
          input.logoDataUrl
        );
      const maxHeight =
        18;
      const width =
        (
          props.width /
          props.height
        ) *
        maxHeight;

      doc.addImage(
        input.logoDataUrl,
        "PNG",
        MARGIN,
        5,
        width,
        maxHeight
      );

      titleX =
        MARGIN +
        width +
        6;
    } catch {
      // Fallback to text.
    }
  }

  if (
    titleX ===
    MARGIN
  ) {
    doc.setFont(
      "helvetica",
      "bold"
    );
    doc.setTextColor(
      ...PDF_BRAND.primary
    );
    doc.setFontSize(
      17
    );
    doc.text(
      brand.name,
      titleX,
      titleY
    );
  }

  doc.setFont(
    "helvetica",
    "normal"
  );
  doc.setTextColor(
    ...PDF_BRAND.ink
  );
  doc.setFontSize(10.5);
  doc.text(
    input.subtitle,
    titleX,
    titleX === MARGIN
      ? titleY + 8
      : titleY + 5
  );

  doc.setFontSize(9);
  doc.setTextColor(
    ...PDF_BRAND.muted
  );
  doc.text(
    `Folio: ${input.folio}`,
    PAGE_WIDTH - MARGIN,
    11,
    {
      align: "right"
    }
  );
  doc.text(
    `Fecha: ${input.dateLabel}`,
    PAGE_WIDTH - MARGIN,
    17,
    {
      align: "right"
    }
  );

  return (
    HEADER_HEIGHT + 8
  );
}

type InfoCell = {
  label: string;
  value: string;
};

export function drawInfoGrid(
  doc: jsPDF,
  startY: number,
  cells: InfoCell[],
  columns: 1 | 2 = 2
) {
  const gap = 4;
  const columnWidth =
    (
      PAGE_WIDTH -
      MARGIN * 2 -
      gap *
        (columns - 1)
    ) /
    columns;
  const rowHeight =
    14;
  let y = startY;

  cells.forEach(
    (
      cell,
      index
    ) => {
      const col =
        index %
        columns;

      if (
        col === 0 &&
        index > 0
      ) {
        y +=
          rowHeight +
          gap;
      }

      const x =
        MARGIN +
        col *
          (
            columnWidth +
            gap
          );

      doc.setDrawColor(
        ...PDF_BRAND.border
      );
      doc.setLineWidth(
        0.2
      );
      doc.roundedRect(
        x,
        y,
        columnWidth,
        rowHeight,
        1.5,
        1.5
      );

      doc.setFont(
        "helvetica",
        "bold"
      );
      doc.setFontSize(
        7.5
      );
      doc.setTextColor(
        ...PDF_BRAND.muted
      );
      doc.text(
        cell.label.toUpperCase(),
        x + 3,
        y + 5.5
      );

      doc.setFont(
        "helvetica",
        "normal"
      );
      doc.setFontSize(
        10
      );
      doc.setTextColor(
        ...PDF_BRAND.ink
      );
      doc.text(
        doc.splitTextToSize(
          cell.value ||
            "-",
          columnWidth -
            6
        ),
        x + 3,
        y + 10.5
      );
    }
  );

  return (
    y +
    rowHeight +
    10
  );
}

export function drawTotalBox(
  doc: jsPDF,
  startY: number,
  label: string,
  amount: number
) {
  const boxHeight =
    16;

  doc.setFillColor(
    ...PDF_BRAND.totalBg
  );
  doc.roundedRect(
    MARGIN,
    startY,
    PAGE_WIDTH -
      MARGIN * 2,
    boxHeight,
    2,
    2,
    "F"
  );

  doc.setFont(
    "helvetica",
    "bold"
  );
  doc.setFontSize(12);
  doc.setTextColor(
    255,
    255,
    255
  );
  doc.text(
    label,
    MARGIN + 5,
    startY + 10
  );
  doc.text(
    `$${money(
      amount
    )} MXN`,
    PAGE_WIDTH -
      MARGIN -
      5,
    startY + 10,
    {
      align: "right"
    }
  );

  return (
    startY +
    boxHeight +
    10
  );
}

type FooterInput = {
  lines: string[];
  contact?: string;
};

export function drawFooter(
  doc: jsPDF,
  input: FooterInput
) {
  const pageHeight =
    doc.internal.pageSize.getHeight();
  let y =
    pageHeight -
    8 -
    input.lines.length *
      5 -
    (
      input.contact
        ? 6
        : 0
    );

  doc.setDrawColor(
    ...PDF_BRAND.border
  );
  doc.setLineWidth(
    0.2
  );
  doc.line(
    MARGIN,
    y - 4,
    PAGE_WIDTH -
      MARGIN,
    y - 4
  );

  doc.setFont(
    "helvetica",
    "normal"
  );
  doc.setFontSize(8);
  doc.setTextColor(
    ...PDF_BRAND.muted
  );

  for (
    const line of
    input.lines
  ) {
    doc.text(
      line,
      MARGIN,
      y
    );
    y += 5;
  }

  if (
    input.contact
  ) {
    doc.setFont(
      "helvetica",
      "bold"
    );
    doc.setTextColor(
      ...PDF_BRAND.ink
    );
    doc.text(
      input.contact,
      MARGIN,
      y
    );
  }
}
