import {
  CheckCircle2,
  Layers3,
  ShieldCheck
} from "lucide-react";
import {
  LoginForm
} from "@/components/auth/login-form";
import {
  getServerBrand
} from "@/lib/brand/server";

type LoginPageProps = {
  searchParams?: Record<
    string,
    string |
    string[] |
    undefined
  >;
};

function getParam(
  value:
    | string
    | string[]
    | undefined
) {
  return typeof value ===
    "string"
    ? value
    : undefined;
}

export default function LoginPage({
  searchParams
}: LoginPageProps) {
  const brand =
    getServerBrand();

  return (
    <div className="min-h-screen bg-brand-background">
      <div className="grid min-h-screen lg:grid-cols-[0.98fr_1.02fr]">
        <section className="brand-hero brand-login-grid relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="relative z-10 animate-in fade-in slide-in-from-top-2 duration-500 motion-reduce:animate-none">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black uppercase tracking-[0.22em] text-white/75 backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EB5B28]" aria-hidden="true" />
              Demo operativa
            </div>
          </div>

          <div className="relative z-10 max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-white/65">
              {brand.crmName}
            </p>

            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.06] tracking-tight xl:text-5xl">
              Comercial, proyectos y postventa en un mismo flujo.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-white/75">
              Una operación conectada desde el prospecto hasta la garantía, diseñada con la identidad visual de {brand.name}.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon:
                    Layers3,
                  label:
                    "Flujo en cascada"
                },
                {
                  icon:
                    ShieldCheck,
                  label:
                    "Acceso por permisos"
                },
                {
                  icon:
                    CheckCircle2,
                  label:
                    "Datos operativos reales"
                }
              ].map(
                ({
                  icon: Icon,
                  label
                }) => (
                  <div
                    key={
                      label
                    }
                    className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"
                  >
                    <Icon
                      className="h-5 w-5 text-[#EB5B28]"
                      aria-hidden="true"
                    />
                    <p className="mt-3 text-sm font-semibold text-white/90">
                      {label}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="relative z-10 text-xs uppercase tracking-[0.18em] text-white/45">
            {brand.tagline}
          </div>
        </section>

        <section className="login-form-pane relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
          <div className="relative z-10 w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
            <LoginForm
              nextPath={
                getParam(
                  searchParams
                    ?.next
                )
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
