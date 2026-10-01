import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [products, materials, users, logs] = await Promise.all([
      prisma.product.findMany({ orderBy: { name: "asc" } }),
      prisma.material.findMany({ orderBy: { name: "asc" } }),
      prisma.user.findMany({ orderBy: { name: "asc" } }),
      prisma.activityLog.findMany({
        where: { type: "CATALOG_UPDATED" },
        orderBy: { createdAt: "desc" },
        include: { user: true },
        take: 30
      })
    ]);
    return NextResponse.json({ products, materials, users, logs });
  } catch (error) {
    console.error("Failed to fetch catalog", error);
    return NextResponse.json({ error: "Failed to fetch catalog" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, id, basePrice, multiplier, userId } = body;

    if (!type || !id || !userId) {
      return NextResponse.json({ error: "Missing type, id or userId" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    if (type === "product") {
      if (typeof basePrice !== "number" || basePrice < 0) {
        return NextResponse.json({ error: "Invalid basePrice" }, { status: 400 });
      }

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { basePrice }
      });

      await prisma.activityLog.create({
        data: {
          type: "CATALOG_UPDATED",
          userId: user.id,
          message: `${user.name} actualizó el precio base de "${existing.name}" de $${existing.basePrice.toLocaleString("es-MX")} a $${basePrice.toLocaleString("es-MX")} MXN.`,
          metadata: {
            itemType: "product",
            itemId: id,
            name: existing.name,
            oldValue: existing.basePrice,
            newValue: basePrice
          }
        }
      });

      return NextResponse.json({ success: true, product: updatedProduct });
    }

    if (type === "material") {
      if (typeof multiplier !== "number" || multiplier < 0) {
        return NextResponse.json({ error: "Invalid multiplier" }, { status: 400 });
      }

      const existing = await prisma.material.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Material not found" }, { status: 404 });
      }

      const updatedMaterial = await prisma.material.update({
        where: { id },
        data: { multiplier }
      });

      await prisma.activityLog.create({
        data: {
          type: "CATALOG_UPDATED",
          userId: user.id,
          message: `${user.name} actualizó el multiplicador de "${existing.name}" de ${existing.multiplier}x a ${multiplier}x.`,
          metadata: {
            itemType: "material",
            itemId: id,
            name: existing.name,
            oldValue: existing.multiplier,
            newValue: multiplier
          }
        }
      });

      return NextResponse.json({ success: true, material: updatedMaterial });
    }

    return NextResponse.json({ error: "Invalid catalog item type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update catalog item", error);
    return NextResponse.json({ error: "Failed to update catalog item" }, { status: 500 });
  }
}
