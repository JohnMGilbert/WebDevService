import { createClient } from "../utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: tickets } = await supabase.from("tickets").select("id,title,status").order("created_at", {
    ascending: false,
  });

  return (
    <main>
      <h1>True Page Supabase Test</h1>
      <ul>
        {tickets?.map((ticket) => (
          <li key={ticket.id}>
            {ticket.title} - {ticket.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
