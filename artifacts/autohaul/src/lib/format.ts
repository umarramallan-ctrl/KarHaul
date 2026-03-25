import { format, formatDistanceToNow } from "date-fns";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  return format(new Date(dateStr), "MMM d, yyyy");
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  return format(new Date(dateStr), "MMM d, yyyy h:mm a");
}

export function formatRelative(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'open':
    case 'pending':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'assigned':
    case 'accepted':
    case 'confirmed':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case 'picked_up':
    case 'in_transit':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'delivered':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'cancelled':
    case 'rejected':
    case 'withdrawn':
    case 'disputed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}

export function formatVehicleName(year: number, make: string, model: string): string {
  return `${year} ${make} ${model}`;
}
