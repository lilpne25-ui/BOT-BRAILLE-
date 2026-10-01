import {
  getBrandByCode,
  resolveBrandCode
} from "@/lib/brand/catalog";

export function getServerBrand() {
  return getBrandByCode(
    resolveBrandCode(
      process.env
        .CRM_INSTANCE_CODE ??
        process.env
          .NEXT_PUBLIC_CRM_INSTANCE_CODE
    )
  );
}
