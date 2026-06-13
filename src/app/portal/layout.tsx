import type { ReactNode } from "react";
import { PortalChrome } from "./portal-ui";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <PortalChrome>{children}</PortalChrome>;
}
