import { describe, expect, it } from "vitest";
import { createSavedQueueView, removeSavedQueueView } from "./savedQueueViews";

const filters = { searchTerm: "lima", opportunityFilter: "priority" as const, categoryFilter: "all", locationFilter: "all", sortBy: "opportunity_desc" as const };

describe("saved queue views", () => {
  it("creates a named view while retaining the selected filters", () => {
    expect(createSavedQueueView("one", "  Lima priority  ", filters)).toEqual({ id: "one", name: "Lima priority", filters });
  });

  it("removes only the selected saved view", () => {
    const views = [createSavedQueueView("one", "Priority", filters), createSavedQueueView("two", "Watch", { ...filters, opportunityFilter: "watch" })];
    expect(removeSavedQueueView(views, "one").map(view => view.id)).toEqual(["two"]);
  });
});
