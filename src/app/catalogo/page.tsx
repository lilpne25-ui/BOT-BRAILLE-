"use client";

import {
  useEffect,
  useState
} from "react";
import {
  CheckCircle2,
  Clock3,
  Database,
  Package2,
  RefreshCcw,
  Save,
  SlidersHorizontal
} from "lucide-react";
import {
  PageShell
} from "@/components/layout/page-shell";
import {
  Badge
} from "@/components/ui/badge";
import {
  Button
} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Input
} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type DbProduct = {
  id: string;
  name: string;
  solutionType: string;
  defaultUnit: string;
  basePrice: number;
};

type DbMaterial = {
  id: string;
  name: string;
  multiplier: number;
};

type DbUser = {
  id: string;
  name: string;
  email: string;
};

type DbLog = {
  id: string;
  message: string;
  createdAt: string;
  user: DbUser | null;
};

export default function CatalogPage() {
  const [
    products,
    setProducts
  ] =
    useState<DbProduct[]>(
      []
    );
  const [
    materials,
    setMaterials
  ] =
    useState<DbMaterial[]>(
      []
    );
  const [
    users,
    setUsers
  ] =
    useState<DbUser[]>(
      []
    );
  const [
    logs,
    setLogs
  ] =
    useState<DbLog[]>(
      []
    );
  const [
    selectedUserId,
    setSelectedUserId
  ] =
    useState("");
  const [
    loading,
    setLoading
  ] =
    useState(true);
  const [
    error,
    setError
  ] =
    useState<
      string | null
    >(null);
  const [
    savingId,
    setSavingId
  ] =
    useState<
      string | null
    >(null);
  const [
    successMessage,
    setSuccessMessage
  ] =
    useState<
      string | null
    >(null);

  async function fetchCatalog() {
    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/catalog"
        );

      if (
        !response.ok
      ) {
        throw new Error(
          "No se pudo cargar el catálogo."
        );
      }

      const data =
        await response.json();

      setProducts(
        data.products ||
          []
      );
      setMaterials(
        data.materials ||
          []
      );
      setUsers(
        data.users ||
          []
      );
      setLogs(
        data.logs ||
          []
      );

      if (
        data.users &&
        data.users.length >
          0 &&
        !selectedUserId
      ) {
        setSelectedUserId(
          data.users[0].id
        );
      }
    } catch (cause) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : "Error desconocido al cargar catálogo"
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  useEffect(() => {
    void fetchCatalog();

    // La carga inicial debe ejecutarse una sola vez;
    // selectedUserId se administra después con el estado local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleProductPriceChange(
    id: string,
    value: string
  ) {
    const numeric =
      Number.parseFloat(
        value
      ) || 0;

    setProducts(
      (current) =>
        current.map(
          (product) =>
            product.id ===
            id
              ? {
                  ...product,
                  basePrice:
                    numeric
                }
              : product
        )
    );
  }

  function handleMaterialMultiplierChange(
    id: string,
    value: string
  ) {
    const numeric =
      Number.parseFloat(
        value
      ) || 0;

    setMaterials(
      (current) =>
        current.map(
          (material) =>
            material.id ===
            id
              ? {
                  ...material,
                  multiplier:
                    numeric
                }
              : material
        )
    );
  }

  async function saveProductPrice(
    product: DbProduct
  ) {
    if (
      !selectedUserId
    ) {
      setError(
        "Debes seleccionar un responsable antes de guardar."
      );
      return;
    }

    setSavingId(
      product.id
    );
    setSuccessMessage(
      null
    );
    setError(null);

    try {
      const response =
        await fetch(
          "/api/catalog",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                type:
                  "product",
                id:
                  product.id,
                basePrice:
                  product.basePrice,
                userId:
                  selectedUserId
              })
          }
        );

      if (
        !response.ok
      ) {
        const errorData =
          await response.json();

        throw new Error(
          errorData.error ||
            "No se pudo actualizar el precio."
        );
      }

      setSuccessMessage(
        `Precio de "${product.name}" actualizado a $${product.basePrice.toLocaleString(
          "es-MX"
        )} MXN.`
      );

      window.setTimeout(
        () =>
          setSuccessMessage(
            null
          ),
        5000
      );

      await fetchCatalog();
    } catch (cause) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : "Error al guardar precio"
      );
    } finally {
      setSavingId(
        null
      );
    }
  }

  async function saveMaterialMultiplier(
    material: DbMaterial
  ) {
    if (
      !selectedUserId
    ) {
      setError(
        "Debes seleccionar un responsable antes de guardar."
      );
      return;
    }

    setSavingId(
      material.id
    );
    setSuccessMessage(
      null
    );
    setError(null);

    try {
      const response =
        await fetch(
          "/api/catalog",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                type:
                  "material",
                id:
                  material.id,
                multiplier:
                  material.multiplier,
                userId:
                  selectedUserId
              })
          }
        );

      if (
        !response.ok
      ) {
        const errorData =
          await response.json();

        throw new Error(
          errorData.error ||
            "No se pudo actualizar el multiplicador."
        );
      }

      setSuccessMessage(
        `Multiplicador de "${material.name}" actualizado a ${material.multiplier}x.`
      );

      window.setTimeout(
        () =>
          setSuccessMessage(
            null
          ),
        5000
      );

      await fetchCatalog();
    } catch (cause) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : "Error al guardar multiplicador"
      );
    } finally {
      setSavingId(
        null
      );
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <section className="ui-page-hero">
          <div className="ui-page-hero-grid">
            <div>
              <p className="ui-page-eyebrow">Administración comercial</p>
              <h1 className="ui-page-title">Catálogo y reglas de precio</h1>
              <p className="ui-page-description">
                Administra precios base y multiplicadores utilizados por el cotizador y los módulos que consumen el catálogo.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border bg-white p-3 shadow-sm sm:flex-row sm:items-center">
            {users.length >
            0 ? (
              <div className="min-w-[220px]">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Responsable del cambio
                </p>

                <Select
                  value={
                    selectedUserId
                  }
                  onValueChange={
                    setSelectedUserId
                  }
                >
                  <SelectTrigger
                    aria-label="Seleccionar responsable del cambio"
                  >
                    <SelectValue placeholder="Selecciona responsable" />
                  </SelectTrigger>

                  <SelectContent>
                    {users.map(
                      (user) => (
                        <SelectItem
                          key={
                            user.id
                          }
                          value={
                            user.id
                          }
                        >
                          {
                            user.name
                          }
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="sm:self-end"
              onClick={() =>
                void fetchCatalog()
              }
              disabled={
                loading
              }
            >
              <RefreshCcw
                className={`h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
                aria-hidden="true"
              />
              Actualizar
            </Button>
            </div>
          </div>
        </section>

        <section
          className="grid gap-4 sm:grid-cols-3"
          aria-label="Resumen del catálogo"
        >
          <Card className="ui-kpi-card ui-surface-hover">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Soluciones
                </p>
                <p className="mt-1 text-2xl font-black text-brand-ink">
                  {
                    products.length
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Package2
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="ui-kpi-card ui-surface-hover">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Materiales
                </p>
                <p className="mt-1 text-2xl font-black text-brand-ink">
                  {
                    materials.length
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-accent/10 p-3 text-accent">
                <SlidersHorizontal
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="ui-kpi-card ui-surface-hover">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Cambios auditados
                </p>
                <p className="mt-1 text-2xl font-black text-brand-ink">
                  {
                    logs.length
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-secondary p-3 text-brand-ink">
                <Clock3
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {successMessage ? (
          <div
            className="ui-success flex items-start gap-3 rounded-2xl p-4 text-sm shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {
              successMessage
            }
          </div>
        ) : null}

        {error ? (
          <div
            className="ui-danger rounded-2xl p-4 text-sm"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        ) : null}

        {loading &&
        products.length ===
          0 ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {[0, 1].map(
              (item) => (
                <Card
                  key={
                    item
                  }
                >
                  <CardContent className="space-y-4 p-6">
                    <div className="ui-skeleton h-6 w-52 rounded-lg" />
                    <div className="ui-skeleton h-16 w-full rounded-xl" />
                    <div className="ui-skeleton h-16 w-full rounded-xl" />
                    <div className="ui-skeleton h-16 w-full rounded-xl" />
                  </CardContent>
                </Card>
              )
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/80 bg-brand-background/55">
                  <CardTitle className="inline-flex items-center gap-2">
                    <Database
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                    Precios base
                  </CardTitle>

                  <CardDescription>
                    Precio unitario predeterminado de cada solución comercial.
                  </CardDescription>
                </CardHeader>

                <CardContent className="divide-y divide-border/80 p-0">
                  {products.map(
                    (
                      product
                    ) => {
                      const isSaving =
                        savingId ===
                        product.id;

                      return (
                        <div
                          key={
                            product.id
                          }
                          className="grid gap-3 p-4 transition-colors hover:bg-primary/[0.025] sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"
                        >
                          <div>
                            <p className="font-semibold text-brand-ink">
                              {
                                product.name
                              }
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge variant="secondary">
                                {
                                  product.defaultUnit
                                }
                              </Badge>
                              {product.solutionType ? (
                                <Badge variant="outline">
                                  {
                                    product.solutionType
                                  }
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                $
                              </span>

                              <Input
                                type="number"
                                className="w-32 pl-6"
                                value={
                                  product.basePrice
                                }
                                onChange={(
                                  event
                                ) =>
                                  handleProductPriceChange(
                                    product.id,
                                    event.target.value
                                  )
                                }
                                disabled={
                                  isSaving
                                }
                                aria-label={`Precio base para ${product.name}`}
                              />
                            </div>

                            <span className="text-xs font-bold text-muted-foreground">
                              MXN
                            </span>

                            <Button
                              size="sm"
                              onClick={() =>
                                void saveProductPrice(
                                  product
                                )
                              }
                              disabled={
                                isSaving
                              }
                            >
                              <Save
                                className={`h-4 w-4 ${
                                  isSaving
                                    ? "animate-pulse"
                                    : ""
                                }`}
                                aria-hidden="true"
                              />
                              {isSaving
                                ? "Guardando"
                                : "Guardar"}
                            </Button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/80 bg-brand-background/55">
                  <CardTitle className="inline-flex items-center gap-2">
                    <SlidersHorizontal
                      className="h-5 w-5 text-accent"
                      aria-hidden="true"
                    />
                    Multiplicadores de materiales
                  </CardTitle>

                  <CardDescription>
                    Factor de ajuste aplicado al material seleccionado.
                  </CardDescription>
                </CardHeader>

                <CardContent className="divide-y divide-border/80 p-0">
                  {materials.map(
                    (
                      material
                    ) => {
                      const isSaving =
                        savingId ===
                        material.id;

                      return (
                        <div
                          key={
                            material.id
                          }
                          className="grid gap-3 p-4 transition-colors hover:bg-primary/[0.025] sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"
                        >
                          <div>
                            <p className="font-semibold text-brand-ink">
                              {
                                material.name
                              }
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Factor de ajuste de costo
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24"
                              value={
                                material.multiplier
                              }
                              onChange={(
                                event
                              ) =>
                                handleMaterialMultiplierChange(
                                  material.id,
                                  event.target.value
                                )
                              }
                              disabled={
                                isSaving
                              }
                              aria-label={`Multiplicador para ${material.name}`}
                            />

                            <span className="text-xs font-bold text-muted-foreground">
                              ×
                            </span>

                            <Button
                              size="sm"
                              onClick={() =>
                                void saveMaterialMultiplier(
                                  material
                                )
                              }
                              disabled={
                                isSaving
                              }
                            >
                              <Save
                                className={`h-4 w-4 ${
                                  isSaving
                                    ? "animate-pulse"
                                    : ""
                                }`}
                                aria-hidden="true"
                              />
                              {isSaving
                                ? "Guardando"
                                : "Guardar"}
                            </Button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/80 bg-brand-background/45">
                <CardTitle className="inline-flex items-center gap-2">
                  <Clock3
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                  Historial de cambios
                </CardTitle>

                <CardDescription>
                  Auditoría de modificaciones realizadas sobre precios y multiplicadores.
                </CardDescription>
              </CardHeader>

              <CardContent className="ui-panel-scroll max-h-[420px] overflow-y-auto p-4 sm:p-6">
                {logs.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center">
                    <Clock3
                      className="mx-auto h-6 w-6 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <p className="mt-3 text-sm font-semibold text-brand-ink">
                      Sin cambios registrados
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Las modificaciones aparecerán aquí con usuario y fecha.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map(
                      (log) => (
                        <div
                          key={
                            log.id
                          }
                          className="ui-surface-hover flex flex-col gap-3 rounded-2xl border bg-white p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-brand-ink">
                              {
                                log.message
                              }
                            </p>

                            {log.user ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Responsable:{" "}
                                {
                                  log.user.name
                                }{" "}
                                ·{" "}
                                {
                                  log.user.email
                                }
                              </p>
                            ) : null}
                          </div>

                          <Badge
                            variant="secondary"
                            className="w-fit shrink-0"
                          >
                            {new Date(
                              log.createdAt
                            ).toLocaleString(
                              "es-MX",
                              {
                                day:
                                  "2-digit",
                                month:
                                  "short",
                                year:
                                  "numeric",
                                hour:
                                  "2-digit",
                                minute:
                                  "2-digit"
                              }
                            )}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}
