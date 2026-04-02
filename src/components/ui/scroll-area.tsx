"use client";

import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import type { OverlayScrollbarsComponentProps } from "overlayscrollbars-react";

type Props = {
  className?: string;
  children: React.ReactNode;
} & Pick<OverlayScrollbarsComponentProps, "defer">;

export function ScrollArea({ className, children, defer = true }: Props) {
  return (
    <OverlayScrollbarsComponent
      defer={defer}
      options={{
        scrollbars: {
          theme: "os-theme-light",
          autoHide: "move",
          autoHideDelay: 800,
        },
        overflow: { x: "hidden" },
      }}
      className={className}
    >
      {children}
    </OverlayScrollbarsComponent>
  );
}
