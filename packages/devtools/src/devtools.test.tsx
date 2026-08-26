import { describe, expect, it, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { SoroformDevtools } from "./devtools.js";

function renderWithQueryClient(children: React.ReactNode) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

describe("SoroformDevtools", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("renders nothing outside development", () => {
    process.env.NODE_ENV = "production";
    const { container } = renderWithQueryClient(<SoroformDevtools />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a collapsed toggle in development", () => {
    process.env.NODE_ENV = "development";
    renderWithQueryClient(<SoroformDevtools />);
    expect(screen.getByRole("button", { name: "Soroform" })).toBeInTheDocument();
  });

  it("opens the panel on toggle click, defaulting to the Sends tab", () => {
    process.env.NODE_ENV = "development";
    renderWithQueryClient(<SoroformDevtools />);
    fireEvent.click(screen.getByRole("button", { name: "Soroform" }));
    expect(screen.getByText(/No contract sends logged yet/)).toBeInTheDocument();
  });

  it("can be opened by default via initialOpen", () => {
    process.env.NODE_ENV = "development";
    renderWithQueryClient(<SoroformDevtools initialOpen />);
    expect(screen.getByRole("tab", { name: "Sends" })).toBeInTheDocument();
  });

  it("switches to the Query cache tab", async () => {
    process.env.NODE_ENV = "development";
    const user = userEvent.setup();
    renderWithQueryClient(<SoroformDevtools initialOpen />);
    await user.click(screen.getByRole("tab", { name: "Query cache" }));
    expect(screen.getByRole("tab", { name: "Query cache" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Sends" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });
});
