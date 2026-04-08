import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

setBaseUrl("https://karhaul-production.up.railway.app");

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={publishableKey}>
    <App />
  </ClerkProvider>,
);
