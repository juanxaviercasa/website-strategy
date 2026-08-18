import { describe, expect, it } from "vitest";
import { filterAndSortBusinesses } from "./queueFilters";

const records = [
  { name: "Ritmo Studio", category: "Estudio de bienestar", location: "San Isidro, Lima, Perú", opportunityScore: 71, syncStatus: "synced" },
  { name: "Clínica Dental Luma", category: "Clínica dental", location: "Miraflores, Lima, Perú", opportunityScore: 86, syncStatus: "synced" },
  { name: "Norte Arquitectura", category: "Estudio de arquitectura", location: "Barranco, Lima, Perú", opportunityScore: 78, syncStatus: "pending" },
];

describe("filterAndSortBusinesses", () => {
  it("combines category and location filters before sorting by opportunity", () => {
    const result = filterAndSortBusinesses(records, { searchTerm: "", opportunityFilter: "all", categoryFilter: "Clínica dental", locationFilter: "Miraflores, Lima, Perú", sortBy: "opportunity_desc" });
    expect(result.map(item => item.name)).toEqual(["Clínica Dental Luma"]);
  });

  it("returns the watch cohort ordered from lowest to highest opportunity", () => {
    const result = filterAndSortBusinesses(records, { searchTerm: "lima", opportunityFilter: "watch", categoryFilter: "all", locationFilter: "all", sortBy: "opportunity_asc" });
    expect(result.map(item => item.opportunityScore)).toEqual([71, 78]);
  });
});
