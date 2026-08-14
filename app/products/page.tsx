import { Suspense } from "react";
import ProductsClient from "./ProductsClient";
import { GridSkeleton } from "@/components/Skeleton";

export const dynamic = "force-dynamic";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-6"><GridSkeleton count={8} /></div>}>
      <ProductsClient />
    </Suspense>
  );
}
