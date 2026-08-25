import { useState } from "react";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WriteLogPanel } from "./write-log-panel.js";
import css from "./styles.generated.css";

export interface SoroformDevtoolsProps {
  initialOpen?: boolean;
}

export function SoroformDevtools(props: SoroformDevtoolsProps) {
  const [isOpen, setIsOpen] = useState(props.initialOpen ?? false);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {!isOpen ? (
        <Button
          className="fixed right-4 bottom-4 z-99998 rounded-full"
          onClick={() => setIsOpen(true)}
        >
          Soroform
        </Button>
      ) : (
        <div className="bg-background text-foreground fixed inset-x-0 bottom-0 z-99999 flex h-88 flex-col border-t">
          <Tabs defaultValue="writes" className="flex min-h-0 flex-1 gap-0">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <TabsList>
                <TabsTrigger value="writes">Writes</TabsTrigger>
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
            <TabsContent value="writes" className="min-h-0 flex-1">
              <WriteLogPanel />
            </TabsContent>
            <TabsContent value="cache" className="min-h-0 flex-1">
              <ReactQueryDevtoolsPanel
                style={{ height: "100%", position: "relative" }}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  );
}
