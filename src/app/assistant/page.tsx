import { redirect } from "next/navigation";

// The standalone Assistant screen is now the home screen ("/") — this route
// exists only to catch old links/bookmarks and send them to the right place.
export default function AssistantRedirect() {
  redirect("/");
}
