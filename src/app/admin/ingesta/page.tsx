import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import BatchIngest from "@/components/admin/BatchIngest";
import { getAdminSession } from "@/lib/admin";

import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function IngestaPage() {
  const session = await getAdminSession();
  if (!session?.isSuper) redirect("/admin"); // super-admin only

  const t = await getTranslations("admin");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#2563a8] hover:underline"
        >
          {t("back_to_panel")}
        </Link>
        <h1 className="mt-3 text-xl font-bold text-[#14212e]">{t("pages.ingesta.title")}</h1>
        <p className="mt-1 text-sm text-[#5b6b7b]">
          {t("pages.ingesta.desc")}
        </p>
        <div className="mt-5">
          <BatchIngest />
        </div>
      </main>
    </>
  );
}
