import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const makes = await prisma.vehicleMake.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        models: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true, yearFrom: true, yearTo: true },
        },
      },
    });

    const withCounts = await Promise.all(
      makes.map(async (m) => {
        const models = await Promise.all(
          m.models.map(async (mod) => {
            const count = await prisma.productVehicle.count({
              where: { modelId: mod.id, product: { isActive: true } },
            });
            return { ...mod, productCount: count };
          })
        );
        return { ...m, models };
      })
    );

    return NextResponse.json({ makes: withCounts });
  } catch (error) {
    console.error("Vehicles API error:", error);
    return NextResponse.json({ makes: [] });
  }
}
