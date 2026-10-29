import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SnackbarProvider } from "@/components/ui/snackbar/snackbar-provider";
import { useSnackbar } from "@/lib/snackbar/context";

const DISMISS_LABEL = "Fechar notificação";

let reducedMotion = false;

function mockMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? reducedMotion : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function Harness() {
  const snackbar = useSnackbar();
  return (
    <div>
      <button type="button" onClick={() => snackbar.error("Erro de teste")}>
        erro
      </button>
      <button type="button" onClick={() => snackbar.warning("Aviso de teste")}>
        aviso
      </button>
      <button type="button" onClick={() => snackbar.success("Sucesso de teste")}>
        sucesso
      </button>
      <button type="button" onClick={() => snackbar.info("Informação de teste")}>
        info
      </button>
    </div>
  );
}

function renderSnackbar() {
  return render(
    <SnackbarProvider dismissLabel={DISMISS_LABEL}>
      <Harness />
    </SnackbarProvider>,
  );
}

beforeEach(() => {
  reducedMotion = false;
  mockMatchMedia();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("snackbar", () => {
  it("renders an error with the alert role and red accent", () => {
    renderSnackbar();
    fireEvent.click(screen.getByText("erro"));

    const item = screen.getByRole("alert");
    expect(item).toHaveTextContent("Erro de teste");
    expect(item.className).toContain("bg-red-50");
  });

  it("renders a success with the status role and emerald accent", () => {
    renderSnackbar();
    fireEvent.click(screen.getByText("sucesso"));

    const item = screen.getByRole("status");
    expect(item).toHaveTextContent("Sucesso de teste");
    expect(item.className).toContain("bg-emerald-50");
  });

  it("maps warning to alert and info to status", () => {
    renderSnackbar();

    fireEvent.click(screen.getByText("aviso"));
    expect(screen.getByRole("alert")).toHaveTextContent("Aviso de teste");
    expect(screen.getByRole("alert").className).toContain("bg-amber-50");

    fireEvent.click(screen.getByText("info"));
    const statuses = screen.getAllByRole("status");
    expect(statuses.some((el) => el.textContent?.includes("Informação de teste"))).toBe(true);
  });

  it("auto-dismisses an error after its duration plus the exit animation", () => {
    vi.useFakeTimers();
    renderSnackbar();
    fireEvent.click(screen.getByText("erro"));

    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("pauses the dismiss timer while hovered and resumes on leave", () => {
    vi.useFakeTimers();
    renderSnackbar();
    fireEvent.click(screen.getByText("erro"));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    fireEvent.mouseEnter(screen.getByRole("alert"));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByRole("alert"));
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("dismisses immediately when the dismiss control is activated", () => {
    vi.useFakeTimers();
    renderSnackbar();
    fireEvent.click(screen.getByText("erro"));

    fireEvent.click(screen.getByRole("button", { name: DISMISS_LABEL }));
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps notifications longer and dismisses without animation under reduced motion", () => {
    reducedMotion = true;
    vi.useFakeTimers();
    renderSnackbar();
    fireEvent.click(screen.getByText("erro"));

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("caps the visible stack at three notifications", () => {
    renderSnackbar();
    fireEvent.click(screen.getByText("erro"));
    fireEvent.click(screen.getByText("erro"));
    fireEvent.click(screen.getByText("erro"));
    fireEvent.click(screen.getByText("erro"));

    expect(screen.getAllByRole("alert")).toHaveLength(3);
  });
});
