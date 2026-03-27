import { redirect } from "next/navigation";

/** Self-registration is disabled; admins provision accounts from User management. */
export default function RegisterPage() {
  redirect("/login");
}
