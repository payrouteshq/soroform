import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryCachePanel } from "./query-cache-panel.js";

function renderWithQueryClient(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <QueryCachePanel />
    </QueryClientProvider>,
  );
}

describe("QueryCachePanel", () => {
  it("shows an empty-state message with no cached queries", () => {
    renderWithQueryClient(new QueryClient());
    expect(screen.getByText(/No queries cached yet/)).toBeInTheDocument();
  });

  it("lists a cached query's key and status", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["sorokit", "networkStatus"], { health: { status: "healthy" } });
    renderWithQueryClient(queryClient);

    expect(screen.getByText('["sorokit","networkStatus"]')).toBeInTheDocument();
    expect(screen.getByText("inactive")).toBeInTheDocument();
  });

  it("counts queries by status", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["a"], 1);
    queryClient.setQueryData(["b"], 2);
    renderWithQueryClient(queryClient);

    expect(screen.getByText("inactive 2")).toBeInTheDocument();
    expect(screen.getByText("fresh 0")).toBeInTheDocument();
  });

  it("updates live when a query is added to the cache", async () => {
    const queryClient = new QueryClient();
    renderWithQueryClient(queryClient);
    expect(screen.getByText(/No queries cached yet/)).toBeInTheDocument();

    queryClient.setQueryData(["sorokit", "balance"], { raw: 100n });

    expect(await screen.findByText('["sorokit","balance"]')).toBeInTheDocument();
  });
});
