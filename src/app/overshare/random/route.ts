import fs from "fs";
import path from "path";
import { redirect } from "next/navigation";

/**
 * Random Breadcrumb Redirect
 * 
 * Redirects to a random breadcrumb page.
 * Perfect for "I'm feeling lucky" / "Discover" functionality.
 * 
 * Visit: /overshare/random
 */

export const dynamic = "force-dynamic";

export function GET() {
  const breadcrumbDir = path.join(process.cwd(), "swl-overshare/breadcrumbs");
  
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(breadcrumbDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  } catch {
    redirect("/overshare");
  }

  if (files.length === 0) {
    redirect("/overshare");
  }

  const randomFile = files[Math.floor(Math.random() * files.length)];
  const slug = randomFile.replace("breadcrumb-", "").replace(".md", "");
  
  redirect(`/overshare/${slug}`);
}

