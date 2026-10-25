import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderModal } from "../portfolio/components/order-modal/OrderModal";

function renderOffer(offerId: "paid-audit" | "flow-fix" | "activation-rewrite") {
  return render(<OrderModal offerId={offerId} onClose={vi.fn()} triggerRef={{ current: null }} />);
}

describe("service order forms", () => {
  it("renders the paid audit questions and makes the product URL conditional", () => {
    renderOffer("paid-audit");

    expect(screen.getByLabelText(/Full name/)).toBeRequired();
    expect(screen.getByLabelText(/Email address/)).toBeRequired();
    expect(screen.getByLabelText(/Company or product name/)).toBeRequired();
    expect(screen.getByLabelText(/Briefly describe your product/)).toBeRequired();
    expect(screen.getByLabelText(/Who is your target audience/)).toBeRequired();
    expect(screen.getByLabelText(/What would you like me to audit/)).toBeRequired();
    expect(screen.getByRole("option", { name: "Cancellation flow" })).toBeInTheDocument();
    expect(screen.getByLabelText(/What problem are you noticing/)).toBeRequired();
    expect(screen.getByLabelText(/What would you like to improve/)).toBeRequired();
    expect(screen.getByLabelText(/What outcome would make this audit valuable/)).toBeRequired();
    expect(screen.getByLabelText(/Additional context or reference links/)).not.toBeRequired();

    const websiteChoice = screen.getByLabelText(/Is a public product website available/);
    const productUrl = screen.getByLabelText(/Product website or relevant URL/);
    expect(productUrl).not.toBeRequired();
    fireEvent.change(websiteChoice, { target: { value: "public" } });
    expect(productUrl).toBeRequired();
  });

  it("renders the focused flow-fix questions and leaves existing copy optional", () => {
    renderOffer("flow-fix");

    expect(screen.getByLabelText(/Which flow needs fixing/)).toBeRequired();
    expect(screen.getByRole("option", { name: "Empty state" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Where does this experience appear/)).toBeRequired();
    expect(screen.getByLabelText(/What does the current copy say/)).not.toBeRequired();
    expect(screen.getByLabelText(/What should users understand or do/)).toBeRequired();
    expect(screen.getByLabelText(/What isn't working with the current experience/)).toBeRequired();
    expect(screen.getByLabelText(/Preferred brand voice or tone/)).not.toBeRequired();
    expect(screen.getByLabelText(/Reference links or additional context/)).not.toBeRequired();
  });

  it("renders activation questions and leaves all existing copy optional", () => {
    renderOffer("activation-rewrite");

    expect(screen.getByLabelText(/What primary problem does your product solve/)).toBeRequired();
    expect(screen.getByLabelText(/first meaningful action/)).toBeRequired();
    expect(screen.getByLabelText(/What should users understand before/)).toBeRequired();
    expect(
      screen.getByLabelText(/What difficulties do users currently encounter/),
    ).not.toBeRequired();
    expect(screen.getByLabelText(/What outcome would make this project successful/)).toBeRequired();
    expect(screen.getByLabelText(/Current hero headline and supporting copy/)).not.toBeRequired();
    expect(screen.getByLabelText(/Current empty-state copy/)).not.toBeRequired();
    expect(screen.getByLabelText(/Current welcome email/)).not.toBeRequired();
    expect(screen.getByLabelText(/Words, claims, or messaging to avoid/)).not.toBeRequired();
    expect(screen.getByLabelText(/Reference links or additional context/)).not.toBeRequired();
  });
});
