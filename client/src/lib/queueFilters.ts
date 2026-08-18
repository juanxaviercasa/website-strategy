export type QueueBusiness = {
  name: string;
  category: string | null;
  location: string | null;
  opportunityScore: number;
  syncStatus: string;
};

export type QueueFilterState = {
  searchTerm: string;
  opportunityFilter: "all" | "priority" | "watch";
  categoryFilter: string;
  locationFilter: string;
  sortBy: "opportunity_desc" | "opportunity_asc" | "name" | "sync";
};

export function filterAndSortBusinesses<T extends QueueBusiness>(businesses: T[], filters: QueueFilterState) {
  return businesses.filter(item => {
    const matchesSearch = `${item.name} ${item.category ?? ""} ${item.location ?? ""}`.toLowerCase().includes(filters.searchTerm.trim().toLowerCase());
    const matchesOpportunity = filters.opportunityFilter === "all" || (filters.opportunityFilter === "priority" ? item.opportunityScore >= 80 : item.opportunityScore < 80);
    return matchesSearch && matchesOpportunity && (filters.categoryFilter === "all" || item.category === filters.categoryFilter) && (filters.locationFilter === "all" || item.location === filters.locationFilter);
  }).sort((left, right) => {
    if (filters.sortBy === "opportunity_asc") return left.opportunityScore - right.opportunityScore;
    if (filters.sortBy === "name") return left.name.localeCompare(right.name);
    if (filters.sortBy === "sync") return left.syncStatus.localeCompare(right.syncStatus) || right.opportunityScore - left.opportunityScore;
    return right.opportunityScore - left.opportunityScore;
  });
}
