import { redirect } from "next/navigation";

/**
 * `/profile` folded into `/settings/connections` in the redesign — keep the URL
 * working (old links, bookmarks) by redirecting.
 */
export default function Profile() {
  redirect("/settings/connections");
}
