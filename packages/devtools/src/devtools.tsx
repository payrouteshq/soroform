import * as React from "react";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendLogPanel } from "./send-log-panel.js";
import css from "./styles.generated.css";

export interface SorokitDevtoolsProps {
  initialOpen?: boolean;
}

export function SorokitDevtools(props: SorokitDevtoolsProps) {
  const [isOpen, setIsOpen] = React.useState(props.initialOpen ?? false);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {!isOpen ? (
        <Button
          className="fixed right-4 bottom-4 z-99998 rounded-full"
          onClick={() => setIsOpen(true)}
        >
          Sorokit
        </Button>
      ) : (
        <div className="bg-background text-foreground fixed inset-x-0 bottom-0 z-99999 flex h-88 flex-col border-t">
          <Tabs defaultValue="sends" className="flex min-h-0 flex-1 gap-0">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <TabsList>
                <TabsTrigger value="sends">Sends</TabsTrigger>
                <TabsTrigger value="cache">Query cache</TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
            <TabsContent value="sends" className="min-h-0 flex-1">
              <SendLogPanel />
            </TabsContent>
            <TabsContent value="cache" className="min-h-0 flex-1">
              <ReactQueryDevtoolsPanel style={{ height: "100%", position: "relative" }} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  );
}
