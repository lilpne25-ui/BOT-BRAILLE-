import {
  getBrandByCode,
  resolveBrandCode
} from "@/lib/brand/catalog";

export function getPublicBrand() {
  return getBrandByCode(
    resolveBrandCode(
      process.env
        .NEXT_PUBLIC_CRM_INSTANCE_CODE
    )
  );
}
