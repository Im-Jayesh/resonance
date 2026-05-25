import { render, screen } from "@testing-library/react";
import LandingPage from "@/app/page";
import { vi, describe, it, expect } from "vitest";

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("LandingPage", () => {
  it("renders the hero section", () => {
    render(<LandingPage />);
    expect(screen.getByText(/Your Soul's Soundtrack/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Journaling/i)).toBeInTheDocument();
  });

  it("renders feature cards", () => {
    render(<LandingPage />);
    expect(screen.getByText(/AI Meaning Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Personal Journaling/i)).toBeInTheDocument();
  });
});
