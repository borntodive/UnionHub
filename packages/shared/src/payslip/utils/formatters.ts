// Formatters for Payslip Calculator

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

// Convert decimal hours to HH:MM format
export function formatSbh(decimalHours: number): string {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// Parse HH:MM to decimal hours
export function parseSbh(sbhString: string): number {
  const [hours, minutes] = sbhString.split(":").map(Number);
  return hours + minutes / 60;
}

// Parse HH:MM to hours and minutes
export function parseSbhToParts(sbhString: string): {
  hours: number;
  minutes: number;
} {
  const [hours, minutes] = sbhString.split(":").map(Number);
  return { hours, minutes };
}

// Format date to Italian locale
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("it-IT", {
    year: "numeric",
    month: "long",
  });
}

// Get month name
export function getMonthName(dateString: string): string {
  return new Date(dateString).toLocaleDateString("it-IT", { month: "long" });
}

// Get year
export function getYear(dateString: string): number {
  return new Date(dateString).getFullYear();
}

// Get days in month
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Check if December
export function isDecember(dateString: string): boolean {
  return new Date(dateString).getMonth() === 11;
}

// Format number with Italian locale
export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
