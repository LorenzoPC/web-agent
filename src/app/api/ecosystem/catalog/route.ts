import { NextResponse } from "next/server";
import { CATALOG_CATEGORY_COPY, searchCatalogCategory, type CatalogCategory } from "@/lib/catalog-db";

const CATEGORIES = Object.keys(CATALOG_CATEGORY_COPY) as CatalogCategory[];
const DEFAULT_LIMIT = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as CatalogCategory | null;
  if (!category || !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Unknown or missing category" }, { status: 400 });
  }

  const offset = Number(searchParams.get("offset") ?? "0");
  const limit = Number(searchParams.get("limit") ?? String(DEFAULT_LIMIT));

  const { items, hasMore } = await searchCatalogCategory(category, offset, limit);
  const { title, subtitle } = CATALOG_CATEGORY_COPY[category];

  return NextResponse.json({ title, subtitle, items, hasMore });
}
